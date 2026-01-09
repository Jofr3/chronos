-- Migration: Add duration field to tasks table
-- Created: 2026-01-09

-- Add duration column to tasks table (in minutes)
ALTER TABLE tasks ADD COLUMN duration INTEGER;
