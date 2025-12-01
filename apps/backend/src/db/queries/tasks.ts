import type { D1 } from "@chronos/types/database";
import type { Task, TaskList } from "@chronos/types";

// Database row types (snake_case from DB)
interface TaskListRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  list_id: string;
  title: string;
  completed: number;
  created_at: string;
  updated_at: string;
}

// Task List queries
export async function getAllTaskLists(db: D1, userId: string): Promise<TaskList[]> {
  const stmt = db.prepare("SELECT * FROM task_lists WHERE user_id = ? ORDER BY created_at DESC");
  const result = await stmt.bind(userId).all<TaskListRow>();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch task lists");
  }

  return result.results.map(row => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getTaskListById(db: D1, listId: string, userId: string): Promise<TaskList | null> {
  const stmt = db.prepare("SELECT * FROM task_lists WHERE id = ? AND user_id = ?");
  const row = await stmt.bind(listId, userId).first<TaskListRow>();

  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createTaskList(db: D1, listId: string, userId: string, name: string): Promise<TaskList> {
  const now = new Date().toISOString();
  
  const stmt = db.prepare("INSERT INTO task_lists (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)");
  const result = await stmt.bind(listId, userId, name, now, now).run();

  if (!result.success) {
    throw new Error(result.error || "Failed to create task list");
  }

  return {
    id: listId,
    user_id: userId,
    name,
    created_at: now,
    updated_at: now,
  };
}

export async function updateTaskList(db: D1, listId: string, userId: string, name: string): Promise<TaskList | null> {
  const now = new Date().toISOString();
  
  const stmt = db.prepare("UPDATE task_lists SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?");
  const result = await stmt.bind(name, now, listId, userId).run();

  if (!result.success) {
    throw new Error(result.error || "Failed to update task list");
  }

  if (result.meta.rows_written === 0) return null;

  return getTaskListById(db, listId, userId);
}

export async function deleteTaskList(db: D1, listId: string, userId: string): Promise<boolean> {
  const stmt = db.prepare("DELETE FROM task_lists WHERE id = ? AND user_id = ?");
  const result = await stmt.bind(listId, userId).run();

  if (!result.success) {
    throw new Error(result.error || "Failed to delete task list");
  }

  return result.meta.rows_written > 0;
}

// Task queries
export async function getTasksByListId(db: D1, listId: string): Promise<Task[]> {
  const stmt = db.prepare("SELECT * FROM tasks WHERE list_id = ? ORDER BY created_at ASC");
  const result = await stmt.bind(listId).all<TaskRow>();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch tasks");
  }

  return result.results.map(row => ({
    id: row.id,
    list_id: row.list_id,
    title: row.title,
    completed: row.completed === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getTaskById(db: D1, taskId: string): Promise<Task | null> {
  const stmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
  const row = await stmt.bind(taskId).first<TaskRow>();

  if (!row) return null;

  return {
    id: row.id,
    list_id: row.list_id,
    title: row.title,
    completed: row.completed === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createTask(db: D1, taskId: string, listId: string, title: string): Promise<Task> {
  const now = new Date().toISOString();
  
  const stmt = db.prepare("INSERT INTO tasks (id, list_id, title, completed, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)");
  const result = await stmt.bind(taskId, listId, title, now, now).run();

  if (!result.success) {
    throw new Error(result.error || "Failed to create task");
  }

  return {
    id: taskId,
    list_id: listId,
    title,
    completed: false,
    created_at: now,
    updated_at: now,
  };
}

export async function updateTask(db: D1, taskId: string, updates: { title?: string; completed?: boolean }): Promise<Task | null> {
  const now = new Date().toISOString();
  const setParts: string[] = ["updated_at = ?"];
  const values: any[] = [now];

  if (updates.title !== undefined) {
    setParts.push("title = ?");
    values.push(updates.title);
  }

  if (updates.completed !== undefined) {
    setParts.push("completed = ?");
    values.push(updates.completed ? 1 : 0);
  }

  values.push(taskId);

  const stmt = db.prepare(`UPDATE tasks SET ${setParts.join(", ")} WHERE id = ?`);
  const result = await stmt.bind(...values).run();

  if (!result.success) {
    throw new Error(result.error || "Failed to update task");
  }

  if (result.meta.rows_written === 0) return null;

  return getTaskById(db, taskId);
}

export async function deleteTask(db: D1, taskId: string): Promise<boolean> {
  const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
  const result = await stmt.bind(taskId).run();

  if (!result.success) {
    throw new Error(result.error || "Failed to delete task");
  }

  return result.meta.rows_written > 0;
}
