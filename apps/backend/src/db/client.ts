import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "./schema";

/**
 * Creates a Drizzle ORM client instance for Cloudflare D1
 * @param d1 - The D1 database instance from Cloudflare Workers environment
 * @returns Drizzle ORM client
 */
export function createDrizzleClient(d1: D1Database) {
  return drizzle(d1, { schema });
}

// Type export for use in application code
export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
