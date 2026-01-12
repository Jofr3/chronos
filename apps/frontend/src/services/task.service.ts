import type { ApiResponse, ApiError } from "@chronos/types/api";

interface ApiErrorResponse {
  success: false;
  error: ApiError;
}
import type {
  Task,
  TaskList,
  TaskListWithTasks,
  CreateTaskListRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateTaskListRequest,
} from "@chronos/types";
import { getApiBaseUrl } from "~/config/env";

class TaskServiceClass {
  private getAuthToken(): string | null {
    // In browser environment, get from cookie
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/chronos_auth_token=([^;]+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    const apiUrl = getApiBaseUrl();

    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    return response.json();
  }

  async getAllTaskLists(): Promise<TaskListWithTasks[]> {
    const result = await this.request<TaskListWithTasks[]>("/api/tasks/lists");

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(
        errorResult.error?.message || "Failed to fetch task lists",
      );
    }

    return result.data!;
  }

  async getTasksWithoutList(): Promise<Task[]> {
    const result = await this.request<Task[]>("/api/tasks/tasks/without-list");

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(
        errorResult.error?.message || "Failed to fetch tasks without list",
      );
    }

    return result.data!;
  }

  async getTaskList(listId: string): Promise<TaskListWithTasks> {
    const result = await this.request<TaskListWithTasks>(
      `/api/tasks/lists/${listId}`,
    );

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(
        errorResult.error?.message || "Failed to fetch task list",
      );
    }

    return result.data!;
  }

  async createTaskList(name: string): Promise<TaskList> {
    const body: CreateTaskListRequest = { name };
    const result = await this.request<TaskList>("/api/tasks/lists", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(
        errorResult.error?.message || "Failed to create task list",
      );
    }

    return result.data!;
  }

  async updateTaskList(listId: string, name: string): Promise<TaskList> {
    const body: UpdateTaskListRequest = { name };
    const result = await this.request<TaskList>(`/api/tasks/lists/${listId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(
        errorResult.error?.message || "Failed to update task list",
      );
    }

    return result.data!;
  }

  async deleteTaskList(listId: string): Promise<void> {
    const result = await this.request<{ deleted: boolean }>(
      `/api/tasks/lists/${listId}`,
      {
        method: "DELETE",
      },
    );

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(
        errorResult.error?.message || "Failed to delete task list",
      );
    }
  }

  async createTask(listId: string, title: string): Promise<Task> {
    const body: CreateTaskRequest = { title };
    const result = await this.request<Task>(
      `/api/tasks/lists/${listId}/tasks`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(errorResult.error?.message || "Failed to create task");
    }

    return result.data!;
  }

  async createTaskWithoutList(title: string): Promise<Task> {
    const body: CreateTaskRequest = { title };
    const result = await this.request<Task>(
      `/api/tasks/tasks`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(errorResult.error?.message || "Failed to create task");
    }

    return result.data!;
  }

  async updateTask(taskId: string, updates: UpdateTaskRequest): Promise<Task> {
    const result = await this.request<Task>(`/api/tasks/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(errorResult.error?.message || "Failed to update task");
    }

    return result.data!;
  }

  async deleteTask(taskId: string): Promise<void> {
    const result = await this.request<{ deleted: boolean }>(
      `/api/tasks/tasks/${taskId}`,
      {
        method: "DELETE",
      },
    );

    if (!result.success) {
      const errorResult = result as any as ApiErrorResponse;
      throw new Error(errorResult.error?.message || "Failed to delete task");
    }
  }
}

export const taskService = new TaskServiceClass();
