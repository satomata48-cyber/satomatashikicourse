-- ステップ2: RLSポリシー作成

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
