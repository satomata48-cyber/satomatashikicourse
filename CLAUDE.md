# SvelteKit オンラインコース販売プラットフォーム

## 📋 プロジェクト概要
- **技術スタック**: SvelteKit + TypeScript + Supabase + PostgreSQL + Stripe
- **認証**: Supabase Auth (統一認証)
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
```

## 🛤️ URL構造

```
src/routes/
├── +page.svelte                              # トップページ
├── login/+page.svelte                        # ログイン
├── logout/+page.svelte                       # ログアウト
├── profile/setup/+page.svelte                # プロフィール設定
├── instructor/register/+page.svelte          # 講師登録
│
├── [username]/                               # 講師管理画面
│   ├── dashboard/+page.svelte                # ダッシュボード
│   ├── spaces/
│   │   ├── +page.svelte                      # スペース一覧
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
│           ├── edit/+page.svelte             # コース編集
│           └── lessons/+page.svelte          # レッスン管理
│
└── [username]/space/[slug]/                  # 公開・生徒エリア
    ├── +page.svelte                          # スペースランディングページ
    ├── enroll/+page.svelte                   # 生徒登録
    ├── student/                              # 生徒認証エリア
    │   ├── +page.svelte                      # 生徒ダッシュボード
    │   ├── courses/+page.svelte              # 受講中コース一覧
    │   └── course/[id]/+page.svelte          # レッスン視聴・完了トラッキング
    └── course/[id]/
        ├── +page.svelte                      # コース詳細（公開）
        └── purchase/+page.svelte             # 購入ページ
```

## 🎓 主要機能

### ✅ 講師機能
- **アカウント管理**: username ベース認証・プロフィール管理
- **スペース管理**: 作成・編集・ランディングページカスタマイズ
- **コース管理**: 作成・編集・価格設定・公開管理
- **レッスン管理**: 動画アップロード・コンテンツ作成・順序管理
- **生徒管理**: 登録生徒一覧・ステータス管理
- **ダッシュボード**: 売上・統計・活動概要

### ✅ 生徒機能
- **アカウント管理**: 簡単登録・プロフィール設定
- **スペース閲覧**: ランディングページ・コース一覧
- **コース購入**: Stripe決済統合・即座アクセス
- **学習機能**: 
  - **2カラム学習ページ**: 左側レッスン一覧、右側動画・内容
  - **レッスン完了トラッキング**: ワンクリック完了・即座UI更新
  - **進捗管理**: サイドバーチェックマーク・完了率表示
  - **復習機能**: 完了後も何度でも視聴可能
- **YouTube動画対応**: 自動埋め込み・最適表示

### ✅ システム機能
- **セキュリティ**: RLS完全実装・認証ベース権限管理
- **決済**: Stripe統合・安全な購入フロー
- **パフォーマンス**: 楽観的更新・リアルタイムUI
- **レスポンシブ**: モバイル・デスクトップ対応

## 🔐 権限管理

### RLSポリシー実装済み
- **profiles**: 全員閲覧可、自分のみ更新
- **spaces**: アクティブなら全員閲覧、所有者のみ更新
- **courses/lessons**: 公開なら閲覧可、所有者のみ更新
- **lesson_completions**: 学習者のみアクセス
- **購入・進捗**: 関係者のみアクセス

## 🚀 セットアップ手順

### 1. 環境変数設定
```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
STRIPE_SECRET_KEY=your_stripe_key
```

### 2. Supabaseデータベース設定
```sql
-- schema.sql を実行
-- RLS有効化・ポリシー作成
-- インデックス作成
```

### 3. 開発サーバー起動
```bash
npm install
npm run dev
```

## 📈 技術的特徴

### パフォーマンス最適化
- **直接参照**: 不要なJOIN削除
- **楽観的更新**: UI即座反映
- **インデックス最適化**: 高速クエリ実行
- **リアクティブ状態管理**: Svelte stores活用

### ユーザビリティ
- **username URL**: `/{username}/dashboard`（undefined問題解消）
- **即座フィードバック**: ボタンクリック→即座UI更新
- **視覚的進捗**: チェックマーク・完了率表示
- **直感的ナビゲーション**: 統一されたUI/UX

## 🎉 完成した機能

**完全に動作するオンラインコース販売プラットフォーム**として、以下の機能が実装済み：

✅ **講師**: コンテンツ作成・管理・販売・生徒管理  
✅ **生徒**: コース購入・学習・進捗トラッキング  
✅ **システム**: 認証・決済・セキュリティ・パフォーマンス最適化

**学習体験の向上により、生徒の学習モチベーション向上と進捗管理が実現されています。**