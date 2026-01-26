import { eq, and, gte, lte, inArray } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { events, tasks } from "../schema";
import type { Event } from "@chronos/types";

// Helper to convert Event row with task title to Event object
function rowToEvent(
  row: typeof events.$inferSelect,
  taskTitle: string
): Event {
  return {
    id: row.id,
    user_id: row.user_id,
    task_id: row.task_id!,
    title: taskTitle,
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
  taskId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<Event> {
  const now = new Date().toISOString();

  // First, get the task to retrieve its title
  const task = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task || task.length === 0) {
    throw new Error("Task not found");
  }

  const result = await db
    .insert(events)
    .values({
      id: eventId,
      user_id: userId,
      task_id: taskId,
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

  return rowToEvent(result[0], task[0].title);
}

export async function createManyEvents(
  db: DrizzleClient,
  eventsData: Array<{
    id: string;
    user_id: string;
    task_id: string;
    date: string;
    start_time: string;
    end_time: string;
  }>
): Promise<Event[]> {
  const now = new Date().toISOString();

  // Get all task titles for the events
  const taskIds = [...new Set(eventsData.map((e) => e.task_id))];
  const taskResults = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(inArray(tasks.id, taskIds));

  // Create a map of task_id to title
  const taskTitleMap = new Map<string, string>();
  for (const task of taskResults) {
    taskTitleMap.set(task.id, task.title);
  }

  const values = eventsData.map((event) => ({
    id: event.id,
    user_id: event.user_id,
    task_id: event.task_id,
    date: event.date,
    start_time: event.start_time,
    end_time: event.end_time,
    created_at: now,
    updated_at: now,
  }));

  // D1 has a limit of ~50 SQL variables per statement
  // Each event has 8 fields, so we can insert ~6 events per batch
  const BATCH_SIZE = 6;
  const results: Event[] = [];

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    const batchResult = await db.insert(events).values(batch).returning();
    results.push(
      ...batchResult.map((row) =>
        rowToEvent(row, taskTitleMap.get(row.task_id!) || "Untitled")
      )
    );
  }

  return results;
}

export async function getUserEvents(
  db: DrizzleClient,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Event[]> {
  const conditions = [eq(events.user_id, userId)];

  if (startDate) {
    conditions.push(gte(events.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(events.date, endDate));
  }

  const result = await db
    .select({
      event: events,
      taskTitle: tasks.title,
    })
    .from(events)
    .innerJoin(tasks, eq(events.task_id, tasks.id))
    .where(and(...conditions));

  return result.map((row) => rowToEvent(row.event, row.taskTitle));
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

export async function deleteManyEvents(
  db: DrizzleClient,
  eventIds: string[],
  userId: string
): Promise<number> {
  if (eventIds.length === 0) return 0;

  let deletedCount = 0;
  for (const eventId of eventIds) {
    const deleted = await deleteEvent(db, eventId, userId);
    if (deleted) deletedCount++;
  }

  return deletedCount;
}

export async function getEventsByTaskIds(
  db: DrizzleClient,
  taskIds: string[]
): Promise<Array<{ id: string; task_id: string }>> {
  if (taskIds.length === 0) return [];

  const result = await db
    .select({ id: events.id, task_id: events.task_id })
    .from(events)
    .where(inArray(events.task_id, taskIds));

  return result.map((row) => ({ id: row.id, task_id: row.task_id! }));
}

export async function updateEvent(
  db: DrizzleClient,
  eventId: string,
  userId: string,
  updates: {
    date?: string;
    start_time?: string;
    end_time?: string;
  }
): Promise<Event | null> {
  const now = new Date().toISOString();

  const result = await db
    .update(events)
    .set({ ...updates, updated_at: now })
    .where(and(eq(events.id, eventId), eq(events.user_id, userId)))
    .returning();

  if (!result || result.length === 0) {
    return null;
  }

  // Fetch the task title
  const task = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(eq(tasks.id, result[0].task_id!))
    .limit(1);

  return rowToEvent(result[0], task[0]?.title || "Untitled");
}
