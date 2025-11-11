# Cloudflare Pages 環境変数設定手順

## デプロイ完了
✅ アプリケーションは正常にデプロイされました
- **プロジェクト名**: satomatashiki-course
- **URL**: https://satomatashiki-course.pages.dev
- **最新デプロイ**: https://14ffee4c.satomatashiki-course.pages.dev

## 環境変数の設定が必要

### 方法1: Cloudflare Dashboard（推奨）

1. https://dash.cloudflare.com にアクセス
2. **Pages** をクリック
3. **satomatashiki-course** プロジェクトを選択
4. **Settings** タブ → **Environment variables** をクリック
5. 以下の環境変数を **Production** と **Preview** の両方に追加:

#### 追加する環境変数:

**PUBLIC_SUPABASE_URL**
```
https://qpwtygrouzicbrtslfnp.supabase.co
```

**PUBLIC_SUPABASE_ANON_KEY**
```
your_supabase_anon_key_here
```

**STRIPE_SECRET_KEY**
```
sk_live_your_stripe_secret_key_here
```

**STRIPE_WEBHOOK_SECRET**
```
whsec_your_webhook_secret_here
```

**PUBLIC_STRIPE_PUBLISHABLE_KEY**
```
pk_live_your_stripe_publishable_key_here
```

**SUPABASE_SERVICE_ROLE_KEY**
```
your_supabase_service_role_key_here
```

6. **Save** をクリック
7. **Deployments** タブに戻り、最新のデプロイメントで **Retry deployment** をクリック

### 方法2: 新しいデプロイでテスト

環境変数設定後、ローカルから再デプロイ:
```bash
npm run deploy
```

## 追加設定

### Node.js 互換性フラグ
1. **Settings** → **Functions** → **Compatibility flags**
2. `nodejs_compat` を追加
3. **Save** をクリック

### Stripe Webhook URL更新
Stripe Dashboardで以下のURLに更新:
```
https://satomatashiki-course.pages.dev/api/stripe/webhook
```

または本番用カスタムドメインを設定した場合はそちらを使用。

## カスタムドメイン設定（オプション）

1. **Custom domains** タブをクリック
2. **Set up a custom domain** をクリック
3. ドメインを入力してDNS設定

## 確認

環境変数設定後、以下をテスト:
- [ ] サイトにアクセスできる
- [ ] ログインが機能する
- [ ] Supabase接続が正常
- [ ] Stripe決済が機能する

## トラブルシューティング

エラーが発生した場合:
1. **Deployments** → 最新のデプロイメント → **View details** → **Functions** でログを確認
2. 環境変数がすべて正しく設定されているか確認
3. `nodejs_compat` フラグが有効か確認
