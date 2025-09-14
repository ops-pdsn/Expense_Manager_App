-- Migration to update users table for Supabase Auth integration
-- This removes the password column and makes the table work as a profile extension

-- First, drop the password column since Supabase Auth handles authentication
ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Update the id column to not have a default (it will be provided by Supabase Auth)
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- Make sure the table is ready for Supabase Auth integration
-- The id will be the same as auth.users.id from Supabase
