-- Migration: Fix typo in users table
-- Created: 2025-11-26
-- Changes:
--   - Rename 'firs_name' to 'first_name' (typo fix)

-- SQLite doesn't support renaming columns directly
-- We need to use a temporary table approach

-- Step 1: Create new table with corrected schema
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL,
  deleted_at DATETIME DEFAULT NULL
);

-- Step 2: Copy data from old table to new table (fix column name)
INSERT INTO users_new (id, email, username, first_name, last_name, created_at, updated_at, deleted_at)
SELECT id, email, username, firs_name, last_name, created_at, updated_at, deleted_at FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table to users
ALTER TABLE users_new RENAME TO users;
