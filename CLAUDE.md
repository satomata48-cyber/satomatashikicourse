# SvelteKit オンラインコース販売プラットフォーム

## 📋 プロジェクト概要
- **技術スタック**: SvelteKit + TypeScript + Supabase + PostgreSQL + Stripe
- **認証**: Supabase Auth (統一認証・パスワードリセット機能付き)
- **決済**: Stripe Connect + Checkout Session
- **権限管理**: RLS (Row Level Security)
- **スタイリング**: Tailwind CSS
- **状態管理**: Svelte stores + SvelteKit load functions

## 🗄️ データベース構造

```sql
-- 1. profiles（全ユーザー管理）
profiles {
  id: UUID (PK, auth.users.id参照)
  email: TEXT
  display_name: TEXT
  username: TEXT UNIQUE (英数字3-20文字)
  avatar_url: TEXT
  role: TEXT ('instructor' | 'student')
  bio: TEXT
  social_links: JSONB
  -- Stripe Connect関連
  stripe_account_id: TEXT
  stripe_account_status: TEXT DEFAULT 'pending'
  stripe_onboarding_completed: BOOLEAN DEFAULT false
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

-- 2. spaces（講師のスペース）
spaces {
  id: UUID (PK)
  instructor_id: UUID (profiles.id参照)
  title: TEXT
  description: TEXT
  slug: TEXT
  max_students: INT
  is_active: BOOLEAN
  landing_page_content: JSONB
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  
  UNIQUE(instructor_id, slug)
}

-- 3. courses（コース）
courses {
  id: UUID (PK)
  space_id: UUID (spaces.id参照)
  title: TEXT
  description: TEXT
  price: DECIMAL
  currency: TEXT
  is_free: BOOLEAN
  is_published: BOOLEAN
  thumbnail_url: TEXT
  -- Stripe商品情報
  stripe_product_id: TEXT
  stripe_price_id: TEXT
  stripe_payment_link: TEXT
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

-- 4. lessons（レッスン）
lessons {
  id: UUID (PK)
  course_id: UUID (courses.id参照)
  title: TEXT
  description: TEXT
  content: TEXT
  video_url: TEXT
  video_type: TEXT ('youtube', 'supabase', 'external')
  duration: INT
  order_index: INT
  is_published: BOOLEAN
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

-- 5. space_students（生徒登録）
space_students {
  id: UUID (PK)
  space_id: UUID (spaces.id参照)
  student_id: UUID (profiles.id参照)
  status: TEXT ('active' | 'inactive' | 'suspended')
  enrolled_at: TIMESTAMPTZ
  
  UNIQUE(space_id, student_id)
}

-- 6. course_purchases（購入記録）
course_purchases {
  id: UUID (PK)
  course_id: UUID (courses.id参照)
  student_id: UUID (profiles.id参照)
  amount: DECIMAL
  currency: TEXT
  status: TEXT ('pending' | 'completed' | 'failed' | 'refunded')
  stripe_session_id: TEXT
  stripe_payment_intent_id: TEXT
  purchased_at: TIMESTAMPTZ
  
  UNIQUE(course_id, student_id)
}

-- 7. lesson_completions（レッスン完了トラッキング）
lesson_completions {
  id: UUID (PK)
  lesson_id: UUID (lessons.id参照)
  student_id: UUID (profiles.id参照)
  completed_at: TIMESTAMPTZ DEFAULT NOW()
  created_at: TIMESTAMPTZ DEFAULT NOW()
  
  UNIQUE(lesson_id, student_id)
}

-- 8. stripe_webhook_events（Webhookイベントログ）
stripe_webhook_events {
  id: UUID (PK)
  stripe_event_id: TEXT UNIQUE NOT NULL
  event_type: TEXT NOT NULL
  data: JSONB
  processed: BOOLEAN DEFAULT false
  created_at: TIMESTAMPTZ DEFAULT NOW()
}
```

## 🛤️ URL構造

```
src/routes/
├── +page.svelte                              # トップページ
├── login/+page.svelte                        # ログイン
├── logout/+page.svelte                       # ログアウト
├── forgot-password/+page.svelte              # パスワードリセット申請
├── reset-password/+page.svelte               # パスワード再設定
├── profile/setup/+page.svelte                # プロフィール設定
├── instructor/register/+page.svelte          # 講師登録
├── purchase/success/+page.svelte             # 購入成功ページ
│
├── api/                                      # APIエンドポイント
│   └── stripe/
│       ├── create-product/+server.ts         # Stripe商品作成
│       ├── create-checkout/+server.ts        # チェックアウトセッション作成
│       └── webhook/+server.ts                # Webhookハンドラー
│
├── [username]/                               # 講師管理画面
│   ├── dashboard/+page.svelte                # ダッシュボード
│   ├── spaces/
│   │   ├── +page.svelte                      # スペース一覧（削除機能付き）
│   │   ├── create/+page.svelte               # スペース作成
│   │   └── [slug]/
│   │       ├── +page.svelte                  # スペース詳細
│   │       ├── edit/+page.svelte             # スペース編集
│   │       ├── page-editor/+page.svelte      # ランディングページ編集
│   │       └── students/+page.svelte         # 生徒管理
│   └── courses/
│       ├── +page.svelte                      # コース一覧
│       ├── create/+page.svelte               # コース作成
│       └── [id]/
│           ├── edit/+page.svelte             # コース編集（権限チェック付き）
│           ├── pricing/+page.svelte          # 料金・Stripe設定
│           └── lessons/+page.svelte          # レッスン管理
│
└── [username]/space/[slug]/                  # 公開・生徒エリア
    ├── +page.svelte                          # スペースランディングページ
    ├── enroll/+page.svelte                   # 生徒登録
    ├── student/                              # 生徒認証エリア
    │   ├── +page.svelte                      # 生徒ダッシュボード
    │   ├── courses/+page.svelte              # コース一覧（購入ステータス・フィルター付き）
    │   └── course/[id]/+page.svelte          # レッスン視聴・完了トラッキング
    └── course/[id]/
        ├── +page.svelte                      # コース詳細（公開）
        └── purchase/+page.svelte             # Stripe購入ページ
```

## 🎓 主要機能

### ✅ 認証・アカウント機能
- **パスワードリセット**: メール経由でのパスワード再設定
- **ロール管理**: 講師・生徒の明確な権限分離
- **プロフィール管理**: username ベースのURL構造

### ✅ 講師機能
- **スペース管理**: 
  - 作成・編集・削除（カスケード削除対応）
  - ランディングページカスタマイズ
- **コース管理**: 
  - 作成・編集・削除
  - 価格設定・Stripe商品連携
  - 公開/非公開管理
- **レッスン管理**: 
  - 動画アップロード（YouTube対応）
  - コンテンツ作成・順序管理
- **生徒管理**: 登録生徒一覧・ステータス管理
- **ダッシュボード**: 売上・統計・活動概要

### ✅ 生徒機能
- **コース閲覧・購入**: 
  - コース一覧フィルター（全て/購入済み/無料/未購入）
  - Stripeチェックアウトフロー
  - 購入済みステータス表示
- **学習機能**: 
  - 2カラム学習ページ（左:レッスン一覧、右:動画・内容）
  - レッスン完了トラッキング
  - 進捗管理（チェックマーク・完了率）
  - 復習機能（完了後も視聴可能）

### ✅ 決済機能（Stripe）
- **Stripe Connect**: 講師アカウント連携
- **商品管理**: 自動商品・価格作成
- **チェックアウト**: セキュアな決済フロー
- **Webhook処理**: 
  - 決済完了通知
  - 購入ステータス自動更新
- **セキュリティ**: 
  - 講師自身のコース購入防止
  - 生徒認証チェック

## 🔐 セキュリティ・権限管理

### RLSポリシー実装
- **profiles**: 
  - 全員閲覧可、自分のみ更新
  - Stripe情報は本人のみ更新可
- **spaces**: アクティブなら全員閲覧、所有者のみ更新
- **courses/lessons**: 
  - 公開なら閲覧可、所有者のみ更新
  - Stripe設定は講師のみ
- **course_purchases**: 関係者のみアクセス
- **stripe_webhook_events**: サービスロールのみ

### 権限チェック実装箇所
- コース編集: `supabase.auth.getUser()`による所有者確認
- 購入フロー: 講師/生徒ロール確認
- 削除操作: カスケード削除対応

## 🚀 セットアップ手順

### 1. 環境変数設定
```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Supabaseデータベース設定
```bash
# SQLファイルを実行
add_stripe_fields_final.sql  # Stripe統合フィールド追加
cascade_delete.sql           # カスケード削除設定
```

### 3. Stripe設定
- Stripe Connectアカウント作成
- Webhook エンドポイント設定: `/api/stripe/webhook`
- イベント設定: `checkout.session.completed`

### 4. 開発サーバー起動
```bash
npm install
npm run dev
```

## 📈 技術的特徴

### パフォーマンス最適化
- **楽観的更新**: UI即座反映
- **インデックス最適化**: 
  - `idx_courses_stripe_product`
  - `idx_profiles_stripe_account`
  - `idx_stripe_events_processed`
- **リアクティブ状態管理**: Svelte stores活用

### エラーハンドリング
- 詳細なエラーログ出力
- ユーザーフレンドリーなエラーメッセージ
- 権限エラーの適切な処理

### ユーザビリティ
- **username URL**: `/{username}/dashboard`
- **即座フィードバック**: ボタンクリック→即座UI更新
- **視覚的進捗**: チェックマーク・完了率・購入済みバッジ
- **フィルタリング**: コース一覧の多様な表示オプション

## 🎉 実装済み機能

**完全に動作するオンラインコース販売プラットフォーム**

✅ **認証システム**: ログイン・パスワードリセット・ロール管理  
✅ **講師機能**: コンテンツ作成・管理・販売・生徒管理  
✅ **生徒機能**: コース購入・学習・進捗トラッキング  
✅ **決済システム**: Stripe完全統合・セキュアな購入フロー  
✅ **セキュリティ**: RLS・権限管理・エラーハンドリング

**最新の更新**:
- パスワードリセット機能追加
- コース削除のカスケード対応
- 権限エラー修正（`auth.getUser()`使用）
- Stripe決済完全統合
- 購入ステータストラッキング
- コース一覧フィルタリング機能