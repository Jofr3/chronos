import type { Context } from "hono";
import type { ApiResponse, ApiError } from "@chronos/types/api";

type StatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500;

/**
 * Standard error codes used across the API
 */
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USER_EXISTS: "USER_EXISTS",
  USER_NOT_FOUND: "USER_NOT_FOUND",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ACCESS_DENIED: "ACCESS_DENIED",

  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  AI_ERROR: "AI_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Create a success response
 */
export function successResponse<T>(
  c: Context,
  data: T,
  message?: string,
  status: StatusCode = 200
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return c.json(response, status);
}

/**
 * Create an error response
 */
export function errorResponse(
  c: Context,
  code: ErrorCode,
  message: string,
  status: StatusCode = 500,
  details?: Record<string, unknown>
) {
  const response: ApiResponse<null> & { error: ApiError } = {
    success: false,
    data: null,
    message,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  return c.json(response, status);
}

/**
 * Create a validation error response
 */
export function validationError(
  c: Context,
  message: string,
  details?: Record<string, unknown>
) {
  return errorResponse(c, ErrorCodes.VALIDATION_ERROR, message, 400, details);
}

/**
 * Create an unauthorized response
 */
export function unauthorizedError(c: Context, message = "Unauthorized") {
  return errorResponse(c, ErrorCodes.UNAUTHORIZED, message, 401);
}

/**
 * Create a not found response
 */
export function notFoundError(c: Context, resource = "Resource") {
  return errorResponse(c, ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
}

/**
 * Create an internal server error response
 */
export function internalError(c: Context, error: unknown, fallbackMessage = "Internal server error") {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return errorResponse(c, ErrorCodes.INTERNAL_ERROR, message, 500);
}

/**
 * Handle common error patterns
 */
export function handleError(c: Context, error: unknown, context: string) {
  const message = error instanceof Error ? error.message : `Failed to ${context}`;

  // Check for common error patterns
  if (message.includes("not found")) {
    return notFoundError(c, context);
  }
  if (message.includes("already exists")) {
    return errorResponse(c, ErrorCodes.USER_EXISTS, message, 409);
  }
  if (message.includes("Access denied")) {
    return errorResponse(c, ErrorCodes.ACCESS_DENIED, message, 403);
  }

  return internalError(c, error, `Failed to ${context}`);
}
