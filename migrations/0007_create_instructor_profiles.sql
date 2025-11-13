-- Create instructor_profiles table for public profile information
-- This allows for future expansion to multiple profiles per instructor

CREATE TABLE IF NOT EXISTS instructor_profiles (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  social_links TEXT, -- JSON
  is_primary INTEGER DEFAULT 1, -- 将来の拡張用
  is_active INTEGER DEFAULT 1, -- 将来の拡張用
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
);

CREATE INDEX idx_instructor_profiles_instructor ON instructor_profiles(instructor_id);
CREATE INDEX idx_instructor_profiles_primary ON instructor_profiles(instructor_id, is_primary);
