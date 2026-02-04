import { Hono } from "hono";
import type { Env } from "../types/env";
import { ConstraintService } from "../services/constraint.service";
import { createDrizzleClient } from "../db/client";
import type {
  CreateTimeConstraintRequest,
  UpdateTimeConstraintRequest,
} from "@chronos/types";
import {
  authMiddleware,
  getAuthUserId,
  type ProtectedContext,
} from "../middleware/auth";
import {
  successResponse,
  validationError,
  notFoundError,
  handleError,
} from "../utils/responses";

const constraints = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// Apply auth middleware to all routes
constraints.use("/*", authMiddleware);

// GET /api/constraints - Get all constraints for authenticated user
constraints.get("/", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const db = createDrizzleClient(c.env.DB);
    const constraintService = new ConstraintService(db);
    const userConstraints = await constraintService.getAllConstraints(userId);

    return successResponse(c, userConstraints);
  } catch (error) {
    return handleError(c, error, "fetch constraints");
  }
});

// GET /api/constraints/:id - Get a single constraint
constraints.get("/:id", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const constraintId = c.req.param("id");
    const db = createDrizzleClient(c.env.DB);
    const constraintService = new ConstraintService(db);
    const constraint = await constraintService.getConstraint(constraintId, userId);

    if (!constraint) {
      return notFoundError(c, "Constraint");
    }

    return successResponse(c, constraint);
  } catch (error) {
    return handleError(c, error, "fetch constraint");
  }
});

// POST /api/constraints - Create a new constraint
constraints.post("/", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const body = await c.req.json<CreateTimeConstraintRequest>();

    // Validate required fields
    if (!body.name || body.name.trim() === "") {
      return validationError(c, "Constraint name is required");
    }
    if (!body.start_time || !body.end_time) {
      return validationError(c, "Start time and end time are required");
    }

    const db = createDrizzleClient(c.env.DB);
    const constraintService = new ConstraintService(db);
    const constraint = await constraintService.createConstraint(userId, {
      name: body.name.trim(),
      start_time: body.start_time,
      end_time: body.end_time,
      date: body.date,
      is_recurring: body.is_recurring,
      recurring_days: body.recurring_days,
    });

    return successResponse(c, constraint, undefined, 201);
  } catch (error) {
    return handleError(c, error, "create constraint");
  }
});

// PUT /api/constraints/:id - Update a constraint
constraints.put("/:id", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const constraintId = c.req.param("id");
    const body = await c.req.json<UpdateTimeConstraintRequest>();

    const db = createDrizzleClient(c.env.DB);
    const constraintService = new ConstraintService(db);
    const constraint = await constraintService.updateConstraint(
      constraintId,
      userId,
      body
    );

    if (!constraint) {
      return notFoundError(c, "Constraint");
    }

    return successResponse(c, constraint);
  } catch (error) {
    return handleError(c, error, "update constraint");
  }
});

// DELETE /api/constraints/:id - Delete a constraint (soft delete)
constraints.delete("/:id", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const constraintId = c.req.param("id");
    const db = createDrizzleClient(c.env.DB);
    const constraintService = new ConstraintService(db);
    const deleted = await constraintService.deleteConstraint(constraintId, userId);

    if (!deleted) {
      return notFoundError(c, "Constraint");
    }

    return successResponse(c, { id: constraintId, deleted: true });
  } catch (error) {
    return handleError(c, error, "delete constraint");
  }
});

export default constraints;
