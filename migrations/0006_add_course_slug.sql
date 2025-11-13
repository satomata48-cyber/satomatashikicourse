-- Migration: Add slug column to courses table for SEO-friendly URLs

-- 1. Add slug column to courses table
ALTER TABLE courses ADD COLUMN slug TEXT;

-- 2. Create unique index on space_id and slug combination
-- This allows the same slug in different spaces, but ensures uniqueness within a space
CREATE UNIQUE INDEX idx_courses_space_slug ON courses(space_id, slug) WHERE slug IS NOT NULL;

-- 3. Create index for slug lookups
CREATE INDEX idx_courses_slug ON courses(slug) WHERE slug IS NOT NULL;
