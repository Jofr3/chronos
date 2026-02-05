import { eq, desc, asc, and, isNull, sql } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { tasks, taskLists, events } from "../schema";
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
    user_id: row.user_id,
    list_id: row.list_id,
    title: row.title,
    description: row.description,
    completed: row.completed,
    due_date: row.due_date,
    duration: row.duration,
    preferred_start_time: row.preferred_start_time,
    is_recurring: row.is_recurring,
    recurring_days: parseRecurringDays(row.recurring_days),
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
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

/**
 * Get all task lists with their tasks in a single optimized query
 * This avoids the N+1 query problem by using a LEFT JOIN
 */
export async function getAllTaskListsWithTasks(
  db: DrizzleClient,
  userId: string
): Promise<Array<TaskList & { tasks: Task[] }>> {
  // Fetch all lists and tasks in two queries (more efficient than N+1)
  const [lists, allTasks] = await Promise.all([
    db
      .select()
      .from(taskLists)
      .where(eq(taskLists.user_id, userId))
      .orderBy(desc(taskLists.created_at)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.user_id, userId), isNull(tasks.deleted_at)))
      .orderBy(asc(tasks.created_at)),
  ]);

  // Group tasks by list_id
  const tasksByListId = new Map<string, Task[]>();
  for (const task of allTasks) {
    if (task.list_id) {
      const listTasks = tasksByListId.get(task.list_id) || [];
      listTasks.push(rowToTask(task));
      tasksByListId.set(task.list_id, listTasks);
    }
  }

  // Combine lists with their tasks
  return lists.map((list) => ({
    ...rowToTaskList(list),
    tasks: tasksByListId.get(list.id) || [],
  }));
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
    .where(and(eq(tasks.list_id, listId), isNull(tasks.deleted_at)))
    .orderBy(asc(tasks.created_at));

  return result.map(rowToTask);
}

export async function getAllTasksByUserId(db: DrizzleClient, userId: string): Promise<Task[]> {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.user_id, userId), isNull(tasks.deleted_at)))
    .orderBy(asc(tasks.created_at));

  return result.map(rowToTask);
}

export interface SchedulableTask {
  id: string;
  title: string;
  due_date: string | null;
  duration: number | null;
  preferred_start_time: string | null;
  is_recurring: boolean;
  recurring_days: DayOfWeek[] | null;
}

/**
 * Get tasks eligible for AI scheduling:
 * - Not completed (completed = false)
 * - Not deleted (deleted_at is null)
 * - For non-recurring tasks: due date is within the last month or in the future (or no due date)
 * - Recurring tasks are always included (they use recurring_days for scheduling)
 */
export async function getSchedulableTasks(
  db: DrizzleClient,
  userId: string
): Promise<SchedulableTask[]> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = oneMonthAgo.toISOString().split("T")[0];

  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      due_date: tasks.due_date,
      duration: tasks.duration,
      preferred_start_time: tasks.preferred_start_time,
      is_recurring: tasks.is_recurring,
      recurring_days: tasks.recurring_days,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.user_id, userId),
        eq(tasks.completed, false),
        isNull(tasks.deleted_at),
        // For non-recurring tasks, filter by due_date; recurring tasks are always included
        sql`(${tasks.is_recurring} = 1 OR ${tasks.due_date} IS NULL OR ${tasks.due_date} >= ${oneMonthAgoStr})`
      )
    )
    .orderBy(asc(tasks.due_date));

  return result.map((row) => ({
    id: row.id,
    title: row.title,
    due_date: row.due_date,
    duration: row.duration,
    preferred_start_time: row.preferred_start_time,
    is_recurring: row.is_recurring,
    recurring_days: parseRecurringDays(row.recurring_days),
  }));
}

export async function getTasksWithoutList(db: DrizzleClient, userId: string): Promise<Task[]> {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.user_id, userId), isNull(tasks.list_id), isNull(tasks.deleted_at)))
    .orderBy(asc(tasks.created_at));

  return result.map(rowToTask);
}

export async function getTaskById(db: DrizzleClient, taskId: string): Promise<Task | null> {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deleted_at)))
    .limit(1);

  if (result.length === 0) return null;

  return rowToTask(result[0]);
}

export async function createTask(
  db: DrizzleClient,
  taskId: string,
  userId: string,
  listId: string,
  title: string
): Promise<Task> {
  const now = new Date().toISOString();

  const result = await db
    .insert(tasks)
    .values({
      id: taskId,
      user_id: userId,
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

export async function createTaskWithoutList(
  db: DrizzleClient,
  taskId: string,
  userId: string,
  title: string
): Promise<Task> {
  const now = new Date().toISOString();

  const result = await db
    .insert(tasks)
    .values({
      id: taskId,
      user_id: userId,
      list_id: null,
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
    description?: string | null;
    completed?: boolean;
    due_date?: string | null;
    duration?: number | null;
    preferred_start_time?: string | null;
    is_recurring?: boolean;
    recurring_days?: DayOfWeek[] | null;
    list_id?: string | null;
  }
): Promise<Task | null> {
  const now = new Date().toISOString();
  const updateData: Partial<typeof tasks.$inferInsert> = {
    updated_at: now,
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.completed !== undefined) updateData.completed = updates.completed;
  if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
  if (updates.duration !== undefined) updateData.duration = updates.duration;
  if (updates.preferred_start_time !== undefined) updateData.preferred_start_time = updates.preferred_start_time;
  if (updates.is_recurring !== undefined) updateData.is_recurring = updates.is_recurring;
  if (updates.recurring_days !== undefined) {
    updateData.recurring_days = updates.recurring_days ? JSON.stringify(updates.recurring_days) : null;
  }
  if (updates.list_id !== undefined) updateData.list_id = updates.list_id;

  const result = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId))
    .returning();

  if (!result || result.length === 0) return null;

  return rowToTask(result[0]);
}

export async function deleteTask(db: DrizzleClient, taskId: string): Promise<boolean> {
  const now = new Date().toISOString();

  // Soft delete the task by setting deleted_at
  const result = await db
    .update(tasks)
    .set({ deleted_at: now, updated_at: now })
    .where(eq(tasks.id, taskId))
    .returning();

  return result.length > 0;
}
