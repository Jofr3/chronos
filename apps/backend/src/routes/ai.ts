import { Hono } from "hono";
import type { Env } from "../types/env";
import type { ApiResponse } from "@chronos/types";
import { createDrizzleClient } from "../db/client";
import { getAllTasksByUserId } from "../db/queries/tasks";
import { createManyEvents } from "../db/queries/events";

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

    // Prepare task information for AI
    const tasksInfo = tasks.map(task => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      due_date: task.due_date,
      is_recurring: task.is_recurring,
      recurring_days: task.recurring_days,
    }));

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const prompt = `You are a task scheduling assistant. Your ONLY job is to output valid JSON - no explanations, no markdown, no extra text.

TODAY'S DATE: ${today}

TASKS TO SCHEDULE:
${JSON.stringify(tasksInfo, null, 2)}

INSTRUCTIONS:
1. Schedule each task within the next 14 days
2. For recurring tasks (is_recurring: true), create multiple instances based on recurring_days
3. Assign realistic start and end times (e.g., 9:00-10:00, 14:00-15:30)
4. Consider due_date if provided
5. Don't schedule completed tasks

OUTPUT FORMAT - Return ONLY this JSON array, nothing else:
[{"task_id":"string","date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM"}]

IMPORTANT: Your response must be ONLY the JSON array above. No explanations, no markdown code blocks, no additional text. Start with [ and end with ].`;

    console.log("Sending prompt to AI:", prompt);

    const aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 2048,
      temperature: 0.1, // Lower temperature for more consistent JSON output
    });

    console.log("AI Response:", aiResponse);

    // Parse AI response
    let scheduledEvents: Array<{
      task_id: string;
      date: string;
      start_time: string;
      end_time: string;
    }> = [];

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
      
      // Try to find a valid array with task_id, date, start_time, end_time structure
      let parsed = false;
      for (let i = arrays.length - 1; i >= 0; i--) {
        try {
          const potentialEvents = JSON.parse(arrays[i]);
          // Validate that it's an array of events with the right structure
          if (Array.isArray(potentialEvents) && 
              potentialEvents.length > 0 &&
              potentialEvents[0].task_id && 
              potentialEvents[0].date &&
              potentialEvents[0].start_time &&
              potentialEvents[0].end_time) {
            scheduledEvents = potentialEvents;
            parsed = true;
            console.log("Successfully parsed events from AI response:", scheduledEvents);
            break;
          }
        } catch (e) {
          // Try next array
          continue;
        }
      }
      
      if (!parsed) {
        throw new Error("Could not find valid schedule array in AI response");
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

    // Create events in database
    const eventsToCreate = scheduledEvents.map((event) => {
      const task = tasks.find(t => t.id === event.task_id);
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        task_id: event.task_id,
        title: task?.title || "Unknown Task",
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
      };
    });

    const createdEvents = await createManyEvents(db, eventsToCreate);

    return c.json<ApiResponse<typeof createdEvents>>({
      success: true,
      data: createdEvents,
      message: `Successfully scheduled ${createdEvents.length} events`,
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
