import { eq } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { users } from "../schema";
import type { UserWithPassword } from "@chronos/types/auth";

/**
 * Get a user by email including password hash for authentication
 */
export async function getUserByEmailWithPassword(
  db: DrizzleClient,
  email: string
): Promise<UserWithPassword | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return mapRowToUserWithPassword(result[0]);
}

/**
 * Create a new user with password hash
 */
export async function createUserWithPassword(
  db: DrizzleClient,
  data: {
    email: string;
    username: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    role?: "user" | "developer";
  }
): Promise<UserWithPassword> {
  const result = await db.insert(users).values({
    email: data.email,
    username: data.username,
    password_hash: data.passwordHash,
    first_name: data.firstName || null,
    last_name: data.lastName || null,
    role: data.role || "user",
  }).returning();

  if (!result || result.length === 0) {
    throw new Error("Failed to create user");
  }

  return mapRowToUserWithPassword(result[0]);
}

/**
 * Check if a user with the given email already exists
 */
export async function userExistsByEmail(db: DrizzleClient, email: string): Promise<boolean> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0;
}

/**
 * Get a user by ID
 */
export async function getUserById(db: DrizzleClient, id: string): Promise<UserWithPassword | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, parseInt(id)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return mapRowToUserWithPassword(result[0]);
}

/**
 * Helper function to map database row to UserWithPassword type
 */
function mapRowToUserWithPassword(row: typeof users.$inferSelect): UserWithPassword {
  return {
    id: row.id.toString(),
    email: row.email,
    username: row.username,
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    role: row.role || "user",
    password_hash: row.password_hash,
    created_at: new Date(row.created_at),
    updated_at: row.updated_at ? new Date(row.updated_at) : null,
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}
