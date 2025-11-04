-- テスト用生徒アカウント作成スクリプト
-- このスクリプトをSupabase SQL Editorで実行してください

-- 1. 認証ユーザーを作成（Supabase Authテーブル）
-- 注意: この部分はSupabase Dashboardから手動で作成する必要があります
-- Authentication > Users > Add User から以下の情報で作成:
-- Email: satomata48@gmail.com
-- Password: satomata4848
-- Email Confirm: ON (メール確認をスキップ)

-- 2. 作成されたユーザーのIDを取得して、profilesテーブルにレコードを作成
-- まず、既存のユーザーIDを確認
-- SELECT id, email FROM auth.users WHERE email = 'satomata48@gmail.com';

-- 3. 以下のクエリで、上記で取得したIDを使ってプロフィールを作成
-- <USER_ID>の部分を実際のIDに置き換えてください

/*
INSERT INTO profiles (
  id,
  email,
  display_name,
  username,
  role,
  bio,
  stripe_account_status,
  stripe_onboarding_completed
) VALUES (
  '<USER_ID>',  -- auth.usersから取得したIDに置き換え
  'satomata48@gmail.com',
  'テスト生徒',
  'teststudent',
  'student',
  'テスト用の生徒アカウントです',
  'pending',
  false
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  bio = EXCLUDED.bio;
*/

-- 4. すべてのスペースに自動登録する（オプション）
-- 既存の全スペースにテスト生徒を登録

/*
INSERT INTO space_students (
  space_id,
  student_id,
  status
)
SELECT
  s.id,
  '<USER_ID>',  -- auth.usersから取得したIDに置き換え
  'active'
FROM spaces s
WHERE NOT EXISTS (
  SELECT 1 FROM space_students ss
  WHERE ss.space_id = s.id AND ss.student_id = '<USER_ID>'
);
*/

-- ====================
-- 簡易実行手順:
-- ====================
-- 1. Supabase Dashboard > Authentication > Users > Add User
--    - Email: satomata48@gmail.com
--    - Password: satomata4848
--    - Auto Confirm User: ON
--
-- 2. 作成されたユーザーのIDをコピー
--
-- 3. 以下のクエリの<USER_ID>を実際のIDに置き換えて実行
--
-- 4. ログインページで satomata48@gmail.com / satomata4848 でログイン可能

