-- Migration: Fix all foreign key constraints to reference instructors/students tables
-- This migration updates all tables that still reference the old profiles table

-- ===================================
-- 1. Fix spaces table
-- ===================================

-- Backup existing data
CREATE TABLE IF NOT EXISTS spaces_backup AS SELECT * FROM spaces;

-- Drop old table
DROP TABLE IF EXISTS spaces;

-- Recreate with correct foreign key
CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  max_students INTEGER,
  is_active INTEGER DEFAULT 1,
  landing_page_content TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
  UNIQUE(instructor_id, slug)
);

-- Restore data (only for instructors that exist in instructors table)
INSERT INTO spaces (id, instructor_id, title, description, slug, max_students, is_active, landing_page_content, created_at, updated_at)
SELECT s.id, s.instructor_id, s.title, s.description, s.slug, s.max_students, s.is_active, s.landing_page_content, s.created_at, s.updated_at
FROM spaces_backup s
WHERE EXISTS (SELECT 1 FROM instructors i WHERE i.id = s.instructor_id);

-- Drop backup
DROP TABLE spaces_backup;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_spaces_instructor ON spaces(instructor_id);
CREATE INDEX IF NOT EXISTS idx_spaces_slug ON spaces(slug);

-- ===================================
-- 2. Fix course_purchases table
-- ===================================

-- Backup existing data
CREATE TABLE IF NOT EXISTS course_purchases_backup AS SELECT * FROM course_purchases;

-- Drop old table
DROP TABLE IF EXISTS course_purchases;

-- Recreate with correct foreign key
CREATE TABLE course_purchases (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  amount REAL,
  currency TEXT DEFAULT 'JPY',
  status TEXT DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(course_id, student_id)
);

-- Restore data (only for students that exist in students table)
INSERT INTO course_purchases (id, course_id, student_id, amount, currency, status, stripe_session_id, stripe_payment_intent_id, purchased_at)
SELECT cp.id, cp.course_id, cp.student_id, cp.amount, cp.currency, cp.status, cp.stripe_session_id, cp.stripe_payment_intent_id, cp.purchased_at
FROM course_purchases_backup cp
WHERE EXISTS (SELECT 1 FROM students s WHERE s.id = cp.student_id);

-- Drop backup
DROP TABLE course_purchases_backup;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_purchases_course ON course_purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_purchases_student ON course_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON course_purchases(stripe_session_id);

-- ===================================
-- 3. Fix lesson_completions table
-- ===================================

-- Backup existing data
CREATE TABLE IF NOT EXISTS lesson_completions_backup AS SELECT * FROM lesson_completions;

-- Drop old table
DROP TABLE IF EXISTS lesson_completions;

-- Recreate with correct foreign key
CREATE TABLE lesson_completions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(lesson_id, student_id)
);

-- Restore data (only for students that exist in students table)
INSERT INTO lesson_completions (id, lesson_id, student_id, completed_at, created_at)
SELECT lc.id, lc.lesson_id, lc.student_id, lc.completed_at, lc.created_at
FROM lesson_completions_backup lc
WHERE EXISTS (SELECT 1 FROM students s WHERE s.id = lc.student_id);

-- Drop backup
DROP TABLE lesson_completions_backup;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_completions_lesson ON lesson_completions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_completions_student ON lesson_completions(student_id);

-- ===================================
-- 4. Drop old profiles and sessions tables (if they still exist)
-- ===================================

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS profiles;
