-- Migration: Update users table from old schema
-- Created: 2025-11-26
-- Changes:
--   - Rename 'name' to 'username'
--   - Add 'first_name' column
--   - Add 'last_name' column
--   - Add 'deleted_at' column
--   - Change id from TEXT to INTEGER AUTOINCREMENT
--   - Change timestamps from TEXT to DATETIME

-- SQLite doesn't support renaming columns directly
-- We need to use a temporary table approach

-- Step 1: Create new table with updated schema
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT NULL,
  deleted_at DATETIME DEFAULT NULL
);

-- Step 2: Copy data from old table to new table (rename name -> username)
INSERT INTO users_new (email, username, created_at, updated_at)
SELECT email, name, created_at, updated_at FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table to users
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
