import { Hono } from "hono";
import type { Env } from "../types/env";
import type { ApiResponse } from "@chronos/types";

const ai = new Hono<{ Bindings: Env }>();

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

export default ai;
