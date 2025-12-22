import { eq, and } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { events } from "../schema";
import type { Event } from "@chronos/types";

// Helper to convert Event row to Event object
function rowToEvent(row: typeof events.$inferSelect): Event {
  return {
    id: row.id,
    user_id: row.user_id,
    task_id: row.task_id,
    title: row.title,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createEvent(
  db: DrizzleClient,
  eventId: string,
  userId: string,
  taskId: string | null,
  title: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<Event> {
  const now = new Date().toISOString();

  const result = await db
    .insert(events)
    .values({
      id: eventId,
      user_id: userId,
      task_id: taskId,
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      created_at: now,
      updated_at: now,
    })
    .returning();

  if (!result || result.length === 0) {
    throw new Error("Failed to create event");
  }

  return rowToEvent(result[0]);
}

export async function createManyEvents(
  db: DrizzleClient,
  eventsData: Array<{
    id: string;
    user_id: string;
    task_id: string | null;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
  }>
): Promise<Event[]> {
  const now = new Date().toISOString();

  const values = eventsData.map((event) => ({
    ...event,
    created_at: now,
    updated_at: now,
  }));

  // D1 has a limit of ~50 SQL variables per statement
  // Each event has 9 fields, so we can insert ~5 events per batch
  const BATCH_SIZE = 5;
  const results: Event[] = [];

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    const batchResult = await db.insert(events).values(batch).returning();
    results.push(...batchResult.map(rowToEvent));
  }

  return results;
}

export async function getUserEvents(
  db: DrizzleClient,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Event[]> {
  let query = db.select().from(events).where(eq(events.user_id, userId));

  // Note: For date range filtering, we'd need to add additional conditions
  // This is a basic implementation
  const result = await query;

  return result.map(rowToEvent);
}

export async function deleteEvent(
  db: DrizzleClient,
  eventId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.user_id, userId)))
    .returning();

  return result.length > 0;
}
