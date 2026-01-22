import { Hono } from "hono";
import type { Env } from "../types/env";
import { TaskService } from "../services/task.service";
import { createDrizzleClient } from "../db/client";
import type { CreateTaskListRequest, CreateTaskRequest, UpdateTaskRequest, UpdateTaskListRequest } from "@chronos/types";
import { authMiddleware, getAuthUserId, type ProtectedContext } from "../middleware/auth";
import {
  successResponse,
  validationError,
  notFoundError,
  handleError,
} from "../utils/responses";

const tasks = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// Apply auth middleware to all routes
tasks.use("/*", authMiddleware);

// Get all task lists with tasks
tasks.get("/lists", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const lists = await taskService.getAllTaskListsWithTasks(userId);

    return successResponse(c, lists);
  } catch (error) {
    return handleError(c, error, "fetch task lists");
  }
});

// Get tasks without a list (for calendar events)
tasks.get("/tasks/without-list", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const tasksWithoutList = await taskService.getTasksWithoutList(userId);

    return successResponse(c, tasksWithoutList);
  } catch (error) {
    return handleError(c, error, "fetch tasks");
  }
});

// Get a single task list with tasks
tasks.get("/lists/:listId", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const listId = c.req.param("listId");
    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const list = await taskService.getTaskList(listId, userId);

    if (!list) {
      return notFoundError(c, "Task list");
    }

    return successResponse(c, list);
  } catch (error) {
    return handleError(c, error, "fetch task list");
  }
});

// Create a new task list
tasks.post("/lists", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const body = await c.req.json<CreateTaskListRequest>();

    if (!body.name || body.name.trim() === "") {
      return validationError(c, "List name is required");
    }

    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const list = await taskService.createTaskList(userId, body.name);

    return successResponse(c, list, undefined, 201);
  } catch (error) {
    return handleError(c, error, "create task list");
  }
});

// Update a task list
tasks.put("/lists/:listId", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const listId = c.req.param("listId");
    const body = await c.req.json<UpdateTaskListRequest>();

    if (!body.name || body.name.trim() === "") {
      return validationError(c, "List name is required");
    }

    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const list = await taskService.updateTaskList(listId, userId, body.name);

    if (!list) {
      return notFoundError(c, "Task list");
    }

    return successResponse(c, list);
  } catch (error) {
    return handleError(c, error, "update task list");
  }
});

// Delete a task list
tasks.delete("/lists/:listId", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const listId = c.req.param("listId");
    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const deleted = await taskService.deleteTaskList(listId, userId);

    if (!deleted) {
      return notFoundError(c, "Task list");
    }

    return successResponse(c, { deleted: true });
  } catch (error) {
    return handleError(c, error, "delete task list");
  }
});

// Create a new task in a list
tasks.post("/lists/:listId/tasks", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const listId = c.req.param("listId");
    const body = await c.req.json<CreateTaskRequest>();

    if (!body.title || body.title.trim() === "") {
      return validationError(c, "Task title is required");
    }

    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const task = await taskService.createTask(listId, userId, body.title);

    return successResponse(c, task, undefined, 201);
  } catch (error) {
    return handleError(c, error, "create task");
  }
});

// Create a new task without a list (list_id will be null)
tasks.post("/tasks", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const body = await c.req.json<CreateTaskRequest>();

    if (!body.title || body.title.trim() === "") {
      return validationError(c, "Task title is required");
    }

    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const task = await taskService.createTaskWithoutList(userId, body.title);

    return successResponse(c, task, undefined, 201);
  } catch (error) {
    return handleError(c, error, "create task");
  }
});

// Update a task
tasks.put("/tasks/:taskId", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const taskId = c.req.param("taskId");
    const body = await c.req.json<UpdateTaskRequest>();

    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const task = await taskService.updateTask(taskId, userId, body);

    if (!task) {
      return notFoundError(c, "Task");
    }

    return successResponse(c, task);
  } catch (error) {
    return handleError(c, error, "update task");
  }
});

// Delete a task
tasks.delete("/tasks/:taskId", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const taskId = c.req.param("taskId");
    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);
    const deleted = await taskService.deleteTask(taskId, userId);

    if (!deleted) {
      return notFoundError(c, "Task");
    }

    return successResponse(c, { deleted: true });
  } catch (error) {
    return handleError(c, error, "delete task");
  }
});

export default tasks;
