// Environment bindings for Cloudflare Workers
import type { D1Database } from "@chronos/types/database";

export interface Env {
  DB: D1Database;
}
