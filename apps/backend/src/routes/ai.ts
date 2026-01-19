import { Hono } from "hono";
import type { Env } from "../types/env";
import type { ApiResponse } from "@chronos/types";
import { createDrizzleClient } from "../db/client";
import { getAllTasksByUserId } from "../db/queries/tasks";
import { createManyEvents, getUserEvents, deleteManyEvents, updateEvent } from "../db/queries/events";

const ai = new Hono<{ Bindings: Env }>();

// Helper to get user ID from auth token
async function getUserIdFromToken(authHeader: string | undefined, jwtSecret: string): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.slice(7);
  
  try {
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

    return payload.sub;
  } catch {
    return null;
  }
}

// POST /api/ai/chat - Chat with AI
ai.post("/chat", async (c) => {
  try {
    const { prompt } = await c.req.json();

    if (!prompt || typeof prompt !== "string") {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Prompt is required and must be a string",
          },
        },
        400
      );
    }

    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
    });

    return c.json<ApiResponse<unknown>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: {
          code: "AI_ERROR",
          message: error instanceof Error ? error.message : "AI request failed",
        },
      },
      500
    );
  }
});

// POST /api/ai/schedule - AI-powered task scheduling
ai.post("/schedule", async (c) => {
  try {
    const userId = await getUserIdFromToken(c.req.header("Authorization"), c.env.JWT_SECRET);
    if (!userId) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        401
      );
    }

    const db = createDrizzleClient(c.env.DB);

    // Get all tasks for the user
    const tasks = await getAllTasksByUserId(db, userId);

    if (tasks.length === 0) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: {
            code: "NO_TASKS",
            message: "No tasks found to schedule",
          },
        },
        400
      );
    }

    // Calculate date range for next 14 days
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 14);
    const futureDateStr = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Get existing events in the next 14 days
    const existingEvents = await getUserEvents(db, userId, todayStr, futureDateStr);

    // Prepare task information for AI
    const tasksInfo = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      due_date: task.due_date,
      priority: task.priority,
      duration: task.duration, // in minutes
      is_recurring: task.is_recurring,
      recurring_days: task.recurring_days,
    }));

    // Prepare existing events information for AI
    const existingEventsInfo = existingEvents.map(event => ({
      id: event.id,
      task_id: event.task_id,
      title: event.title,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
    }));

    // Helper to get day of week for a date (0=Sunday, 6=Saturday)
    const getDayOfWeek = (dateStr: string): number => {
      return new Date(dateStr).getDay();
    };

    // Generate list of dates for each day in the next 14 days with day names
    const datesList: string[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = getDayOfWeek(dateStr);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      datesList.push(`${dateStr} = ${dayNames[dayOfWeek]} (day ${dayOfWeek})`);
    }
    
    const prompt = `You are a task scheduling assistant. Your ONLY job is to output valid JSON - no explanations, no markdown, no extra text.

TODAY'S DATE: ${todayStr}
DATE RANGE: ${todayStr} to ${futureDateStr} (next 14 days)

AVAILABLE DATES WITH DAY OF WEEK (use this for recurring tasks):
${datesList.join('\n')}

TASKS TO SCHEDULE:
${JSON.stringify(tasksInfo, null, 2)}

EXISTING EVENTS (already scheduled in the next 14 days):
${JSON.stringify(existingEventsInfo, null, 2)}

INSTRUCTIONS:
1. ANALYZE EXISTING EVENTS:
   - Check which tasks already have events scheduled
   - Identify time conflicts in existing events
   - Find events for tasks that have been completed (completed: true) - these should be DELETED
   - Find events that need rescheduling (wrong time, conflicts, etc.)

2. OPERATIONS YOU CAN PERFORM:
   - "create": Schedule a new event for a task
   - "delete": Remove an existing event (e.g., task was completed, conflict, duplicate)
   - "update": Modify an existing event (change date/time)

3. ONE-SHOT TASKS (is_recurring: false):
   - Create ONLY ONE event per task (if not already scheduled)
   - If task already has an event, don't create another unless you delete the old one first
   - If due_date is provided and not empty, schedule ON that exact date
   - If due_date is empty/null, schedule based on priority

4. RECURRING TASKS (is_recurring: true):
   - Create multiple instances based on recurring_days array
   - Day numbering: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
   - Use the "AVAILABLE DATES WITH DAY OF WEEK" list above to find matching dates
   - Example: if recurring_days=[6], find all dates marked as "Saturday (day 6)" in the list
   - Example: if recurring_days=[1,3,5], find all "Monday (day 1)", "Wednesday (day 3)", "Friday (day 5)" dates
   - Check existing events to avoid duplicates

5. PRIORITY affects scheduling urgency (for tasks without due_date):
   - "high": Schedule within 1-3 days
   - "normal": Schedule within a week
   - "low": Schedule later in the 14-day window
   - "none": Schedule flexibly

6. DURATION (in minutes) determines event length:
   - If duration provided: end_time = start_time + duration
   - If no duration: use 30-60 minutes default
   - Example: duration=45, start_time="09:00" → end_time="09:45"

7. SCHEDULING RULES:
   - Working hours: 09:00-18:00
   - NO overlapping events (check existing events!)
   - Space tasks reasonably throughout the day
   - If a task is completed, DELETE its future events

OUTPUT FORMAT - Return ONLY this JSON array with operations:
[
  {"operation":"create","task_id":"string","date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM"},
  {"operation":"delete","event_id":"string"},
  {"operation":"update","event_id":"string","date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM"}
]

IMPORTANT:
- Your response must be ONLY the JSON array above
- No explanations, no markdown code blocks, no additional text
- Start with [ and end with ]
- For "create": include task_id, date, start_time, end_time
- For "delete": include event_id only
- For "update": include event_id and any fields to update (date, start_time, end_time)`;

    console.log("Sending prompt to AI:", prompt);

    const aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 2048,
      temperature: 0.1, // Lower temperature for more consistent JSON output
    });

    console.log("AI Response:", aiResponse);

    // Parse AI response
    type Operation =
      | { operation: "create"; task_id: string; date: string; start_time: string; end_time: string }
      | { operation: "delete"; event_id: string }
      | { operation: "update"; event_id: string; date?: string; start_time?: string; end_time?: string };

    let operations: Operation[] = [];

    try {
      // The AI response might be wrapped in an object with 'response' property
      const responseText = typeof aiResponse === 'object' && 'response' in aiResponse
        ? (aiResponse as { response: string }).response
        : JSON.stringify(aiResponse);

      // Try to extract all JSON arrays from the response
      const jsonMatches = responseText.matchAll(/\[[\s\S]*?\]/g);
      const arrays = Array.from(jsonMatches).map(match => match[0]);

      if (arrays.length === 0) {
        throw new Error("No JSON array found in AI response");
      }

      // Try to find a valid array with operations
      let parsed = false;
      for (let i = arrays.length - 1; i >= 0; i--) {
        try {
          const potentialOps = JSON.parse(arrays[i]);
          // Validate that it's an array of operations
          if (Array.isArray(potentialOps) &&
              potentialOps.length > 0 &&
              potentialOps[0].operation &&
              ["create", "delete", "update"].includes(potentialOps[0].operation)) {
            operations = potentialOps;
            parsed = true;
            console.log("Successfully parsed operations from AI response:", operations);
            break;
          }
        } catch (e) {
          // Try next array
          continue;
        }
      }

      if (!parsed) {
        throw new Error("Could not find valid operations array in AI response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: {
            code: "AI_PARSE_ERROR",
            message: "Failed to parse AI scheduling response",
          },
        },
        500
      );
    }

    // Process operations
    const results = {
      created: 0,
      deleted: 0,
      updated: 0,
    };

    // Process deletes first
    const deleteOps = operations.filter((op): op is Extract<Operation, { operation: "delete" }> =>
      op.operation === "delete"
    );
    if (deleteOps.length > 0) {
      const eventIdsToDelete = deleteOps.map(op => op.event_id);
      results.deleted = await deleteManyEvents(db, eventIdsToDelete, userId);
    }

    // Process updates
    const updateOps = operations.filter((op): op is Extract<Operation, { operation: "update" }> =>
      op.operation === "update"
    );
    for (const updateOp of updateOps) {
      const updated = await updateEvent(db, updateOp.event_id, userId, {
        date: updateOp.date,
        start_time: updateOp.start_time,
        end_time: updateOp.end_time,
      });
      if (updated) results.updated++;
    }

    // Process creates
    const createOps = operations.filter((op): op is Extract<Operation, { operation: "create" }> =>
      op.operation === "create"
    );
    if (createOps.length > 0) {
      const eventsToCreate = createOps.map((op) => {
        const task = tasks.find(t => t.id === op.task_id);
        return {
          id: crypto.randomUUID(),
          user_id: userId,
          task_id: op.task_id,
          title: task?.title || "Unknown Task",
          date: op.date,
          start_time: op.start_time,
          end_time: op.end_time,
        };
      });

      const createdEvents = await createManyEvents(db, eventsToCreate);
      results.created = createdEvents.length;
    }

    return c.json<ApiResponse<typeof results>>({
      success: true,
      data: results,
      message: `Successfully processed scheduling: ${results.created} created, ${results.updated} updated, ${results.deleted} deleted`,
    });

  } catch (error) {
    console.error("AI schedule error:", error);
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: {
          code: "SCHEDULE_ERROR",
          message: error instanceof Error ? error.message : "Failed to schedule tasks",
        },
      },
      500
    );
  }
});

export default ai;
