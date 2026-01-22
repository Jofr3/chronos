-- Add deleted_at column for soft delete support
ALTER TABLE tasks ADD COLUMN deleted_at TEXT;
