-- Migration: Add priority field to tasks table
-- Created: 2026-01-09

-- Add priority column to tasks table with default value 'none'
ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'none';
