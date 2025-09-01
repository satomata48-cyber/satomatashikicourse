-- Stripe統合のためのデータベース拡張（最終版）

-- 1. profilesテーブルにStripe Connect情報を追加
DO $$ 
BEGIN
    -- stripe_account_id カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'stripe_account_id') THEN
        ALTER TABLE profiles ADD COLUMN stripe_account_id TEXT;
        RAISE NOTICE 'Added stripe_account_id column to profiles';
    ELSE
        RAISE NOTICE 'stripe_account_id column already exists in profiles';
    END IF;

    -- stripe_account_status カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'stripe_account_status') THEN
        ALTER TABLE profiles ADD COLUMN stripe_account_status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added stripe_account_status column to profiles';
    ELSE
        RAISE NOTICE 'stripe_account_status column already exists in profiles';
    END IF;

    -- stripe_onboarding_completed カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'stripe_onboarding_completed') THEN
        ALTER TABLE profiles ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added stripe_onboarding_completed column to profiles';
    ELSE
        RAISE NOTICE 'stripe_onboarding_completed column already exists in profiles';
    END IF;
END $$;

-- 2. coursesテーブルにStripe商品情報を追加
DO $$ 
BEGIN
    -- stripe_product_id カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'courses' AND column_name = 'stripe_product_id') THEN
        ALTER TABLE courses ADD COLUMN stripe_product_id TEXT;
        RAISE NOTICE 'Added stripe_product_id column to courses';
    ELSE
        RAISE NOTICE 'stripe_product_id column already exists in courses';
    END IF;

    -- stripe_price_id カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'courses' AND column_name = 'stripe_price_id') THEN
        ALTER TABLE courses ADD COLUMN stripe_price_id TEXT;
        RAISE NOTICE 'Added stripe_price_id column to courses';
    ELSE
        RAISE NOTICE 'stripe_price_id column already exists in courses';
    END IF;

    -- stripe_payment_link カラム追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'courses' AND column_name = 'stripe_payment_link') THEN
        ALTER TABLE courses ADD COLUMN stripe_payment_link TEXT;
        RAISE NOTICE 'Added stripe_payment_link column to courses';
    ELSE
        RAISE NOTICE 'stripe_payment_link column already exists in courses';
    END IF;
END $$;

-- 3. Stripe Webhookイベントログテーブル
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_name = 'stripe_webhook_events') THEN
        CREATE TABLE stripe_webhook_events (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          stripe_event_id TEXT UNIQUE NOT NULL,
          event_type TEXT NOT NULL,
          data JSONB,
          processed BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Created stripe_webhook_events table';
    ELSE
        RAISE NOTICE 'stripe_webhook_events table already exists';
    END IF;
END $$;

-- 4. インデックスの追加
CREATE INDEX IF NOT EXISTS idx_courses_stripe_product ON courses(stripe_product_id) WHERE stripe_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_webhook_events(processed, created_at);

-- 5. RLSポリシーの追加（既存チェック付き）
DO $$
BEGIN
    -- profilesのStripe情報更新ポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies 
                  WHERE tablename = 'profiles' 
                  AND policyname = 'users_update_own_stripe_info') THEN
        CREATE POLICY "users_update_own_stripe_info" ON profiles
          FOR UPDATE USING (id = auth.uid())
          WITH CHECK (id = auth.uid());
        RAISE NOTICE 'Created users_update_own_stripe_info policy';
    ELSE
        RAISE NOTICE 'users_update_own_stripe_info policy already exists';
    END IF;

    -- coursesのStripe設定更新ポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies 
                  WHERE tablename = 'courses' 
                  AND policyname = 'instructors_update_course_stripe') THEN
        CREATE POLICY "instructors_update_course_stripe" ON courses
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM spaces 
              WHERE spaces.id = courses.space_id 
              AND spaces.instructor_id = auth.uid()
            )
          );
        RAISE NOTICE 'Created instructors_update_course_stripe policy';
    ELSE
        RAISE NOTICE 'instructors_update_course_stripe policy already exists';
    END IF;
END $$;

-- 6. stripe_webhook_eventsテーブルのRLS設定
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- サービスロールアクセスポリシー（既存チェック付き）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies 
                  WHERE tablename = 'stripe_webhook_events' 
                  AND policyname = 'service_role_webhook_access') THEN
        CREATE POLICY "service_role_webhook_access" ON stripe_webhook_events
          FOR ALL USING (auth.role() = 'service_role');
        RAISE NOTICE 'Created service_role_webhook_access policy';
    ELSE
        RAISE NOTICE 'service_role_webhook_access policy already exists';
    END IF;
END $$;

-- 7. コメント追加
COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connect アカウントID';
COMMENT ON COLUMN profiles.stripe_account_status IS 'Stripeアカウントステータス: pending, active, restricted';
COMMENT ON COLUMN profiles.stripe_onboarding_completed IS 'Stripeオンボーディング完了フラグ';
COMMENT ON COLUMN courses.stripe_product_id IS 'Stripe商品ID';
COMMENT ON COLUMN courses.stripe_price_id IS 'Stripe価格ID';
COMMENT ON COLUMN courses.stripe_payment_link IS 'Stripe Payment Link URL';
COMMENT ON TABLE stripe_webhook_events IS 'Stripe Webhookイベントログ';

-- 完了メッセージ
SELECT '🎉 Stripe integration database setup completed successfully!' as status;