import { eq, desc } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { users } from "../schema";
import type { User } from "@chronos/types/user";

/**
 * Get all users from the database
 */
export async function getAllUsers(db: DrizzleClient): Promise<User[]> {
  const result = await db.select().from(users).orderBy(desc(users.created_at));
  return result.map(mapUserToUser);
}

/**
 * Get a user by ID
 */
export async function getUserById(db: DrizzleClient, id: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);

  if (result.length === 0) {
    return null;
  }

  return mapUserToUser(result[0]);
}

/**
 * Get a user by email
 */
export async function getUserByEmail(db: DrizzleClient, email: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (result.length === 0) {
    return null;
  }

  return mapUserToUser(result[0]);
}

/**
 * Get a user by username
 */
export async function getUserByUsername(db: DrizzleClient, username: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (result.length === 0) {
    return null;
  }

  return mapUserToUser(result[0]);
}

/**
 * Create a new user
 */
export async function createUser(
  db: DrizzleClient,
  data: { email: string; username: string; first_name?: string; last_name?: string; role?: "user" | "developer" }
): Promise<User> {
  const result = await db.insert(users).values({
    email: data.email,
    username: data.username,
    first_name: data.first_name || null,
    last_name: data.last_name || null,
    role: data.role || "user",
  }).returning();

  if (!result || result.length === 0) {
    throw new Error("Failed to create user");
  }

  return mapUserToUser(result[0]);
}

/**
 * Update a user
 */
export async function updateUser(
  db: DrizzleClient,
  id: string,
  data: Partial<{ email: string; username: string; first_name: string; last_name: string; role: "user" | "developer" }>
): Promise<User | null> {
  const existingUser = await getUserById(db, id);
  if (!existingUser) {
    return null;
  }

  const now = new Date().toISOString();
  const updateData: Record<string, string | null> = {
    updated_at: now,
  };

  if (data.email !== undefined) updateData.email = data.email;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.first_name !== undefined) updateData.first_name = data.first_name;
  if (data.last_name !== undefined) updateData.last_name = data.last_name;
  if (data.role !== undefined) updateData.role = data.role;

  const result = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, parseInt(id)))
    .returning();

  if (!result || result.length === 0) {
    return null;
  }

  return mapUserToUser(result[0]);
}

/**
 * Delete a user
 */
export async function deleteUser(db: DrizzleClient, id: string): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, parseInt(id))).returning();
  return result.length > 0;
}

/**
 * Helper function to map database row to User type
 */
function mapUserToUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id.toString(),
    email: row.email,
    username: row.username,
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    role: row.role || "user",
    created_at: new Date(row.created_at),
    updated_at: row.updated_at ? new Date(row.updated_at) : null,
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}
