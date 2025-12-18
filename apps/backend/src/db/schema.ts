import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Users table
 */
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    username: text("username").notNull(),
    first_name: text("first_name"),
    last_name: text("last_name"),
    password_hash: text("password_hash"),
    role: text("role", { enum: ["user", "developer"] })
      .notNull()
      .default("user"),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at"),
    deleted_at: text("deleted_at"),
  },
  (table) => ({
    emailIdx: index("idx_users_email").on(table.email),
    usernameIdx: index("idx_users_username").on(table.username),
    createdAtIdx: index("idx_users_created_at").on(table.created_at),
    roleIdx: index("idx_users_role").on(table.role),
  })
);

/**
 * Task Lists table
 */
export const taskLists = sqliteTable(
  "task_lists",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    userIdIdx: index("idx_task_lists_user_id").on(table.user_id),
  })
);

/**
 * Tasks table
 */
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    list_id: text("list_id")
      .notNull()
      .references(() => taskLists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    due_date: text("due_date"),
    is_recurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
    recurring_days: text("recurring_days"), // JSON string: "[0,1,2,3,4,5,6]"
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    listIdIdx: index("idx_tasks_list_id").on(table.list_id),
  })
);

/**
 * Events table
 */
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    task_id: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    date: text("date").notNull(), // ISO date string (YYYY-MM-DD)
    start_time: text("start_time").notNull(), // Time in HH:MM format
    end_time: text("end_time").notNull(), // Time in HH:MM format
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    userIdIdx: index("idx_events_user_id").on(table.user_id),
    taskIdIdx: index("idx_events_task_id").on(table.task_id),
    dateIdx: index("idx_events_date").on(table.date),
  })
);

// Type exports for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type TaskList = typeof taskLists.$inferSelect;
export type NewTaskList = typeof taskLists.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
