import { Hono } from "hono";
import type { Env } from "../types/env";
import type { User } from "@chronos/types/user";
import { UserService } from "../services/user.service";
import { createDrizzleClient } from "../db/client";
import * as authQueries from "../db/queries/auth";
import { hashPassword } from "../utils/password";
import {
  successResponse,
  validationError,
  notFoundError,
  handleError,
  errorResponse,
  ErrorCodes,
} from "../utils/responses";

const users = new Hono<{ Bindings: Env }>();

users.get("/", async (c) => {
  try {
    const db = createDrizzleClient(c.env.DB);
    const userService = new UserService(db);
    const allUsers = await userService.getAllUsers();

    return successResponse(c, allUsers, "Users retrieved successfully");
  } catch (error) {
    return handleError(c, error, "retrieve users");
  }
});

users.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = createDrizzleClient(c.env.DB);
    const userService = new UserService(db);
    const user = await userService.getUserById(id);

    if (!user) {
      return notFoundError(c, "User");
    }

    return successResponse(c, user, "User retrieved successfully");
  } catch (error) {
    return handleError(c, error, "retrieve user");
  }
});

users.post("/", async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      username: string;
      first_name?: string;
      last_name?: string;
      role?: string;
    }>();
    const { email, username, first_name, last_name, role } = body;

    if (!email || !username) {
      return validationError(c, "Email and username are required", {
        email: !email ? "required" : undefined,
        username: !username ? "required" : undefined,
      });
    }

    const db = createDrizzleClient(c.env.DB);
    const userService = new UserService(db);
    const user = await userService.createUser({ email, username, first_name, last_name, role });

    return successResponse(c, user, "User created successfully", 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("already exists")) {
      return errorResponse(c, ErrorCodes.USER_EXISTS, message, 409);
    }
    return handleError(c, error, "create user");
  }
});

users.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<{
      email?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      role?: string;
    }>();
    const { email, username, first_name, last_name, role } = body;

    const db = createDrizzleClient(c.env.DB);
    const userService = new UserService(db);
    const user = await userService.updateUser(id, { email, username, first_name, last_name, role });

    if (!user) {
      return notFoundError(c, "User");
    }

    return successResponse(c, user, "User updated successfully");
  } catch (error) {
    return handleError(c, error, "update user");
  }
});

users.post("/with-password", async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      username: string;
      password: string;
      first_name?: string;
      last_name?: string;
      role?: string;
    }>();
    const { email, username, password, first_name, last_name, role } = body;

    if (!email || !username || !password) {
      return validationError(c, "Email, username, and password are required", {
        email: !email ? "required" : undefined,
        username: !username ? "required" : undefined,
        password: !password ? "required" : undefined,
      });
    }

    if (password.length < 8) {
      return validationError(c, "Password must be at least 8 characters");
    }

    // Hash the password using shared utility
    const passwordHash = await hashPassword(password);

    // Create user with password
    const db = createDrizzleClient(c.env.DB);
    const createdUser = await authQueries.createUserWithPassword(db, {
      email,
      username,
      passwordHash,
      firstName: first_name,
      lastName: last_name,
      role: role || "user",
    });

    // Convert to User type (without password)
    const user: User = {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username,
      first_name: createdUser.first_name,
      last_name: createdUser.last_name,
      role: createdUser.role,
      created_at: createdUser.created_at,
      updated_at: createdUser.updated_at,
      deleted_at: createdUser.deleted_at,
    };

    return successResponse(c, user, "User created successfully", 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("already exists")) {
      return errorResponse(c, ErrorCodes.USER_EXISTS, message, 409);
    }
    return handleError(c, error, "create user");
  }
});

users.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = createDrizzleClient(c.env.DB);
    const userService = new UserService(db);
    const deleted = await userService.deleteUser(id);

    if (!deleted) {
      return notFoundError(c, "User");
    }

    return successResponse(c, { id }, "User deleted successfully");
  } catch (error) {
    return handleError(c, error, "delete user");
  }
});

export default users;
