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
    const body = await c.req.json<{
      tasks?: string[];
      preferences?: Record<string, unknown>;
    }>();

    // Basic implementation - can be expanded later
    const { tasks = [], preferences = {} } = body;

    if (tasks.length === 0) {
      return validationError(c, "At least one task is required for scheduling");
    }

    // Generate scheduling prompt
    const schedulePrompt = `You are a task scheduling assistant. Help schedule these tasks optimally:
Tasks: ${tasks.join(", ")}
User preferences: ${JSON.stringify(preferences)}

Provide a simple JSON schedule with task names and suggested time slots.`;

    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: schedulePrompt,
    });

    return successResponse(c, {
      userId,
      schedule: response,
      tasksCount: tasks.length,
    });
  } catch (error) {
    return handleError(c, error, "schedule tasks");
  }
});

export default ai;
