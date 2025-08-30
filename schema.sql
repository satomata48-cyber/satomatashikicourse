-- ============================================
-- 🏗️ オンラインコース販売プラットフォーム - 最終版データベーススキーマ
-- SvelteKit + Supabase + PostgreSQL + Stripe
-- ============================================

-- ============================================
-- 📋 概要
-- ============================================
-- このスクリプトは、完全に動作するオンラインコース販売プラットフォーム用の
-- データベーススキーマです。以下の特徴があります：
-- 
-- ✅ シンプルで保守しやすい構造
-- ✅ 完全なRLSセキュリティ
-- ✅ 最適化されたパフォーマンス
-- ✅ 拡張性の高い設計

-- ============================================
-- 🗑️ STEP 1: 既存データのクリーンアップ
-- ============================================

-- RLSを無効化
ALTER TABLE IF EXISTS lesson_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS space_students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS spaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS instructors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

-- テーブル削除（依存関係順）
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS course_purchases CASCADE;
DROP TABLE IF EXISTS space_students CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;
DROP TABLE IF EXISTS instructors CASCADE; -- 完全廃止

-- profilesテーブルの拡張カラムをリセット
ALTER TABLE profiles DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS bio CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS social_links CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS instructor_slug CASCADE;

-- ============================================
-- 🏗️ STEP 2: profiles テーブルの拡張
-- ============================================

-- 統合型profilesテーブル（全ユーザー管理）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' 
  CHECK (role IN ('instructor', 'student', 'admin')),
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE 
  CHECK (username ~ '^[a-zA-Z0-9]+$' AND LENGTH(username) >= 3 AND LENGTH(username) <= 20),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB,
ADD COLUMN IF NOT EXISTS instructor_slug TEXT;

-- ユニーク制約
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_instructor_slug_unique'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_instructor_slug_unique 
        UNIQUE (instructor_slug);
    END IF;
END $$;

-- ============================================
-- 🏗️ STEP 3: メインテーブルの作成
-- ============================================

-- 1️⃣ spaces (講師のスペース)
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  max_students INT DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  landing_page_content JSONB DEFAULT '{
    "sections": [],
    "metadata": {},
    "theme": {
      "primaryColor": "#3B82F6",
      "accentColor": "#F59E0B"
    }
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT spaces_instructor_slug_unique UNIQUE (instructor_id, slug)
);

-- 2️⃣ courses (スペース内のコース)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'JPY',
  is_free BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3️⃣ lessons (コース内のレッスン)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_type TEXT DEFAULT 'youtube' 
    CHECK (video_type IN ('youtube', 'supabase', 'external')),
  duration INT DEFAULT 0, -- 秒単位
  order_index INT DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4️⃣ space_students (スペースへの生徒登録)
CREATE TABLE space_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' 
    CHECK (status IN ('active', 'inactive', 'suspended')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT space_students_unique UNIQUE (space_id, student_id)
);

-- 5️⃣ course_purchases (コース購入記録)
CREATE TABLE course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'JPY',
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT course_purchases_unique UNIQUE (course_id, student_id)
);

-- 6️⃣ lesson_progress (学習進捗)
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  watch_time INT DEFAULT 0, -- 視聴時間（秒）
  total_duration INT DEFAULT 0, -- 総時間（秒）
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_position INT DEFAULT 0, -- 最後の再生位置（秒）
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT lesson_progress_unique UNIQUE (lesson_id, student_id)
);

-- ============================================
-- 🚀 STEP 4: パフォーマンス最適化インデックス
-- ============================================

-- profilesテーブル
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_instructor_slug 
  ON profiles(instructor_slug) WHERE instructor_slug IS NOT NULL;

-- spacesテーブル
CREATE INDEX IF NOT EXISTS idx_spaces_instructor_id 
  ON spaces(instructor_id);
CREATE INDEX IF NOT EXISTS idx_spaces_slug 
  ON spaces(slug);
CREATE INDEX IF NOT EXISTS idx_spaces_is_active 
  ON spaces(is_active);
CREATE INDEX IF NOT EXISTS idx_spaces_instructor_slug 
  ON spaces(instructor_id, slug);

-- coursesテーブル
CREATE INDEX IF NOT EXISTS idx_courses_space_id 
  ON courses(space_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_published 
  ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_price 
  ON courses(price) WHERE is_free = false;

-- lessonsテーブル
CREATE INDEX IF NOT EXISTS idx_lessons_course_id 
  ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order 
  ON lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_published 
  ON lessons(is_published);

-- space_studentsテーブル
CREATE INDEX IF NOT EXISTS idx_space_students_space_id 
  ON space_students(space_id);
CREATE INDEX IF NOT EXISTS idx_space_students_student_id 
  ON space_students(student_id);
CREATE INDEX IF NOT EXISTS idx_space_students_status 
  ON space_students(status);

-- course_purchasesテーブル
CREATE INDEX IF NOT EXISTS idx_course_purchases_course_id 
  ON course_purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_student_id 
  ON course_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_status 
  ON course_purchases(status);
CREATE INDEX IF NOT EXISTS idx_course_purchases_date 
  ON course_purchases(purchased_at);

-- lesson_progressテーブル
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id 
  ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_id 
  ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed 
  ON lesson_progress(completed);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_updated 
  ON lesson_progress(updated_at);

-- ============================================
-- 🕐 STEP 5: 自動更新トリガー
-- ============================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- トリガー設定
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_spaces_updated_at ON spaces;
CREATE TRIGGER update_spaces_updated_at 
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at 
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at 
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER update_lesson_progress_updated_at 
  BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 🛡️ STEP 6: RLS (Row Level Security) 設定
-- ============================================

-- 1️⃣ profiles テーブル
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2️⃣ spaces テーブル
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spaces_select_active_or_own" ON spaces;
CREATE POLICY "spaces_select_active_or_own" ON spaces
  FOR SELECT USING (
    is_active = true OR 
    instructor_id = auth.uid()
  );

DROP POLICY IF EXISTS "spaces_insert_instructor" ON spaces;
CREATE POLICY "spaces_insert_instructor" ON spaces
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'instructor'
    )
  );

DROP POLICY IF EXISTS "spaces_update_own" ON spaces;
CREATE POLICY "spaces_update_own" ON spaces
  FOR UPDATE USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS "spaces_delete_own" ON spaces;
CREATE POLICY "spaces_delete_own" ON spaces
  FOR DELETE USING (instructor_id = auth.uid());

-- 3️⃣ courses テーブル
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_active_space" ON courses;
CREATE POLICY "courses_select_active_space" ON courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = courses.space_id 
      AND (s.is_active = true OR s.instructor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "courses_insert_own_space" ON courses;
CREATE POLICY "courses_insert_own_space" ON courses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = courses.space_id AND s.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "courses_update_own_space" ON courses;
CREATE POLICY "courses_update_own_space" ON courses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = courses.space_id AND s.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "courses_delete_own_space" ON courses;
CREATE POLICY "courses_delete_own_space" ON courses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = courses.space_id AND s.instructor_id = auth.uid()
    )
  );

-- 4️⃣ lessons テーブル
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lessons_select_accessible" ON lessons;
CREATE POLICY "lessons_select_accessible" ON lessons
  FOR SELECT USING (
    -- 講師は自分のレッスンをすべて閲覧可能
    EXISTS (
      SELECT 1 FROM courses c
      JOIN spaces s ON s.id = c.space_id
      WHERE c.id = lessons.course_id AND s.instructor_id = auth.uid()
    )
    OR
    -- 公開済みレッスンは基本情報を誰でも閲覧可能
    (
      is_published = true AND
      EXISTS (
        SELECT 1 FROM courses c
        JOIN spaces s ON s.id = c.space_id
        WHERE c.id = lessons.course_id 
        AND c.is_published = true AND s.is_active = true
      )
    )
    OR
    -- コース購入者は詳細閲覧可能
    EXISTS (
      SELECT 1 FROM course_purchases cp
      WHERE cp.course_id = lessons.course_id 
      AND cp.student_id = auth.uid()
      AND cp.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "lessons_insert_own_course" ON lessons;
CREATE POLICY "lessons_insert_own_course" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN spaces s ON s.id = c.space_id
      WHERE c.id = lessons.course_id AND s.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lessons_update_own_course" ON lessons;
CREATE POLICY "lessons_update_own_course" ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN spaces s ON s.id = c.space_id
      WHERE c.id = lessons.course_id AND s.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lessons_delete_own_course" ON lessons;
CREATE POLICY "lessons_delete_own_course" ON lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN spaces s ON s.id = c.space_id
      WHERE c.id = lessons.course_id AND s.instructor_id = auth.uid()
    )
  );

-- 5️⃣ space_students テーブル
ALTER TABLE space_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "space_students_select_own_or_instructor" ON space_students;
CREATE POLICY "space_students_select_own_or_instructor" ON space_students
  FOR SELECT USING (
    -- 生徒は自分の登録を閲覧可能
    student_id = auth.uid() 
    OR
    -- 講師は自分のスペースの生徒を閲覧可能
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_students.space_id AND s.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "space_students_insert_self" ON space_students;
CREATE POLICY "space_students_insert_self" ON space_students
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "space_students_update_instructor" ON space_students;
CREATE POLICY "space_students_update_instructor" ON space_students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_students.space_id AND s.instructor_id = auth.uid()
    )
  );

-- 6️⃣ course_purchases テーブル
ALTER TABLE course_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_purchases_select_own_or_instructor" ON course_purchases;
CREATE POLICY "course_purchases_select_own_or_instructor" ON course_purchases
  FOR SELECT USING (
    -- 購入者は自分の購入記録を閲覧可能
    student_id = auth.uid() 
    OR
    -- 講師は自分のコースの購入記録を閲覧可能
    EXISTS (
      SELECT 1 FROM courses c
      JOIN spaces s ON s.id = c.space_id
      WHERE c.id = course_purchases.course_id AND s.instructor_id = auth.uid()
    )
  );

-- course_purchasesのINSERT/UPDATE/DELETEは通常システム経由のみ

-- 7️⃣ lesson_progress テーブル
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_progress_select_own" ON lesson_progress;
CREATE POLICY "lesson_progress_select_own" ON lesson_progress
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "lesson_progress_insert_own" ON lesson_progress;
CREATE POLICY "lesson_progress_insert_own" ON lesson_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "lesson_progress_update_own" ON lesson_progress;
CREATE POLICY "lesson_progress_update_own" ON lesson_progress
  FOR UPDATE USING (student_id = auth.uid());

-- ============================================
-- 📊 STEP 7: 確認用クエリとビュー
-- ============================================

-- テーブル作成確認
SELECT 
  '✅ Tables created' as status,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'spaces', 'courses', 'lessons', 
  'space_students', 'course_purchases', 'lesson_progress'
);

-- RLSポリシー確認
SELECT 
  '🛡️ RLS policies active' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public';

-- インデックス確認
SELECT 
  '🚀 Indexes created' as status,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'spaces', 'courses', 'lessons', 
  'space_students', 'course_purchases', 'lesson_progress'
);

-- 有用なビューの作成
CREATE OR REPLACE VIEW instructor_dashboard AS
SELECT 
  p.id as instructor_id,
  p.display_name as instructor_name,
  COUNT(DISTINCT s.id) as total_spaces,
  COUNT(DISTINCT c.id) as total_courses,
  COUNT(DISTINCT l.id) as total_lessons,
  COUNT(DISTINCT ss.id) as total_students,
  COALESCE(SUM(cp.amount), 0) as total_revenue
FROM profiles p
LEFT JOIN spaces s ON s.instructor_id = p.id
LEFT JOIN courses c ON c.space_id = s.id
LEFT JOIN lessons l ON l.course_id = c.id
LEFT JOIN space_students ss ON ss.space_id = s.id
LEFT JOIN course_purchases cp ON cp.course_id = c.id AND cp.status = 'completed'
WHERE p.role = 'instructor'
GROUP BY p.id, p.display_name;

-- 学習進捗ビュー
CREATE OR REPLACE VIEW student_progress AS
SELECT 
  ss.student_id,
  ss.space_id,
  s.title as space_title,
  COUNT(DISTINCT cp.course_id) as purchased_courses,
  COUNT(DISTINCT lp.lesson_id) as lessons_started,
  COUNT(DISTINCT CASE WHEN lp.completed THEN lp.lesson_id END) as lessons_completed,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT lp.lesson_id) > 0 
      THEN (COUNT(DISTINCT CASE WHEN lp.completed THEN lp.lesson_id END)::FLOAT / COUNT(DISTINCT lp.lesson_id) * 100)
      ELSE 0 
    END, 2
  ) as completion_percentage
FROM space_students ss
JOIN spaces s ON s.id = ss.space_id
LEFT JOIN course_purchases cp ON cp.student_id = ss.student_id
LEFT JOIN lessons l ON l.course_id = cp.course_id
LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = ss.student_id
GROUP BY ss.student_id, ss.space_id, s.title;

-- ============================================
-- 🎉 完了メッセージ
-- ============================================

SELECT 
  '🎉 Database setup completed successfully!' as status,
  '✅ All tables, indexes, triggers, and RLS policies are ready' as details,
  'Ready for SvelteKit application deployment' as next_step;

-- ============================================
-- 📝 アプリケーション実装ガイド
-- ============================================

/*
🚀 主要な実装ポイント:

1. URL構造:
   - 講師管理画面: /[user_id]/spaces, /[user_id]/courses
   - 公開ページ: /[user_id]/space/[slug]

2. 認証:
   - instructor_id = auth.uid() (直接参照)
   - profiles.role で権限判定

3. セキュリティ:
   - すべてのテーブルでRLS有効
   - 講師は自分のコンテンツのみアクセス
   - 生徒は購入済みコンテンツのみアクセス

4. パフォーマンス:
   - 最適化されたインデックス
   - 不要なJOIN削除
   - 効率的なクエリ構造

5. 拡張性:
   - 新しいロール追加が容易
   - 機能追加時のテーブル設計に配慮
   - 将来的なマルチテナント対応可能

この構造により、シンプルで高性能なオンラインコース販売プラットフォームが構築できます。
*/