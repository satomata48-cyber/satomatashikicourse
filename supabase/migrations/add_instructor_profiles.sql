-- 複数講師プロフィール管理のための新テーブル作成

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
CREATE INDEX idx_instructor_profiles_user_id ON instructor_profiles(user_id);
CREATE INDEX idx_instructor_profiles_username ON instructor_profiles(username);
CREATE UNIQUE INDEX idx_instructor_profiles_primary ON instructor_profiles(user_id) WHERE is_primary = true;

-- 3. RLSポリシー有効化
ALTER TABLE instructor_profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー作成

-- 全員が閲覧可能（公開プロフィール）
CREATE POLICY "Anyone can view active instructor profiles"
ON instructor_profiles FOR SELECT
TO public
USING (is_active = true);

-- 自分の講師プロフィールは全て閲覧可能
CREATE POLICY "Users can view their own instructor profiles"
ON instructor_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 自分の講師プロフィールを作成可能
CREATE POLICY "Users can create their own instructor profiles"
ON instructor_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 自分の講師プロフィールを更新可能
CREATE POLICY "Users can update their own instructor profiles"
ON instructor_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 自分の講師プロフィールを削除可能
CREATE POLICY "Users can delete their own instructor profiles"
ON instructor_profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. 既存データの移行（既存のprofilesから講師プロフィールを作成）
INSERT INTO instructor_profiles (user_id, display_name, username, avatar_url, bio, social_links, is_active, is_primary, created_at, updated_at)
SELECT
    id,
    COALESCE(display_name, 'Instructor'),
    username,
    avatar_url,
    bio,
    COALESCE(social_links, '{}'),
    true,
    true,
    created_at,
    updated_at
FROM profiles
WHERE role = 'instructor'
ON CONFLICT (username) DO NOTHING;

-- 6. spacesテーブルのinstructor_idをそのまま使用（既存の構造と互換性維持）
-- instructor_profilesとの関連は、instructor_profiles.user_id = spaces.instructor_id で照合

-- 7. 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_instructor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_instructor_profiles_updated_at
    BEFORE UPDATE ON instructor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_instructor_profiles_updated_at();

-- 8. プライマリプロフィールの制約を保証する関数
CREATE OR REPLACE FUNCTION ensure_one_primary_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        -- 同じuser_idの他のプロフィールのis_primaryをfalseに設定
        UPDATE instructor_profiles
        SET is_primary = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_one_primary_profile
    BEFORE INSERT OR UPDATE ON instructor_profiles
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION ensure_one_primary_profile();
