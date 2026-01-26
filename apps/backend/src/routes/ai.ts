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

    // Get tasks eligible for scheduling
    const tasks = await taskService.getSchedulableTasks(userId);

    // Create ID mapping (fake ID -> real ID) and anonymize tasks for AI
    const idMapping: Array<{ fake_id: string; real_id: string }> = [];
    const anonymizedTasks = tasks.map((task, index) => {
      const fake_id = `t${index}`;
      idMapping.push({ fake_id, real_id: task.id });
      return {
        ...task,
        id: fake_id,
      };
    });

    // Generate available dates (today + 14 days)
    const availableDates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      availableDates.push(date.toISOString().split("T")[0]);
    }

    // Call AI to schedule tasks
    console.log("Calling AI with tasks:", anonymizedTasks.length);
    let aiResponse;
    try {
      aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          {
            role: "system",
            content: `You are a task scheduling assistant. Respond ONLY with valid JSON.
Return an object with a "scheduled" array containing objects with "task_id" and "date" fields.
Example: {"scheduled": [{"task_id": "t0", "date": "2026-01-27"}]}`
          },
          {
            role: "user",
            content: `Schedule these tasks to appropriate dates.

TASKS:
${JSON.stringify(anonymizedTasks, null, 2)}

AVAILABLE DATES:
${JSON.stringify(availableDates)}

RULES:
IMPORTANT: If a task has a due_date, schedule it ON that exact date
- Only tasks with due_date: null can be scheduled on any available date
- Spread tasks without due_date evenly across available dates
- Schedule tasks only ONCE`

          }
        ],
        max_tokens: 512,
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: {
              scheduled: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task_id: { type: "string" },
                    date: { type: "string" }
                  },
                  required: ["task_id", "date"]
                }
              }
            },
            required: ["scheduled"]
          }
        }
      });
      console.log("AI response:", JSON.stringify(aiResponse));
    } catch (aiError) {
      console.error("AI call failed:", aiError);
      throw aiError;
    }

    // Parse AI response
    let scheduledTasks: Array<{ task_id: string; date: string }> = [];
    try {
      const response = (aiResponse as { response?: { scheduled?: Array<{ task_id: string; date: string }> } }).response;
      scheduledTasks = response?.scheduled || [];
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
    }

    // Enrich scheduled tasks with duration info for time scheduling
    const tasksWithDuration = scheduledTasks.map((scheduled) => {
      const task = anonymizedTasks.find((t) => t.id === scheduled.task_id);
      return {
        ...scheduled,
        title: task?.title || "",
        duration: task?.duration || 60, // Default 60 minutes if not set
      };
    });

    // Second AI call: assign times within each day
    console.log("Calling AI to assign times...");
    let timeResponse;
    try {
      timeResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          {
            role: "system",
            content: `You are a task scheduling assistant. Respond ONLY with valid JSON.
Return an object with a "scheduled" array containing objects with "task_id", "date", "start_time", and "end_time" fields.
Times should be in HH:MM format (24-hour). Schedule tasks between 09:00 and 18:00.
Example: {"scheduled": [{"task_id": "t0", "date": "2026-01-27", "start_time": "09:00", "end_time": "10:00"}]}`
          },
          {
            role: "user",
            content: `Assign specific times to these scheduled tasks.

TASKS WITH DATES:
${JSON.stringify(tasksWithDuration, null, 2)}

RULES:
- Use the duration field (in minutes) to calculate end_time from start_time
- Schedule tasks between 09:00 and 18:00
- Avoid overlapping tasks on the same day
- Leave small gaps between tasks when possible`
          }
        ],
        max_tokens: 1024,
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: {
              scheduled: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task_id: { type: "string" },
                    date: { type: "string" },
                    start_time: { type: "string" },
                    end_time: { type: "string" }
                  },
                  required: ["task_id", "date", "start_time", "end_time"]
                }
              }
            },
            required: ["scheduled"]
          }
        }
      });
      console.log("Time response:", JSON.stringify(timeResponse));
    } catch (aiError) {
      console.error("Time scheduling AI call failed:", aiError);
      throw aiError;
    }

    // Parse time scheduling response
    let finalSchedule: Array<{ task_id: string; date: string; start_time: string; end_time: string }> = [];
    try {
      const rawResponse = (timeResponse as { response?: string | { scheduled?: Array<{ task_id: string; date: string; start_time: string; end_time: string }> } }).response;

      // Handle both string and object responses
      if (typeof rawResponse === "string") {
        const parsed = JSON.parse(rawResponse);
        finalSchedule = parsed.scheduled || [];
      } else {
        finalSchedule = rawResponse?.scheduled || [];
      }
    } catch (parseError) {
      console.error("Failed to parse time response:", timeResponse);
    }

    // Map fake IDs back to real IDs
    const result = finalSchedule.map((scheduled) => {
      const mapping = idMapping.find((m) => m.fake_id === scheduled.task_id);
      return {
        task_id: mapping?.real_id || scheduled.task_id,
        date: scheduled.date,
        start_time: scheduled.start_time,
        end_time: scheduled.end_time,
      };
    });

    // Get existing events for scheduled tasks
    const taskIds = result.map((r) => r.task_id);
    const existingEvents = await eventQueries.getEventsByTaskIds(db, taskIds);
    const existingEventMap = new Map(existingEvents.map((e) => [e.task_id, e.id]));

    // Create or update events
    const createdEvents: Awaited<ReturnType<typeof eventQueries.createEvent>>[] = [];
    const updatedEvents: Awaited<ReturnType<typeof eventQueries.updateEvent>>[] = [];

    for (const scheduled of result) {
      const existingEventId = existingEventMap.get(scheduled.task_id);

      if (existingEventId) {
        // Update existing event
        const updated = await eventQueries.updateEvent(db, existingEventId, userId, {
          date: scheduled.date,
          start_time: scheduled.start_time,
          end_time: scheduled.end_time,
        });
        if (updated) updatedEvents.push(updated);
      } else {
        // Create new event
        const eventId = crypto.randomUUID();
        const created = await eventQueries.createEvent(
          db,
          eventId,
          userId,
          scheduled.task_id,
          scheduled.date,
          scheduled.start_time,
          scheduled.end_time
        );
        createdEvents.push(created);
      }
    }

    return successResponse(c, {
      scheduled: result,
      created: createdEvents.length,
      updated: updatedEvents.length,
    });
  } catch (error) {
    return handleError(c, error, "schedule tasks");
  }
});

export default ai;
