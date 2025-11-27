import { Hono } from "hono";
import type { Env } from "../types/env";
import type { ApiResponse, ApiError } from "@chronos/types/api";
import type { User } from "@chronos/types/user";
import { UserService } from "../services/user.service";

const users = new Hono<{ Bindings: Env }>();

users.get("/", async (c) => {
  try {
    const userService = new UserService(c.env.DB);
    const allUsers = await userService.getAllUsers();

    const response: ApiResponse<User[]> = {
      data: allUsers,
      success: true,
      message: "Users retrieved successfully",
    };

    return c.json(response);
  } catch (error) {
    const errorResponse: ApiResponse<null> & { error: ApiError } = {
      data: null,
      success: false,
      message: "Failed to retrieve users",
      error: {
        code: "USER_FETCH_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };

    return c.json(errorResponse, 500);
  }
});

users.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const userService = new UserService(c.env.DB);
    const user = await userService.getUserById(id);

    if (!user) {
      const errorResponse: ApiResponse<null> & { error: ApiError } = {
        data: null,
        success: false,
        message: "User not found",
        error: {
          code: "USER_NOT_FOUND",
          message: `User with id ${id} does not exist`,
        },
      };

      return c.json(errorResponse, 404);
    }

    const response: ApiResponse<User> = {
      data: user,
      success: true,
      message: "User retrieved successfully",
    };

    return c.json(response);
  } catch (error) {
    const errorResponse: ApiResponse<null> & { error: ApiError } = {
      data: null,
      success: false,
      message: "Failed to retrieve user",
      error: {
        code: "USER_FETCH_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };

    return c.json(errorResponse, 500);
  }
});

users.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { email, username, first_name, last_name } = body;

    if (!email || !username) {
      const errorResponse: ApiResponse<null> & { error: ApiError } = {
        data: null,
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
          message: "Email and username are required",
          details: { 
            email: !email ? "required" : undefined, 
            username: !username ? "required" : undefined 
          },
        },
      };

      return c.json(errorResponse, 400);
    }

    const userService = new UserService(c.env.DB);
    const user = await userService.createUser({ email, username, first_name, last_name });

    const response: ApiResponse<User> = {
      data: user,
      success: true,
      message: "User created successfully",
    };

    return c.json(response, 201);
  } catch (error) {
    const errorResponse: ApiResponse<null> & { error: ApiError } = {
      data: null,
      success: false,
      message: "Failed to create user",
      error: {
        code: "USER_CREATE_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };

    const statusCode = error instanceof Error && error.message.includes("already exists") ? 409 : 500;
    return c.json(errorResponse, statusCode);
  }
});

users.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { email, username, first_name, last_name } = body;

    const userService = new UserService(c.env.DB);
    const user = await userService.updateUser(id, { email, username, first_name, last_name });

    if (!user) {
      const errorResponse: ApiResponse<null> & { error: ApiError } = {
        data: null,
        success: false,
        message: "User not found",
        error: {
          code: "USER_NOT_FOUND",
          message: `User with id ${id} does not exist`,
        },
      };

      return c.json(errorResponse, 404);
    }

    const response: ApiResponse<User> = {
      data: user,
      success: true,
      message: "User updated successfully",
    };

    return c.json(response);
  } catch (error) {
    const errorResponse: ApiResponse<null> & { error: ApiError } = {
      data: null,
      success: false,
      message: "Failed to update user",
      error: {
        code: "USER_UPDATE_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };

    return c.json(errorResponse, 500);
  }
});

users.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const userService = new UserService(c.env.DB);
    const deleted = await userService.deleteUser(id);

    if (!deleted) {
      const errorResponse: ApiResponse<null> & { error: ApiError } = {
        data: null,
        success: false,
        message: "User not found",
        error: {
          code: "USER_NOT_FOUND",
          message: `User with id ${id} does not exist`,
        },
      };

      return c.json(errorResponse, 404);
    }

    const response: ApiResponse<{ id: string }> = {
      data: { id },
      success: true,
      message: "User deleted successfully",
    };

    return c.json(response);
  } catch (error) {
    const errorResponse: ApiResponse<null> & { error: ApiError } = {
      data: null,
      success: false,
      message: "Failed to delete user",
      error: {
        code: "USER_DELETE_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };

    return c.json(errorResponse, 500);
  }
});

export default users;
