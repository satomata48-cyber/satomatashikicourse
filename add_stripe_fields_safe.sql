-- Stripe統合のためのデータベース拡張（安全版）

-- 1. profilesテーブルにStripe Connect情報を追加
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'stripe_account_id') THEN
        ALTER TABLE profiles ADD COLUMN stripe_account_id TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'stripe_account_status') THEN
        ALTER TABLE profiles ADD COLUMN stripe_account_status TEXT DEFAULT 'pending';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'stripe_onboarding_completed') THEN
        ALTER TABLE profiles ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. coursesテーブルにStripe商品情報を追加
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'courses' AND column_name = 'stripe_product_id') THEN
        ALTER TABLE courses ADD COLUMN stripe_product_id TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'courses' AND column_name = 'stripe_price_id') THEN
        ALTER TABLE courses ADD COLUMN stripe_price_id TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'courses' AND column_name = 'stripe_payment_link') THEN
        ALTER TABLE courses ADD COLUMN stripe_payment_link TEXT;
    END IF;
END $$;

-- 3. Stripe Webhookイベントログテーブル
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. インデックスの追加（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_courses_stripe_product ON courses(stripe_product_id) WHERE stripe_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_webhook_events(processed, created_at);

-- 5. RLSポリシーの追加（既存の場合は削除してから再作成）
-- profilesのStripe情報更新ポリシー
DROP POLICY IF EXISTS "users_update_own_stripe_info" ON profiles;
CREATE POLICY "users_update_own_stripe_info" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- coursesのStripe設定更新ポリシー
DROP POLICY IF EXISTS "instructors_update_course_stripe" ON courses;
CREATE POLICY "instructors_update_course_stripe" ON courses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = courses.space_id 
      AND spaces.instructor_id = auth.uid()
    )
  );

-- stripe_webhook_eventsテーブルのRLS設定
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- サービスロールのみがWebhookイベントにアクセス可能
CREATE POLICY "service_role_webhook_access" ON stripe_webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- 6. コメント追加
COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connect アカウントID';
COMMENT ON COLUMN profiles.stripe_account_status IS 'Stripeアカウントステータス: pending, active, restricted';
COMMENT ON COLUMN profiles.stripe_onboarding_completed IS 'Stripeオンボーディング完了フラグ';
COMMENT ON COLUMN courses.stripe_product_id IS 'Stripe商品ID';
COMMENT ON COLUMN courses.stripe_price_id IS 'Stripe価格ID';
COMMENT ON COLUMN courses.stripe_payment_link IS 'Stripe Payment Link URL';
COMMENT ON TABLE stripe_webhook_events IS 'Stripe Webhookイベントログ';

-- 完了メッセージ
SELECT 'Stripe fields and policies have been successfully added or updated!' as status;