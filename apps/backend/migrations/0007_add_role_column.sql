-- Migration: Add role column to users table
-- Created: 2025-12-02

-- Add role column with default value 'user'
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'developer'));

-- Create index on role for faster filtering
CREATE INDEX idx_users_role ON users(role);
