-- Migration: Add password_hash column to users table
-- Created: 2025-12-01

-- Add password_hash column for authentication
ALTER TABLE users ADD COLUMN password_hash TEXT;
