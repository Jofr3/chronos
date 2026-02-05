import type { DrizzleClient } from "../db/client";
import type { Task, TaskList, TaskListWithTasks, DayOfWeek } from "@chronos/types";
import * as taskQueries from "../db/queries/tasks";
import * as eventQueries from "../db/queries/events";
import type { SchedulableTask } from "../db/queries/tasks";

export type { SchedulableTask };

export class TaskService {
  constructor(private db: DrizzleClient) {}

  // Task List methods
  async getAllTaskListsWithTasks(userId: string): Promise<TaskListWithTasks[]> {
    // Use optimized query that fetches lists and tasks in parallel (2 queries instead of N+1)
    return taskQueries.getAllTaskListsWithTasks(this.db, userId);
  }

  async getTasksWithoutList(userId: string): Promise<Task[]> {
    return taskQueries.getTasksWithoutList(this.db, userId);
  }

  async getTaskList(listId: string, userId: string): Promise<TaskListWithTasks | null> {
    const list = await taskQueries.getTaskListById(this.db, listId, userId);
    if (!list) return null;

    const tasks = await taskQueries.getTasksByListId(this.db, listId);

    return {
      ...list,
      tasks,
    };
  }

  async createTaskList(userId: string, name: string): Promise<TaskList> {
    const listId = crypto.randomUUID();
    return taskQueries.createTaskList(this.db, listId, userId, name);
  }

  async updateTaskList(listId: string, userId: string, name: string): Promise<TaskList | null> {
    return taskQueries.updateTaskList(this.db, listId, userId, name);
  }

  async deleteTaskList(listId: string, userId: string): Promise<boolean> {
    return taskQueries.deleteTaskList(this.db, listId, userId);
  }

  // Task methods
  async createTask(listId: string, userId: string, title: string): Promise<Task> {
    // Verify the list belongs to the user
    const list = await taskQueries.getTaskListById(this.db, listId, userId);
    if (!list) {
      throw new Error("Task list not found or access denied");
    }

    const taskId = crypto.randomUUID();
    return taskQueries.createTask(this.db, taskId, userId, listId, title);
  }

  async createTaskWithoutList(userId: string, title: string): Promise<Task> {
    const taskId = crypto.randomUUID();
    return taskQueries.createTaskWithoutList(this.db, taskId, userId, title);
  }

  async updateTask(
    taskId: string,
    userId: string,
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
    // Get the task to verify ownership
    const task = await taskQueries.getTaskById(this.db, taskId);
    if (!task) return null;

    // Verify the task belongs to the user
    if (task.user_id !== userId) {
      throw new Error("Access denied");
    }

    // Verify target list belongs to user if list_id is being changed
    if (updates.list_id !== undefined && updates.list_id !== null) {
      const targetList = await taskQueries.getTaskListById(this.db, updates.list_id, userId);
      if (!targetList) {
        throw new Error("Target list not found or access denied");
      }
    }

    return taskQueries.updateTask(this.db, taskId, updates);
  }

  async deleteTask(taskId: string, userId: string): Promise<boolean> {
    // Get the task to verify ownership
    const task = await taskQueries.getTaskById(this.db, taskId);
    if (!task) return false;

    // Verify the task belongs to the user
    if (task.user_id !== userId) {
      throw new Error("Access denied");
    }

    // Delete only future events (today and onwards), preserving old events
    const today = new Date().toISOString().split("T")[0];
    await eventQueries.deleteEventsByTaskIds(this.db, [taskId], userId, today);

    // Soft delete the task (sets deleted_at)
    return taskQueries.deleteTask(this.db, taskId);
  }

  /**
   * Get tasks eligible for AI scheduling
   */
  async getSchedulableTasks(userId: string): Promise<SchedulableTask[]> {
    return taskQueries.getSchedulableTasks(this.db, userId);
  }
}
