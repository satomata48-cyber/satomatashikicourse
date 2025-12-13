# ⚠️ 重要: プロジェクト識別

**このプロジェクトは `satomatashikicourse` です。**

- プロジェクト名: `satomatashikicourse`
- ディレクトリ: `C:\Users\lipto\desktop\satomatashikicourse`
- Cloudflare Pages: `satomatashikicourse.pages.dev`

**他のプロジェクト（satomatashikitask等）のClaudeセッションは、このディレクトリを操作しないでください。**

作業前に必ず確認:
1. 現在のディレクトリが正しいか (`pwd` で確認)
2. 自分が担当しているプロジェクト名と一致するか

---

# SvelteKit オンラインコース販売プラットフォーム

## 📋 プロジェクト概要
- **技術スタック**: SvelteKit + TypeScript + Cloudflare D1 + Cloudflare Pages + Stripe
- **認証**: Cookie-based Session認証（D1データベース）
- **決済**: Stripe Connect + Checkout Session
- **データベース**: Cloudflare D1 (SQLite)
- **ホスティング**: Cloudflare Pages
- **スタイリング**: Tailwind CSS
- **状態管理**: Svelte stores + SvelteKit load functions

## 🗄️ データベース構造

```sql
-- 1. profiles（全ユーザー管理）
profiles {
  id: TEXT PRIMARY KEY
  email: TEXT UNIQUE
  password_hash: TEXT
  display_name: TEXT
  username: TEXT UNIQUE (英数字3-20文字)
  avatar_url: TEXT
  role: TEXT ('instructor' | 'student')
  bio: TEXT
  social_links: TEXT (JSON)
  -- Stripe Connect関連
  stripe_account_id: TEXT
  stripe_account_status: TEXT DEFAULT 'pending'
  stripe_onboarding_completed: INTEGER DEFAULT 0
  created_at: TEXT DEFAULT CURRENT_TIMESTAMP
  updated_at: TEXT DEFAULT CURRENT_TIMESTAMP
}

-- 2. sessions（セッション管理）
sessions {
  id: TEXT PRIMARY KEY
  user_id: TEXT (profiles.id参照)
  expires_at: TEXT
  created_at: TEXT DEFAULT CURRENT_TIMESTAMP
}

-- 3. spaces（講師のスペース）
spaces {
  id: TEXT PRIMARY KEY
  instructor_id: TEXT (profiles.id参照)
  title: TEXT
  description: TEXT
  slug: TEXT
  max_students: INTEGER
  is_active: INTEGER
  landing_page_content: TEXT (JSON)
  created_at: TEXT DEFAULT CURRENT_TIMESTAMP
  updated_at: TEXT DEFAULT CURRENT_TIMESTAMP

  UNIQUE(instructor_id, slug)
}

-- 4. courses（コース）
courses {
  id: TEXT PRIMARY KEY
  space_id: TEXT (spaces.id参照)
  title: TEXT
  description: TEXT
  price: REAL
  currency: TEXT
  is_free: INTEGER
  is_published: INTEGER
  thumbnail_url: TEXT
  course_page_content: TEXT (JSON)
  -- Stripe商品情報
  stripe_product_id: TEXT
  stripe_price_id: TEXT
  stripe_payment_link: TEXT
  created_at: TEXT DEFAULT CURRENT_TIMESTAMP
  updated_at: TEXT DEFAULT CURRENT_TIMESTAMP
}

-- 5. lessons（レッスン）
lessons {
  id: TEXT PRIMARY KEY
  course_id: TEXT (courses.id参照)
  title: TEXT
  description: TEXT
  content: TEXT
  video_url: TEXT
  video_type: TEXT ('youtube', 'external')
  duration: INTEGER
  order_index: INTEGER
  is_published: INTEGER
  created_at: TEXT DEFAULT CURRENT_TIMESTAMP
  updated_at: TEXT DEFAULT CURRENT_TIMESTAMP
}

-- 6. space_students（生徒登録）
space_students {
  id: TEXT PRIMARY KEY
  space_id: TEXT (spaces.id参照)
  student_id: TEXT (profiles.id参照)
  status: TEXT ('active' | 'inactive' | 'suspended')
  enrolled_at: TEXT DEFAULT CURRENT_TIMESTAMP

  UNIQUE(space_id, student_id)
}

-- 7. course_purchases（購入記録）
course_purchases {
  id: TEXT PRIMARY KEY
  course_id: TEXT (courses.id参照)
  student_id: TEXT (profiles.id参照)
  amount: REAL
  currency: TEXT
  status: TEXT ('pending' | 'completed' | 'failed' | 'refunded')
  stripe_session_id: TEXT
  stripe_payment_intent_id: TEXT
  purchased_at: TEXT DEFAULT CURRENT_TIMESTAMP

  UNIQUE(course_id, student_id)
}

-- 8. lesson_completions（レッスン完了トラッキング）
lesson_completions {
  id: TEXT PRIMARY KEY
  lesson_id: TEXT (lessons.id参照)
  student_id: TEXT (profiles.id参照)
  completed_at: TEXT DEFAULT CURRENT_TIMESTAMP
  created_at: TEXT DEFAULT CURRENT_TIMESTAMP

  UNIQUE(lesson_id, student_id)
}
```

## 🛤️ URL構造

```
src/routes/
├── +page.svelte                              # トップページ
├── login/+page.svelte                        # ログイン
├── logout/+page.svelte                       # ログアウト
│
├── api/                                      # APIエンドポイント
│   ├── auth/
│   │   ├── login/+server.ts                  # ログイン処理
│   │   ├── register/+server.ts               # 新規登録
│   │   └── logout/+server.ts                 # ログアウト
│   ├── spaces/+server.ts                     # スペースCRUD
│   ├── courses/+server.ts                    # コースCRUD
│   └── stripe/
│       ├── create-product/+server.ts         # Stripe商品作成
│       ├── create-checkout/+server.ts        # チェックアウトセッション作成
│       └── webhook/+server.ts                # Webhookハンドラー
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
│   ├── courses/
│   │   ├── +page.svelte                      # コース一覧
│   │   ├── create/+page.svelte               # コース作成
│   │   └── [id]/
│   │       ├── edit/+page.svelte             # コース編集
│   │       ├── pricing/+page.svelte          # 料金・Stripe設定
│   │       └── lessons/+page.svelte          # レッスン管理
│   └── student-pages/+page.svelte            # 生徒ページ管理
│
└── [username]/space/[slug]/                  # 公開・生徒エリア
    ├── +page.svelte                          # スペースランディングページ
    └── ...                                   # 生徒向けページ（実装中）
```

## 🎓 主要機能

### ✅ 認証・アカウント機能
- **Cookie-based認証**: セッションベースの安全な認証
- **ロール管理**: 講師・生徒の明確な権限分離
- **プロフィール管理**: username ベースのURL構造

### ✅ 講師機能
- **スペース管理**:
  - 作成・編集・削除
  - ランディングページカスタマイズ
  - テーマカラー設定
- **コース管理**:
  - 作成・編集・削除
  - 価格設定・Stripe商品連携
  - 公開/非公開管理
- **レッスン管理**:
  - 動画アップロード（YouTube対応）
  - コンテンツ作成・順序管理
  - ドラッグ&ドロップで並び替え
- **ダッシュボード**: 売上・統計・活動概要

### 🚧 実装中の機能
- 生徒管理
- コース購入・視聴
- 進捗トラッキング
- Stripe決済統合

## 🔐 セキュリティ・権限管理

### セッション管理
- Cookie-based認証
- セッション有効期限管理
- CSRF保護

### APIエンドポイント保護
- ログイン状態チェック
- 所有者確認（コース・スペース編集時）
- ロールベースアクセス制御

## 🚀 セットアップ手順

### 1. 環境変数設定
```env
# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
```

### 2. Cloudflare D1データベース設定
```bash
# D1データベース作成
npx wrangler d1 create satomatashiki-course-db

# マイグレーション実行
npx wrangler d1 execute satomatashiki-course-db --local --file=migrations/0001_initial_schema.sql
npx wrangler d1 execute satomatashiki-course-db --local --file=migrations/0002_add_password_hash.sql
npx wrangler d1 execute satomatashiki-course-db --local --file=migrations/0003_add_course_page_content.sql
```

### 3. ローカル開発サーバー起動
```bash
npm install
npm run dev
```

### 4. デプロイ
```bash
npm run deploy
```

## 📈 技術的特徴

### Cloudflare D1統合
- **サーバーレスSQL**: SQLiteベースの分散データベース
- **D1 Managerクラス**: ProfileManager, SpaceManager, CourseManager
- **REST API**: `/api/*`エンドポイント経由でD1にアクセス

### パフォーマンス最適化
- **エッジコンピューティング**: Cloudflare Pagesで全世界に配信
- **リアクティブ状態管理**: Svelte stores活用
- **SSR/CSR混在**: 最適なレンダリング戦略

### エラーハンドリング
- 詳細なエラーログ出力
- ユーザーフレンドリーなエラーメッセージ
- 適切なHTTPステータスコード

### ユーザビリティ
- **username URL**: `/{username}/dashboard`
- **即座フィードバック**: ボタンクリック→即座UI更新
- **視覚的進捗**: チェックマーク・完了率・購入済みバッジ
- **フィルタリング**: コース一覧の多様な表示オプション

## 🎉 実装済み機能

**Cloudflare D1ベースのオンラインコース販売プラットフォーム**

✅ **認証システム**: Cookie-based認証・セッション管理
✅ **講師機能**: スペース・コース・レッスン管理
✅ **ランディングページ**: ドラッグ&ドロップエディター
✅ **データベース**: Cloudflare D1完全移行
✅ **デプロイ**: Cloudflare Pages対応

**最新の更新**:
- Cloudflare D1への完全移行完了
- Supabase完全削除
- Cookie-based認証実装
- REST APIエンドポイント実装
- SSRエラー修正（fetch呼び出しをonMount内に移動）
