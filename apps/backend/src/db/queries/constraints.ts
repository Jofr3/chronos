import { eq, and, isNull } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { timeConstraints } from "../schema";
import type { TimeConstraint, DayOfWeek, ActiveConstraint } from "@chronos/types";

// Helper to parse recurring_days JSON string to DayOfWeek array
function parseRecurringDays(jsonString: string | null): DayOfWeek[] | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as DayOfWeek[];
  } catch {
    return null;
  }
}

// Helper to convert database row to TimeConstraint object
function rowToConstraint(
  row: typeof timeConstraints.$inferSelect
): TimeConstraint {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    start_time: row.start_time,
    end_time: row.end_time,
    date: row.date,
    is_recurring: row.is_recurring,
    recurring_days: parseRecurringDays(row.recurring_days),
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

// Get all constraints for a user (excluding soft-deleted)
export async function getUserConstraints(
  db: DrizzleClient,
  userId: string
): Promise<TimeConstraint[]> {
  const result = await db
    .select()
    .from(timeConstraints)
    .where(
      and(eq(timeConstraints.user_id, userId), isNull(timeConstraints.deleted_at))
    );

  return result.map(rowToConstraint);
}

// Get a single constraint by ID
export async function getConstraintById(
  db: DrizzleClient,
  constraintId: string,
  userId: string
): Promise<TimeConstraint | null> {
  const result = await db
    .select()
    .from(timeConstraints)
    .where(
      and(
        eq(timeConstraints.id, constraintId),
        eq(timeConstraints.user_id, userId),
        isNull(timeConstraints.deleted_at)
      )
    )
    .limit(1);

  if (result.length === 0) return null;
  return rowToConstraint(result[0]);
}

// Create a new constraint
export async function createConstraint(
  db: DrizzleClient,
  constraintId: string,
  userId: string,
  data: {
    name: string;
    start_time: string;
    end_time: string;
    date?: string | null;
    is_recurring?: boolean;
    recurring_days?: DayOfWeek[] | null;
  }
): Promise<TimeConstraint> {
  const now = new Date().toISOString();

  const result = await db
    .insert(timeConstraints)
    .values({
      id: constraintId,
      user_id: userId,
      name: data.name,
      start_time: data.start_time,
      end_time: data.end_time,
      date: data.date ?? null,
      is_recurring: data.is_recurring ?? false,
      recurring_days: data.recurring_days ? JSON.stringify(data.recurring_days) : null,
      created_at: now,
      updated_at: now,
    })
    .returning();

  if (!result || result.length === 0) {
    throw new Error("Failed to create constraint");
  }

  return rowToConstraint(result[0]);
}

// Update a constraint
export async function updateConstraint(
  db: DrizzleClient,
  constraintId: string,
  userId: string,
  updates: {
    name?: string;
    start_time?: string;
    end_time?: string;
    date?: string | null;
    is_recurring?: boolean;
    recurring_days?: DayOfWeek[] | null;
  }
): Promise<TimeConstraint | null> {
  const now = new Date().toISOString();
  const updateData: Partial<typeof timeConstraints.$inferInsert> = {
    updated_at: now,
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.start_time !== undefined) updateData.start_time = updates.start_time;
  if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.is_recurring !== undefined)
    updateData.is_recurring = updates.is_recurring;
  if (updates.recurring_days !== undefined) {
    updateData.recurring_days = updates.recurring_days
      ? JSON.stringify(updates.recurring_days)
      : null;
  }

  const result = await db
    .update(timeConstraints)
    .set(updateData)
    .where(
      and(
        eq(timeConstraints.id, constraintId),
        eq(timeConstraints.user_id, userId),
        isNull(timeConstraints.deleted_at)
      )
    )
    .returning();

  if (!result || result.length === 0) return null;
  return rowToConstraint(result[0]);
}

// Soft delete a constraint
export async function deleteConstraint(
  db: DrizzleClient,
  constraintId: string,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString();

  const result = await db
    .update(timeConstraints)
    .set({ deleted_at: now, updated_at: now })
    .where(
      and(
        eq(timeConstraints.id, constraintId),
        eq(timeConstraints.user_id, userId),
        isNull(timeConstraints.deleted_at)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Get active constraints for specific dates
 * Used by AI scheduler to determine blocked time slots
 * Returns constraints that apply to any of the given dates
 */
export async function getActiveConstraintsForDates(
  db: DrizzleClient,
  userId: string,
  dates: string[]
): Promise<ActiveConstraint[]> {
  // Fetch all non-deleted constraints for the user
  const allConstraints = await db
    .select()
    .from(timeConstraints)
    .where(
      and(eq(timeConstraints.user_id, userId), isNull(timeConstraints.deleted_at))
    );

  const activeConstraints: ActiveConstraint[] = [];

  for (const constraint of allConstraints) {
    if (constraint.is_recurring && constraint.recurring_days) {
      // Recurring constraint: check which dates match the recurring days
      const recurringDays = parseRecurringDays(constraint.recurring_days);
      if (!recurringDays) continue;

      for (const dateStr of dates) {
        const date = new Date(dateStr + "T00:00:00");
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        if (recurringDays.includes(dayOfWeek as DayOfWeek)) {
          activeConstraints.push({
            id: constraint.id,
            name: constraint.name,
            start_time: constraint.start_time,
            end_time: constraint.end_time,
            date: dateStr,
          });
        }
      }
    } else if (constraint.date && dates.includes(constraint.date)) {
      // One-time constraint: check if the date matches
      activeConstraints.push({
        id: constraint.id,
        name: constraint.name,
        start_time: constraint.start_time,
        end_time: constraint.end_time,
        date: constraint.date,
      });
    }
  }

  return activeConstraints;
}
