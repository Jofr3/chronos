-- Add scheduling fields to tasks table
ALTER TABLE tasks ADD COLUMN due_date TEXT;
ALTER TABLE tasks ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN recurring_days TEXT;

-- recurring_days stores a JSON array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
-- Example: "[1,3,5]" means Monday, Wednesday, Friday
