-- Remove title column from events table
-- Events will now get their title from the linked task

-- SQLite doesn't support DROP COLUMN directly in older versions,
-- but D1 uses a recent SQLite that does support it
ALTER TABLE events DROP COLUMN title;
