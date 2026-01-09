-- Migration: Add description field to tasks table
-- Created: 2026-01-08

-- Add description column to tasks table
ALTER TABLE tasks ADD COLUMN description TEXT;
