-- Drop the priority column from tasks table (updated version)
-- Preserves all columns including preferred_start_time

-- Create new table without priority column
CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id TEXT REFERENCES task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  duration INTEGER,
  preferred_start_time TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurring_days TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- Copy data from old table (excluding priority column)
INSERT INTO tasks_new (id, user_id, list_id, title, description, completed, due_date, duration, preferred_start_time, is_recurring, recurring_days, created_at, updated_at, deleted_at)
SELECT id, user_id, list_id, title, description, completed, due_date, duration, preferred_start_time, is_recurring, recurring_days, created_at, updated_at, deleted_at
FROM tasks;

-- Drop old table
DROP TABLE tasks;

-- Rename new table to original name
ALTER TABLE tasks_new RENAME TO tasks;

-- Recreate indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_list_id ON tasks(list_id);
