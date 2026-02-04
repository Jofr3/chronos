-- Migration: Add preferred_start_time to tasks table
-- Description: Adds a preferred_start_time column to allow users to specify their preferred time for scheduling tasks

ALTER TABLE tasks ADD COLUMN preferred_start_time TEXT;
