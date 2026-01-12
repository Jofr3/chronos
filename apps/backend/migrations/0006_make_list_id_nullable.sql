-- Migration: Make list_id nullable in tasks table
-- Created: 2026-01-12

-- SQLite doesn't support modifying column constraints directly
-- We need to recreate the table with the new schema

-- Step 1: Create new tasks table with nullable list_id
CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  list_id TEXT REFERENCES task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'none',
  duration INTEGER,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurring_days TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Copy data from old table to new table
INSERT INTO tasks_new (id, list_id, title, description, completed, due_date, priority, duration, is_recurring, recurring_days, created_at, updated_at)
SELECT id, list_id, title, description, completed, due_date, priority, duration, is_recurring, recurring_days, created_at, updated_at
FROM tasks;

-- Step 3: Drop old table
DROP TABLE tasks;

-- Step 4: Rename new table to tasks
ALTER TABLE tasks_new RENAME TO tasks;

-- Step 5: Recreate indexes
CREATE INDEX idx_tasks_list_id ON tasks(list_id);
