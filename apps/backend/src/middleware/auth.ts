import type { Context, Next } from "hono";
import type { Env } from "../types/env";
import { getUserIdFromToken } from "../utils/jwt";
import { unauthorizedError } from "../utils/responses";

/**
 * Auth middleware that verifies JWT token and adds userId to context
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: { userId: string } }>,
  next: Next
) {
  const userId = await getUserIdFromToken(
    c.req.header("Authorization"),
    c.env.JWT_SECRET
  );

  if (!userId) {
    return unauthorizedError(c);
  }

  c.set("userId", userId);
  await next();
}

/**
 * Type-safe helper to get userId from context after auth middleware
 */
export function getAuthUserId(c: Context<{ Variables: { userId: string } }>): string {
  return c.get("userId");
}

/**
 * Create a protected route handler type
 */
export type ProtectedContext = Context<{
  Bindings: Env;
  Variables: { userId: string };
}>;
