-- Cloudflare D1 Migration: Initial Schema
-- Converted from PostgreSQL to SQLite

-- 1. profiles table (全ユーザー管理)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, -- UUID as TEXT
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  username TEXT UNIQUE, -- 英数字3-20文字
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student', -- 'instructor' | 'student'
  bio TEXT,
  social_links TEXT, -- JSON as TEXT
  -- Stripe Connect関連
  stripe_account_id TEXT,
  stripe_account_status TEXT DEFAULT 'pending',
  stripe_onboarding_completed INTEGER DEFAULT 0, -- BOOLEAN as INTEGER (0/1)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_stripe_account ON profiles(stripe_account_id);

-- 2. spaces table (講師のスペース)
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  max_students INTEGER,
  is_active INTEGER DEFAULT 1, -- BOOLEAN as INTEGER
  landing_page_content TEXT, -- JSON as TEXT
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(instructor_id, slug)
);

CREATE INDEX idx_spaces_instructor ON spaces(instructor_id);
CREATE INDEX idx_spaces_slug ON spaces(slug);

-- 3. courses table (コース)
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL, -- DECIMAL as REAL
  currency TEXT DEFAULT 'JPY',
  is_free INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  -- Stripe商品情報
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  stripe_payment_link TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_courses_space ON courses(space_id);
CREATE INDEX idx_courses_stripe_product ON courses(stripe_product_id);

-- 4. lessons table (レッスン)
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  video_type TEXT, -- 'youtube', 'external'
  duration INTEGER,
  order_index INTEGER NOT NULL,
  is_published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_lessons_order ON lessons(course_id, order_index);

-- 5. space_students table (生徒登録)
CREATE TABLE IF NOT EXISTS space_students (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active' | 'inactive' | 'suspended'
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(space_id, student_id)
);

CREATE INDEX idx_space_students_space ON space_students(space_id);
CREATE INDEX idx_space_students_student ON space_students(student_id);

-- 6. course_purchases table (購入記録)
CREATE TABLE IF NOT EXISTS course_purchases (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  amount REAL,
  currency TEXT DEFAULT 'JPY',
  status TEXT DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'refunded'
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(course_id, student_id)
);

CREATE INDEX idx_purchases_course ON course_purchases(course_id);
CREATE INDEX idx_purchases_student ON course_purchases(student_id);
CREATE INDEX idx_purchases_stripe_session ON course_purchases(stripe_session_id);

-- 7. lesson_completions table (レッスン完了トラッキング)
CREATE TABLE IF NOT EXISTS lesson_completions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(lesson_id, student_id)
);

CREATE INDEX idx_completions_lesson ON lesson_completions(lesson_id);
CREATE INDEX idx_completions_student ON lesson_completions(student_id);

-- 8. stripe_webhook_events table (Webhookイベントログ)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data TEXT, -- JSON as TEXT
  processed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX idx_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);

-- 9. sessions table (認証セッション - 講師/生徒共通セッション)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- 10. password_resets table (パスワードリセット)
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_email ON password_resets(email);
