import type { D1 } from "@chronos/types/database";
import type { User } from "@chronos/types/user";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all users from the database
 */

export async function getAllUsers(db: D1): Promise<User[]> {
  const stmt = db.prepare("SELECT * FROM users ORDER BY created_at DESC");
  const result = await stmt.all<UserRow>();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch users");
  }

  return result.results.map(mapUserRowToUser);
}

/**
 * Get a user by ID
 */
export async function getUserById(db: D1, id: string): Promise<User | null> {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?").bind(id);
  const user = await stmt.first<UserRow>();

  if (!user) {
    return null;
  }

  return mapUserRowToUser(user);
}

/**
 * Get a user by email
 */
export async function getUserByEmail(db: D1, email: string): Promise<User | null> {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?").bind(email);
  const user = await stmt.first<UserRow>();

  if (!user) {
    return null;
  }

  return mapUserRowToUser(user);
}

/**
 * Create a new user
 */
export async function createUser(
  db: D1,
  data: { email: string; name: string }
): Promise<User> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(
    "INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, data.email, data.name, now, now);

  const result = await stmt.run();

  if (!result.success) {
    throw new Error(result.error || "Failed to create user");
  }

  return {
    id,
    email: data.email,
    name: data.name,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

/**
 * Update a user
 */
export async function updateUser(
  db: D1,
  id: string,
  data: Partial<{ email: string; name: string }>
): Promise<User | null> {
  const existingUser = await getUserById(db, id);
  if (!existingUser) {
    return null;
  }

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.email !== undefined) {
    updates.push("email = ?");
    values.push(data.email);
  }

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }

  if (updates.length === 0) {
    return existingUser;
  }

  updates.push("updated_at = ?");
  values.push(now);
  values.push(id);

  const stmt = db.prepare(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...values);

  const result = await stmt.run();

  if (!result.success) {
    throw new Error(result.error || "Failed to update user");
  }

  return getUserById(db, id);
}

/**
 * Delete a user
 */
export async function deleteUser(db: D1, id: string): Promise<boolean> {
  const stmt = db.prepare("DELETE FROM users WHERE id = ?").bind(id);
  const result = await stmt.run();

  if (!result.success) {
    throw new Error(result.error || "Failed to delete user");
  }

  return result.meta.rows_written > 0;
}

/**
 * Helper function to map database row to User type
 */
function mapUserRowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
