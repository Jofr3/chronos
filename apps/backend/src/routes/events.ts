import { Hono } from "hono";
import type { Env } from "../types/env";
import { getUserEvents, createEvent, updateEvent, deleteEvent } from "../db/queries/events";
import type { CreateEventRequest, UpdateEventRequest } from "@chronos/types";
import { createDrizzleClient } from "../db/client";
import { authMiddleware, getAuthUserId, type ProtectedContext } from "../middleware/auth";
import {
  successResponse,
  validationError,
  notFoundError,
  handleError,
} from "../utils/responses";

const events = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// Apply auth middleware to all routes
events.use("/*", authMiddleware);

// Get all events for authenticated user
events.get("/", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const db = createDrizzleClient(c.env.DB);

    // Get optional date range from query params
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    const userEvents = await getUserEvents(db, userId, startDate, endDate);

    return successResponse(c, userEvents);
  } catch (error) {
    return handleError(c, error, "fetch events");
  }
});

// Create new event
events.post("/", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const body = await c.req.json<CreateEventRequest>();

    if (!body.task_id || !body.date || !body.start_time || !body.end_time) {
      return validationError(
        c,
        "Missing required fields (task_id, date, start_time, end_time)",
        {
          task_id: !body.task_id ? "required" : undefined,
          date: !body.date ? "required" : undefined,
          start_time: !body.start_time ? "required" : undefined,
          end_time: !body.end_time ? "required" : undefined,
        }
      );
    }

    const db = createDrizzleClient(c.env.DB);
    const eventId = crypto.randomUUID();

    const event = await createEvent(
      db,
      eventId,
      userId,
      body.task_id,
      body.date,
      body.start_time,
      body.end_time
    );

    return successResponse(c, event, undefined, 201);
  } catch (error) {
    return handleError(c, error, "create event");
  }
});

// Update event
events.patch("/:id", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const eventId = c.req.param("id");
    const body = await c.req.json<UpdateEventRequest>();

    // Validate that at least one field is being updated
    if (!body.date && !body.start_time && !body.end_time) {
      return validationError(
        c,
        "At least one field (date, start_time, end_time) must be provided"
      );
    }

    const db = createDrizzleClient(c.env.DB);
    const updated = await updateEvent(db, eventId, userId, body);

    if (!updated) {
      return notFoundError(c, "Event");
    }

    return successResponse(c, updated);
  } catch (error) {
    return handleError(c, error, "update event");
  }
});

// Delete event
events.delete("/:id", async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const eventId = c.req.param("id");
    const db = createDrizzleClient(c.env.DB);

    const deleted = await deleteEvent(db, eventId, userId);

    if (!deleted) {
      return notFoundError(c, "Event");
    }

    return successResponse(c, { id: eventId });
  } catch (error) {
    return handleError(c, error, "delete event");
  }
});

export default events;
