-- ステップ1: テーブル作成とインデックス

-- 1. instructor_profiles テーブル作成
CREATE TABLE IF NOT EXISTS instructor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    social_links JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. インデックス作成
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_user_id ON instructor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_username ON instructor_profiles(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_profiles_primary ON instructor_profiles(user_id) WHERE is_primary = true;

-- 3. RLSポリシー有効化
ALTER TABLE instructor_profiles ENABLE ROW LEVEL SECURITY;
