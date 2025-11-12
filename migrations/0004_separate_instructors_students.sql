-- Migration: Separate instructors and students into different tables
-- This migration creates new tables and migrates data from profiles table

-- 1. Create instructors table
CREATE TABLE IF NOT EXISTS instructors (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  social_links TEXT,
  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_account_status TEXT DEFAULT 'pending',
  stripe_onboarding_completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create students table (no unique email - same email can register in different spaces)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create separate session tables
CREATE TABLE IF NOT EXISTS instructor_sessions (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 4. Migrate existing data from profiles to instructors
INSERT INTO instructors (
  id, email, password_hash, username, display_name, avatar_url, bio, social_links,
  stripe_account_id, stripe_account_status, stripe_onboarding_completed,
  created_at, updated_at
)
SELECT
  id, email, password_hash, username, display_name, avatar_url, bio, social_links,
  stripe_account_id, stripe_account_status, stripe_onboarding_completed,
  created_at, updated_at
FROM profiles
WHERE role = 'instructor';

-- 5. Migrate existing data from profiles to students
INSERT INTO students (
  id, email, password_hash, display_name, avatar_url, bio,
  created_at, updated_at
)
SELECT
  id, email, password_hash, display_name, avatar_url, bio,
  created_at, updated_at
FROM profiles
WHERE role = 'student';

-- 6. Migrate sessions to instructor_sessions
INSERT INTO instructor_sessions (id, instructor_id, token, expires_at, created_at)
SELECT s.id, s.user_id, s.token, s.expires_at, s.created_at
FROM sessions s
INNER JOIN profiles p ON s.user_id = p.id
WHERE p.role = 'instructor';

-- 7. Migrate sessions to student_sessions
INSERT INTO student_sessions (id, student_id, token, expires_at, created_at)
SELECT s.id, s.user_id, s.token, s.expires_at, s.created_at
FROM sessions s
INNER JOIN profiles p ON s.user_id = p.id
WHERE p.role = 'student';

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_sessions_token ON instructor_sessions(token);
CREATE INDEX IF NOT EXISTS idx_instructor_sessions_expires ON instructor_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_student_sessions_token ON student_sessions(token);
CREATE INDEX IF NOT EXISTS idx_student_sessions_expires ON student_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_instructors_email ON instructors(email);
CREATE INDEX IF NOT EXISTS idx_instructors_username ON instructors(username);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Note: After verifying the migration works correctly, you should:
-- 1. Drop old tables: DROP TABLE sessions; DROP TABLE profiles;
-- 2. Update all foreign key references in other tables
-- For now, we keep them for safety during migration
