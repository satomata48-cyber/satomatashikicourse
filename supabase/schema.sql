-- 1. ユーザープロファイル（Supabase Auth拡張）
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  role text CHECK (role IN ('instructor', 'student', 'admin')) NOT NULL DEFAULT 'student',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 講師詳細
CREATE TABLE instructors (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio text,
  profile_image_url text,
  stripe_account_id text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. スペース
CREATE TABLE spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid REFERENCES instructors(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  slug text NOT NULL CHECK (slug ~ '^[a-zA-Z0-9_-]+$'),
  landing_page_content jsonb DEFAULT '{"sections": [], "metadata": {}, "theme": {"primaryColor": "#3B82F6", "accentColor": "#F59E0B"}}'::jsonb,
  is_active boolean DEFAULT true,
  max_students integer DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(instructor_id, slug)
);

-- 4. コース
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  slug text NOT NULL CHECK (slug ~ '^[a-zA-Z0-9_-]+$'),
  course_page_content jsonb DEFAULT '{"sections": [], "metadata": {}}'::jsonb,
  is_free boolean DEFAULT true,
  price decimal(10,2) DEFAULT 0,
  currency text DEFAULT 'JPY' CHECK (currency IN ('JPY', 'USD')),
  stripe_price_id text,
  stripe_payment_link text,
  is_published boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  estimated_duration_hours integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(space_id, slug)
);

-- 5. レッスン
CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  slug text NOT NULL CHECK (slug ~ '^[a-zA-Z0-9_-]+$'),
  video_type text CHECK (video_type IN ('supabase', 'youtube')) NOT NULL,
  video_url text NOT NULL,
  video_duration_seconds integer NOT NULL,
  thumbnail_url text,
  content jsonb DEFAULT '{"sections": [], "metadata": {}}'::jsonb,
  completion_threshold decimal(3,2) DEFAULT 0.8,
  sort_order integer DEFAULT 0,
  is_published boolean DEFAULT false,
  is_preview boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(course_id, slug)
);

-- 6. スペース生徒登録
CREATE TABLE space_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  status text CHECK (status IN ('active', 'suspended', 'completed')) DEFAULT 'active',
  notes text,
  UNIQUE(user_id)
);

-- 7. コース購入履歴
CREATE TABLE course_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  stripe_payment_intent_id text UNIQUE,
  stripe_session_id text,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  purchased_at timestamptz DEFAULT now(),
  refunded_at timestamptz,
  UNIQUE(user_id, course_id)
);

-- 8. 学習進捗
CREATE TABLE lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES space_students(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES course_purchases(id) ON DELETE CASCADE,
  watch_time_seconds integer DEFAULT 0,
  last_position_seconds integer DEFAULT 0,
  completion_percentage decimal(5,2) DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  first_watched_at timestamptz DEFAULT now(),
  last_watched_at timestamptz DEFAULT now(),
  total_sessions integer DEFAULT 1,
  UNIQUE(student_id, lesson_id)
);

-- 9. テンプレート管理
CREATE TABLE page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_type text CHECK (template_type IN ('space', 'course')) NOT NULL,
  template_data jsonb NOT NULL,
  preview_image_url text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- インデックス作成
CREATE INDEX idx_spaces_instructor ON spaces(instructor_id);
CREATE INDEX idx_spaces_slug ON spaces(slug);
CREATE INDEX idx_courses_space ON courses(space_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_space_students_user ON space_students(user_id);
CREATE INDEX idx_space_students_space ON space_students(space_id);
CREATE INDEX idx_lesson_progress_student_lesson ON lesson_progress(student_id, lesson_id);
CREATE INDEX idx_course_purchases_user ON course_purchases(user_id);

-- RLS有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "プロファイル本人のみ" ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "講師情報本人のみ" ON instructors FOR ALL USING (auth.uid() = id);

CREATE POLICY "スペース講師管理" ON spaces FOR ALL USING (instructor_id = auth.uid());
CREATE POLICY "スペース公開閲覧" ON spaces FOR SELECT USING (true);

CREATE POLICY "コース講師管理" ON courses FOR ALL USING (
  EXISTS(SELECT 1 FROM spaces WHERE id = courses.space_id AND instructor_id = auth.uid())
);
CREATE POLICY "コース購入者閲覧" ON courses FOR SELECT USING (
  is_published = true AND (
    is_free = true OR 
    EXISTS(SELECT 1 FROM course_purchases WHERE user_id = auth.uid() AND course_id = courses.id AND status = 'completed')
  )
);

CREATE POLICY "レッスン講師管理" ON lessons FOR ALL USING (
  EXISTS(
    SELECT 1 FROM courses c 
    JOIN spaces s ON s.id = c.space_id 
    WHERE c.id = lessons.course_id AND s.instructor_id = auth.uid()
  )
);
CREATE POLICY "レッスン購入者閲覧" ON lessons FOR SELECT USING (
  is_published = true AND (
    is_preview = true OR
    EXISTS(
      SELECT 1 FROM courses c
      JOIN course_purchases cp ON cp.course_id = c.id
      WHERE c.id = lessons.course_id 
      AND cp.user_id = auth.uid() 
      AND cp.status = 'completed'
    )
  )
);

CREATE POLICY "生徒登録本人のみ" ON space_students FOR ALL USING (user_id = auth.uid());

CREATE POLICY "購入履歴本人のみ" ON course_purchases FOR ALL USING (user_id = auth.uid());

CREATE POLICY "学習進捗本人のみ" ON lesson_progress FOR ALL USING (
  EXISTS(SELECT 1 FROM space_students WHERE id = lesson_progress.student_id AND user_id = auth.uid())
);