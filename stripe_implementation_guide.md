# Stripe決済の権限別実装ガイド

## 🔐 権限モデル

### 講師権限（Stripe設定のみ）
講師は**Stripe決済の設定**はできますが、**実際の決済処理**はできません。

```javascript
// 講師側の機能（料金設定ページ）
- Stripe商品の作成
- 価格の設定
- 決済リンクの生成
- 売上レポートの確認

// 講師ができないこと
- 自分のコースを購入（防止策実装）
- 他の生徒の決済情報へのアクセス
- クレジットカード情報の閲覧
```

### 生徒権限（Stripe決済実行）
生徒は**実際の決済**を実行できます。

```javascript
// 生徒側の機能（コース購入ページ）
- Stripe Checkoutでの決済
- 購入履歴の確認
- 領収書のダウンロード
- サブスクリプション管理
```

## 🛡️ セキュリティ実装

### 1. 購入ページでの権限チェック
```javascript
// src/routes/[username]/space/[slug]/course/[id]/purchase/+page.svelte

async function initiatePurchase() {
  // 1. ユーザー認証確認
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    goto('/login')
    return
  }
  
  // 2. 講師本人の購入を防止
  const { data: course } = await supabase
    .from('courses')
    .select('*, space:spaces!inner(instructor_id)')
    .eq('id', courseId)
    .single()
  
  if (course.space.instructor_id === user.id) {
    error = '講師は自分のコースを購入できません'
    return
  }
  
  // 3. Stripe Checkoutセッションを作成
  const response = await fetch('/api/stripe/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: course.stripe_price_id,
      courseId: course.id,
      userId: user.id
    })
  })
  
  const { sessionUrl } = await response.json()
  
  // 4. Stripeの決済ページへリダイレクト
  window.location.href = sessionUrl
}
```

### 2. APIエンドポイントでの二重チェック
```javascript
// src/routes/api/stripe/create-checkout/+server.js

export async function POST({ request, locals }) {
  const { priceId, courseId, userId } = await request.json()
  
  // 講師本人チェック（サーバーサイド）
  const { data: course } = await supabase
    .from('courses')
    .select('space:spaces!inner(instructor_id)')
    .eq('id', courseId)
    .single()
  
  if (course.space.instructor_id === userId) {
    return new Response('Instructors cannot purchase their own courses', { 
      status: 403 
    })
  }
  
  // Stripe Checkoutセッション作成
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${url.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${url.origin}/course/${courseId}`,
    metadata: {
      courseId,
      userId
    }
  })
  
  return json({ sessionUrl: session.url })
}
```

### 3. Webhookでの購入完了処理
```javascript
// src/routes/api/stripe/webhook/+server.js

export async function POST({ request }) {
  const payload = await request.text()
  const sig = request.headers.get('stripe-signature')
  
  // Stripe署名検証
  const event = stripe.webhooks.constructEvent(
    payload, 
    sig, 
    STRIPE_WEBHOOK_SECRET
  )
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { courseId, userId } = session.metadata
    
    // 購入記録を作成
    await supabase.from('course_purchases').insert({
      course_id: courseId,
      student_id: userId,
      amount: session.amount_total / 100,
      currency: session.currency,
      status: 'completed',
      stripe_payment_intent_id: session.payment_intent
    })
  }
  
  return new Response('OK', { status: 200 })
}
```

## 📊 実装フロー図

```
講師側:
[料金設定] → [Stripe商品作成] → [価格ID保存] → [完了]
     ↓
   設定のみ（決済不可）

生徒側:
[コース閲覧] → [購入ボタン] → [Stripe Checkout] → [決済完了]
     ↓            ↓                    ↓
  権限確認    講師本人は拒否      Webhookで記録
```

## ✅ ベストプラクティス

1. **講師の自己購入防止**
   - フロントエンド：購入ボタンを非表示
   - バックエンド：APIで二重チェック
   - データベース：RLSポリシーで制限

2. **セキュアな決済フロー**
   - Stripe Hosted Checkout使用（PCI準拠）
   - Webhook署名検証（偽装防止）
   - メタデータで追跡（監査証跡）

3. **エラーハンドリング**
   - 明確なエラーメッセージ
   - 失敗時の自動リトライ
   - ログ記録と監視

4. **返金ポリシー**
   - 講師が返金承認
   - Stripe Dashboard経由で処理
   - 自動でアクセス権削除

## 🚀 導入手順

1. **環境変数設定**
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

2. **データベース更新**
```sql
-- add_stripe_fields.sqlを実行
```

3. **APIエンドポイント作成**
- `/api/stripe/create-checkout`
- `/api/stripe/webhook`
- `/api/stripe/create-product`

4. **テスト**
- Stripeテストモードで動作確認
- 講師アカウントで購入不可を確認
- 生徒アカウントで購入可能を確認

これにより、講師は決済設定のみ、生徒は実際の決済実行という明確な役割分担が実現されます。