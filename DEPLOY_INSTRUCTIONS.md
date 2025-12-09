# デプロイ手順とトラブルシューティング

## 正しいデプロイ方法

このプロジェクトは**手動デプロイ**を推奨します。

```bash
# 1. プロジェクトをビルド
npm run build

# 2. Cloudflare Pagesにデプロイ
wrangler pages deploy .svelte-kit/cloudflare --project-name=satomatashikicourse
```

## トラブルシューティング

### 問題: 別のプロジェクト（タスク管理ツール）が表示される

**原因**: Cloudflare Pagesの`satomatashikicourse`プロジェクトが、間違ったGitリポジトリに接続されている可能性があります。

**解決方法**:

1. **Cloudflare Pagesダッシュボードを開く**
   - https://dash.cloudflare.com/
   - Pages → `satomatashikicourse` プロジェクトを選択

2. **Git連携設定を確認**
   - Settings → Builds & Deployments → Build configuration
   - 「Source」セクションで、接続されているGitリポジトリを確認
   - **正しいリポジトリ**: `satomata48-cyber/satomatashikicourse`
   - **間違っている場合**: Gitリポジトリを再接続

3. **自動デプロイを無効化（推奨）**
   - Settings → Builds & Deployments
   - "Automatic deployments" を無効化
   - これにより、意図しないデプロイを防止できます

4. **手動デプロイのみ使用**
   - ローカルから `wrangler pages deploy` コマンドでデプロイ
   - または、GitHub Actions（`.github/workflows/deploy.yml`）を使用

## 現在のプロジェクト情報

- **プロジェクト名**: satomatashikicourse
- **正しいGitリポジトリ**: https://github.com/satomata48-cyber/satomatashikicourse.git
- **本番URL**: https://satomatashikicourse.pages.dev/
- **期待される内容**: 会員制サイト（MemberSite）のランディングページ

## CDNキャッシュについて

デプロイ後、メインドメイン（`satomatashikicourse.pages.dev`）に反映されるまで数分かかる場合があります。

- 新しいデプロイURL（例: `https://15a408ec.satomatashikicourse.pages.dev/`）ではすぐに確認可能
- メインドメインのキャッシュが更新されるまで待つか、Cloudflare Pagesダッシュボードでキャッシュをクリアしてください

## 今後の対策

1. **自動デプロイを無効化**: Cloudflare Pagesの設定で自動デプロイをオフにする
2. **手動デプロイのみ**: `npm run deploy` コマンドで確実にデプロイ
3. **Git連携の確認**: 定期的に正しいリポジトリに接続されているか確認
