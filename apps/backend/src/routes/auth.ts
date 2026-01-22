import { Hono } from "hono";
import type { Env } from "../types/env";
import type { LoginRequest, SignupRequest } from "@chronos/types/auth";
import { AuthService } from "../services/auth.service";
import { createDrizzleClient } from "../db/client";
import { extractBearerToken } from "../utils/jwt";
import {
  successResponse,
  errorResponse,
  validationError,
  unauthorizedError,
  notFoundError,
  handleError,
  ErrorCodes,
} from "../utils/responses";

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/signup
 * Register a new user
 */
auth.post("/signup", async (c) => {
  try {
    const body = await c.req.json<SignupRequest>();
    const { email, password, username, firstName, lastName } = body;

    if (!email || !password) {
      return validationError(c, "Email and password are required", {
        email: !email ? "required" : undefined,
        password: !password ? "required" : undefined,
      });
    }

    const db = createDrizzleClient(c.env.DB);
    const authService = new AuthService(db, c.env.JWT_SECRET);
    const result = await authService.signup({
      email,
      password,
      username,
      firstName,
      lastName,
    });

    return successResponse(c, result, result.message, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("already exists")) {
      return errorResponse(c, ErrorCodes.USER_EXISTS, message, 409);
    }

    if (message.includes("Invalid email") || message.includes("Password must")) {
      return validationError(c, message);
    }

    return handleError(c, error, "signup");
  }
});

/**
 * POST /api/auth/login
 * Authenticate a user
 */
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json<LoginRequest>();
    const { email, password } = body;

    if (!email || !password) {
      return validationError(c, "Email and password are required", {
        email: !email ? "required" : undefined,
        password: !password ? "required" : undefined,
      });
    }

    const db = createDrizzleClient(c.env.DB);
    const authService = new AuthService(db, c.env.JWT_SECRET);
    const result = await authService.login(email, password);

    return successResponse(c, result, result.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Invalid email or password")) {
      return errorResponse(c, ErrorCodes.INVALID_CREDENTIALS, message, 401);
    }

    if (message.includes("Invalid email")) {
      return validationError(c, message);
    }

    return handleError(c, error, "login");
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
auth.get("/me", async (c) => {
  try {
    const token = extractBearerToken(c.req.header("Authorization"));

    if (!token) {
      return unauthorizedError(c, "No token provided");
    }

    const db = createDrizzleClient(c.env.DB);
    const authService = new AuthService(db, c.env.JWT_SECRET);
    const payload = await authService.verifyToken(token);

    if (!payload) {
      return errorResponse(c, ErrorCodes.INVALID_TOKEN, "Invalid or expired token", 401);
    }

    // Get fresh user data from database
    const user = await authService.getUserById(payload.sub);

    if (!user) {
      return notFoundError(c, "User");
    }

    return successResponse(c, user, "User retrieved successfully");
  } catch (error) {
    return handleError(c, error, "get user");
  }
});

export default auth;
