import type { D1 } from "@chronos/types/database";

export interface Env {
  DB: D1;
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
}

export interface AiResponse {
  response?: string;
  [key: string]: unknown;
}
