import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  AI: Ai;
}

// Cloudflare Workers AI types
export interface Ai {
  run(model: string, options: AiOptions): Promise<AiResponse>;
}

export interface AiOptions {
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  response_format?: {
    type: "json_object" | "json_schema" | "text";
    json_schema?: Record<string, unknown>;
  };
}

export interface AiResponse {
  response?: string;
  [key: string]: unknown;
}
