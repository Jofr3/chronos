import { Hono } from "hono";
import type { Env } from "../types/env";
import { authMiddleware, getAuthUserId, type ProtectedContext } from "../middleware/auth";
import {
  successResponse,
  validationError,
  handleError,
  errorResponse,
  ErrorCodes,
} from "../utils/responses";
import { createDrizzleClient } from "../db/client";
import { TaskService } from "../services/task.service";
import * as eventQueries from "../db/queries/events";

const ai = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// POST /api/ai/chat - Chat with AI (public endpoint)
ai.post("/chat", async (c) => {
  try {
    const { prompt } = await c.req.json<{ prompt: string }>();

    if (!prompt || typeof prompt !== "string") {
      return validationError(c, "Prompt is required and must be a string");
    }

    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
    });

    return successResponse(c, response);
  } catch (error) {
    return errorResponse(
      c,
      ErrorCodes.AI_ERROR,
      error instanceof Error ? error.message : "AI request failed",
      500
    );
  }
});

// POST /api/ai/schedule - AI-powered task scheduling (protected)
ai.post("/schedule", authMiddleware, async (c: ProtectedContext) => {
  try {
    const userId = getAuthUserId(c);
    const db = createDrizzleClient(c.env.DB);
    const taskService = new TaskService(db);

    // Get all incomplete tasks for the user
    const incompleteTasks = await taskService.getIncompleteTasks(userId);

    if (incompleteTasks.length === 0) {
      return successResponse(c, {
        message: "No incomplete tasks to schedule",
        tasks: [],
        events: [],
      });
    }

    const today = new Date().toISOString().split("T")[0];

    let response;
    try {
      response = await c.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        {
          role: "system",
          content: `You are a task scheduling assistant. Schedule tasks into calendar events. Respond ONLY with valid JSON.

RULES:
- ONE event per task
- If due_date exists: schedule on that date (or earlier if full)
- end_time = start_time + duration (default 60 min)
- Working hours: 09:00-18:00, 5 min gaps between events
- If task.events has items: use existing event_id to UPDATE
- If task.events is empty: set event_id to null to CREATE

OUTPUT FORMAT:
{"events":[{"task_id":"id","event_id":"id or null","date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM"}]}`,
        },
        {
          role: "user",
          content: `Today: ${today}. Schedule:\n${JSON.stringify(incompleteTasks)}`,
        },
      ],
      max_tokens: 2048,
      response_format: {
        type: "json_object",
      },
    });
    } catch (aiError) {
      console.error("AI call failed:", aiError);
      return errorResponse(c, ErrorCodes.AI_ERROR, `AI call failed: ${aiError instanceof Error ? aiError.message : "Unknown error"}`, 500);
    }

    console.log("AI Response:", response);

    // Parse the response
    let parsed: {
      events: Array<{
        task_id: string;
        event_id: string | null;
        date: string;
        start_time: string;
        end_time: string;
      }>;
    };

    try {
      let responseText = typeof response === "string"
        ? response
        : (response as { response?: string }).response;

      if (!responseText) {
        console.error("Empty AI response:", response);
        return errorResponse(c, ErrorCodes.AI_ERROR, "AI returned empty response", 500);
      }

      // Strip markdown code blocks if present
      responseText = responseText.trim();
      if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      parsed = JSON.parse(responseText);
      console.log("Parsed response:", parsed);

      if (!parsed.events || !Array.isArray(parsed.events)) {
        console.error("Invalid response structure:", parsed);
        return errorResponse(c, ErrorCodes.AI_ERROR, "AI response missing events array", 500);
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Response:", response);
      return errorResponse(c, ErrorCodes.AI_ERROR, "Failed to parse AI response as JSON", 500);
    }

    const validEvents = parsed.events;

    // Create or update events in the database
    const createdEvents = [];
    const updatedEvents = [];
    const errors = [];

    for (const event of validEvents) {
      try {
        if (event.event_id) {
          // Update existing event
          const updated = await eventQueries.updateEvent(
            db,
            event.event_id,
            userId,
            {
              date: event.date,
              start_time: event.start_time,
              end_time: event.end_time,
            }
          );
          if (updated) {
            updatedEvents.push(updated);
          }
        } else {
          // Create new event
          const eventId = crypto.randomUUID();
          const created = await eventQueries.createEvent(
            db,
            eventId,
            userId,
            event.task_id,
            event.date,
            event.start_time,
            event.end_time
          );
          createdEvents.push(created);
        }
      } catch (eventError) {
        console.error("Error processing event:", event, eventError);
        errors.push({
          event,
          error: eventError instanceof Error ? eventError.message : "Unknown error",
        });
      }
    }

    return successResponse(c, {
      tasks: incompleteTasks,
      created: createdEvents,
      updated: updatedEvents,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleError(c, error, "schedule tasks");
  }
});

export default ai;
