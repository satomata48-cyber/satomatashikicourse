// ローカルデータベース初期化スクリプト
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'local.db');

console.log('=== ローカルデータベース初期化 ===');
console.log('データベースパス:', dbPath);

const db = new Database(dbPath);

// WALモードと外部キー制約を有効化
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('\n[1] スキーマを作成中...');

// スキーマ作成
const schema = `
-- 1. profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  display_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  bio TEXT,
  social_links TEXT,
  stripe_account_id TEXT,
  stripe_account_status TEXT DEFAULT 'pending',
  stripe_onboarding_completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON profiles(stripe_account_id);

-- 2. spaces table
CREATE TABLE IF NOT EXISTS spaces (
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
  FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(instructor_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_spaces_instructor ON spaces(instructor_id);
CREATE INDEX IF NOT EXISTS idx_spaces_slug ON spaces(slug);

-- 3. courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT,
  price REAL,
  currency TEXT DEFAULT 'JPY',
  is_free INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  course_page_content TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  stripe_payment_link TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_courses_space ON courses(space_id);
CREATE INDEX IF NOT EXISTS idx_courses_stripe_product ON courses(stripe_product_id);

-- 4. lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  video_type TEXT,
  duration INTEGER,
  order_index INTEGER NOT NULL,
  is_published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);

-- 5. space_students table
CREATE TABLE IF NOT EXISTS space_students (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(space_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_space_students_space ON space_students(space_id);
CREATE INDEX IF NOT EXISTS idx_space_students_student ON space_students(student_id);

-- 6. course_purchases table
CREATE TABLE IF NOT EXISTS course_purchases (
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
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_course ON course_purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_purchases_student ON course_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON course_purchases(stripe_session_id);

-- 7. lesson_completions table
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

CREATE INDEX IF NOT EXISTS idx_completions_lesson ON lesson_completions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_completions_student ON lesson_completions(student_id);

-- 8. stripe_webhook_events table
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data TEXT,
  processed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);

-- 9. sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 10. password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
`;

db.exec(schema);
console.log('✓ スキーマ作成完了');

console.log('\n[2] D1データベースからデータを取得中...');
console.log('※ 本番D1データベースからデータをエクスポートして手動でインポートしてください');
console.log('   または、新しいテストユーザーを作成してください\n');

console.log('=== 初期化完了 ===');
console.log('データベースファイル:', dbPath);
console.log('\n次のステップ:');
console.log('1. テストユーザーを作成: node create-test-user.js');
console.log('2. 開発サーバー起動: npm run dev\n');

db.close();
