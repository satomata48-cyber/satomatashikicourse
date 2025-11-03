-- ステップ3: トリガー関数とデータ移行

-- 1. 更新日時を自動更新するトリガー
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

-- 2. プライマリプロフィールの制約を保証する関数
CREATE OR REPLACE FUNCTION ensure_one_primary_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
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

-- 3. 既存データの移行（既存のprofilesから講師プロフィールを作成）
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
