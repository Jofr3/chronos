import { eq, desc, asc, and } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { tasks, taskLists } from "../schema";
import type { Task, TaskList, DayOfWeek } from "@chronos/types";

// Helper to parse recurring_days JSON string to DayOfWeek array
function parseRecurringDays(jsonString: string | null): DayOfWeek[] | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as DayOfWeek[];
  } catch {
    return null;
  }
}

// Helper to convert Task row to Task object
function rowToTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    list_id: row.list_id,
    title: row.title,
    completed: row.completed,
    due_date: row.due_date,
    is_recurring: row.is_recurring,
    recurring_days: parseRecurringDays(row.recurring_days),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Helper to convert TaskList row to TaskList object
function rowToTaskList(row: typeof taskLists.$inferSelect): TaskList {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Task List queries
export async function getAllTaskLists(db: DrizzleClient, userId: string): Promise<TaskList[]> {
  const result = await db
    .select()
    .from(taskLists)
    .where(eq(taskLists.user_id, userId))
    .orderBy(desc(taskLists.created_at));

  return result.map(rowToTaskList);
}

export async function getTaskListById(
  db: DrizzleClient,
  listId: string,
  userId: string
): Promise<TaskList | null> {
  const result = await db
    .select()
    .from(taskLists)
    .where(and(eq(taskLists.id, listId), eq(taskLists.user_id, userId)))
    .limit(1);

  if (result.length === 0) return null;

  return rowToTaskList(result[0]);
}

export async function createTaskList(
  db: DrizzleClient,
  listId: string,
  userId: string,
  name: string
): Promise<TaskList> {
  const now = new Date().toISOString();

  const result = await db
    .insert(taskLists)
    .values({
      id: listId,
      user_id: userId,
      name,
      created_at: now,
      updated_at: now,
    })
    .returning();

  if (!result || result.length === 0) {
    throw new Error("Failed to create task list");
  }

  return rowToTaskList(result[0]);
}

export async function updateTaskList(
  db: DrizzleClient,
  listId: string,
  userId: string,
  name: string
): Promise<TaskList | null> {
  const now = new Date().toISOString();

  const result = await db
    .update(taskLists)
    .set({
      name,
      updated_at: now,
    })
    .where(and(eq(taskLists.id, listId), eq(taskLists.user_id, userId)))
    .returning();

  if (!result || result.length === 0) return null;

  return rowToTaskList(result[0]);
}

export async function deleteTaskList(db: DrizzleClient, listId: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(taskLists)
    .where(and(eq(taskLists.id, listId), eq(taskLists.user_id, userId)))
    .returning();

  return result.length > 0;
}

// Task queries
export async function getTasksByListId(db: DrizzleClient, listId: string): Promise<Task[]> {
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.list_id, listId))
    .orderBy(asc(tasks.created_at));

  return result.map(rowToTask);
}

export async function getAllTasksByUserId(db: DrizzleClient, userId: string): Promise<Task[]> {
  const result = await db
    .select({
      id: tasks.id,
      list_id: tasks.list_id,
      title: tasks.title,
      completed: tasks.completed,
      due_date: tasks.due_date,
      is_recurring: tasks.is_recurring,
      recurring_days: tasks.recurring_days,
      created_at: tasks.created_at,
      updated_at: tasks.updated_at,
    })
    .from(tasks)
    .innerJoin(taskLists, eq(tasks.list_id, taskLists.id))
    .where(eq(taskLists.user_id, userId))
    .orderBy(asc(tasks.created_at));

  return result.map(rowToTask);
}

export async function getTaskById(db: DrizzleClient, taskId: string): Promise<Task | null> {
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (result.length === 0) return null;

  return rowToTask(result[0]);
}

export async function createTask(
  db: DrizzleClient,
  taskId: string,
  listId: string,
  title: string
): Promise<Task> {
  const now = new Date().toISOString();

  const result = await db
    .insert(tasks)
    .values({
      id: taskId,
      list_id: listId,
      title,
      completed: false,
      is_recurring: false,
      created_at: now,
      updated_at: now,
    })
    .returning();

  if (!result || result.length === 0) {
    throw new Error("Failed to create task");
  }

  return rowToTask(result[0]);
}

export async function updateTask(
  db: DrizzleClient,
  taskId: string,
  updates: {
    title?: string;
    completed?: boolean;
    due_date?: string | null;
    is_recurring?: boolean;
    recurring_days?: DayOfWeek[] | null;
  }
): Promise<Task | null> {
  const now = new Date().toISOString();
  const updateData: Partial<typeof tasks.$inferInsert> = {
    updated_at: now,
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.completed !== undefined) updateData.completed = updates.completed;
  if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
  if (updates.is_recurring !== undefined) updateData.is_recurring = updates.is_recurring;
  if (updates.recurring_days !== undefined) {
    updateData.recurring_days = updates.recurring_days ? JSON.stringify(updates.recurring_days) : null;
  }

  const result = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId))
    .returning();

  if (!result || result.length === 0) return null;

  return rowToTask(result[0]);
}

export async function deleteTask(db: DrizzleClient, taskId: string): Promise<boolean> {
  const result = await db
    .delete(tasks)
    .where(eq(tasks.id, taskId))
    .returning();

  return result.length > 0;
}
