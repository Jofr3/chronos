import { Hono } from "hono";
import type { Env } from "../types/env";
import { getUserEvents, createEvent, deleteEvent } from "../db/queries/events";
import type { CreateEventRequest } from "@chronos/types";
import { createDrizzleClient } from "../db/client";

const app = new Hono<{ Bindings: Env }>();

// Helper to get user ID from auth token
async function getUserIdFromToken(authHeader: string | undefined, jwtSecret: string): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.slice(7);
  
  try {
    // Decode JWT token manually (only need payload verification, no DB needed)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureData = await crypto.subtle.sign("HMAC", key, encoder.encode(`${encodedHeader}.${encodedPayload}`));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureData)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    if (signature !== expectedSignature) {
      return null;
    }

    // Decode and parse payload
    const pad = encodedPayload.length % 4;
    const paddedPayload = pad ? encodedPayload + "=".repeat(4 - pad) : encodedPayload;
    const payload = JSON.parse(atob(paddedPayload.replace(/-/g, "+").replace(/_/g, "/")));

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload.sub; // 'sub' contains the user ID
  } catch {
    return null;
  }
}

// Get all events for authenticated user
app.get("/", async (c) => {
  const userId = await getUserIdFromToken(c.req.header("Authorization"), c.env.JWT_SECRET);
  if (!userId) {
    return c.json({ success: false, error: { message: "Unauthorized" } }, 401);
  }

  const db = createDrizzleClient(c.env.DB);
  
  // Get optional date range from query params
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  
  const events = await getUserEvents(db, userId, startDate, endDate);

  return c.json({
    success: true,
    data: events,
  });
});

// Create new event
app.post("/", async (c) => {
  const userId = await getUserIdFromToken(c.req.header("Authorization"), c.env.JWT_SECRET);
  if (!userId) {
    return c.json({ success: false, error: { message: "Unauthorized" } }, 401);
  }

  const body = await c.req.json<CreateEventRequest>();

  if (!body.title || !body.date || !body.start_time || !body.end_time) {
    return c.json(
      { success: false, error: { message: "Missing required fields" } },
      400
    );
  }

  const db = createDrizzleClient(c.env.DB);
  const eventId = crypto.randomUUID();

  const event = await createEvent(
    db,
    eventId,
    userId,
    body.task_id || null,
    body.title,
    body.date,
    body.start_time,
    body.end_time
  );

  return c.json({
    success: true,
    data: event,
  });
});

// Delete event
app.delete("/:id", async (c) => {
  const userId = await getUserIdFromToken(c.req.header("Authorization"), c.env.JWT_SECRET);
  if (!userId) {
    return c.json({ success: false, error: { message: "Unauthorized" } }, 401);
  }

  const eventId = c.req.param("id");
  const db = createDrizzleClient(c.env.DB);

  const deleted = await deleteEvent(db, eventId, userId);

  if (!deleted) {
    return c.json({ success: false, error: { message: "Event not found" } }, 404);
  }

  return c.json({
    success: true,
    data: { id: eventId },
  });
});

export default app;
