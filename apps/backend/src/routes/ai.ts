import { Hono } from "hono";
import type { Env } from "../types/env";
import type { ApiResponse } from "@chronos/types";

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

    // TODO: Implement scheduling logic
    return c.json<ApiResponse<null>>({
      success: true,
      data: null,
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
