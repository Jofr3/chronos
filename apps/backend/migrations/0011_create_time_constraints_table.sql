-- Migration: Create time_constraints table for constraint zones
-- Created: 2026-02-04
-- Description: Time constraints are user-defined blocks where AI cannot schedule tasks

CREATE TABLE IF NOT EXISTS time_constraints (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    date TEXT,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurring_days TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_time_constraints_user_id ON time_constraints(user_id);

-- Notes:
-- - For one-time constraints: date is set, is_recurring = 0, recurring_days is NULL
-- - For recurring constraints: date is NULL, is_recurring = 1, recurring_days contains JSON array
-- - recurring_days stores a JSON array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
--   Example: "[1,2,3,4,5]" means Monday through Friday
-- - start_time and end_time are in HH:MM format (24-hour)
