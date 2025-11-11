<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username
	$: courseId = $page.params.id

	let course: any = null
	let space: any = null
	let priceFormData = {
		isFree: false,
		price: 0,
		currency: 'JPY'
	}
	let loading = true
	let saving = false
	let error = ''
	let successMessage = ''

	// Stripe設定
	let stripeConnected = false
	let stripeProductId = ''
	let stripePriceId = ''
	let showStripeSetup = false

	onMount(async () => {
		await loadCourse()
	})

	async function loadCourse() {
		try {
			// APIからコース情報を取得
			const response = await fetch(`/api/courses?id=${courseId}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'コースの取得に失敗しました')
			}

			course = result.course
			space = result.space

			priceFormData = {
				isFree: course.is_free ? true : false,
				price: course.price || 0,
				currency: course.currency || 'JPY'
			}

			// Stripe設定を確認
			stripeProductId = course.stripe_product_id || ''
			stripePriceId = course.stripe_price_id || ''
			stripeConnected = !!(stripeProductId && stripePriceId)
		} catch (err: any) {
			error = err.message
			console.error('Load course error:', err)
		} finally {
			loading = false
		}
	}
	
	async function handleSave() {
		saving = true
		error = ''
		successMessage = ''

		try {
			const response = await fetch('/api/courses', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: courseId,
					is_free: priceFormData.isFree,
					price: priceFormData.isFree ? 0 : priceFormData.price,
					currency: priceFormData.currency
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '保存に失敗しました')
			}

			successMessage = '料金設定を更新しました'
			await loadCourse() // 最新データを再読み込み

			// 2秒後にコース一覧に戻る
			setTimeout(() => {
				goto(`/${username}/courses`)
			}, 2000)
		} catch (err: any) {
			error = err.message
			console.error('Save pricing error:', err)
		} finally {
			saving = false
		}
	}

	function formatCurrency(price: number): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: priceFormData.currency
		}).format(price)
	}

	function handleCancel() {
		goto(`/${username}/courses`)
	}

	async function setupStripeProduct() {
		if (!course || priceFormData.isFree) return

		saving = true
		error = ''

		try {
			const response = await fetch('/api/stripe/create-product', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					courseId: courseId,
					name: course.title,
					description: course.description,
					price: priceFormData.price,
					currency: priceFormData.currency
				})
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || 'Stripe商品の作成に失敗しました')
			}

			const { productId, priceId, paymentLink } = await response.json()

			// UIを更新
			stripeProductId = productId
			stripePriceId = priceId
			stripeConnected = true
			showStripeSetup = false

			successMessage = 'Stripe決済が設定されました！'

			// コース情報を再読み込み
			await loadCourse()
		} catch (err: any) {
			error = `Stripe設定エラー: ${err.message}`
		} finally {
			saving = false
		}
	}

	async function disconnectStripe() {
		if (!confirm('Stripe決済を無効にしますか？購入ができなくなります。')) return

		try {
			const response = await fetch('/api/courses', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: courseId,
					stripe_product_id: null,
					stripe_price_id: null
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '無効化に失敗しました')
			}

			stripeProductId = ''
			stripePriceId = ''
			stripeConnected = false

			successMessage = 'Stripe決済が無効化されました'
		} catch (err: any) {
			error = `無効化エラー: ${err.message}`
		}
	}
</script>

<div>
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error && !course}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if course}
		<div class="max-w-2xl mx-auto">
			<!-- Header -->
			<div class="mb-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold text-gray-900 mb-2">料金設定</h2>
						<p class="text-gray-600">コース: {course.title}</p>
						<p class="text-sm text-gray-500">スペース: {space?.title || ''}</p>
					</div>
					<a
						href="/{username}/courses"
						class="text-gray-600 hover:text-gray-900"
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</a>
				</div>
			</div>
			
			<!-- Main Content Card -->
			<div class="bg-white rounded-lg shadow p-6">
				{#if successMessage}
					<div class="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
						{successMessage}
					</div>
				{/if}
				
				{#if error}
					<div class="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
						{error}
					</div>
				{/if}
				
				<form on:submit|preventDefault={handleSave} class="space-y-6">
					<!-- 無料/有料選択 -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-3">
							コースタイプ
						</label>
						<div class="grid grid-cols-2 gap-4">
							<label class="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none {priceFormData.isFree ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-300'}">
								<input
									type="radio"
									bind:group={priceFormData.isFree}
									value={true}
									class="sr-only"
								/>
								<div class="flex flex-col">
									<span class="block text-sm font-medium text-gray-900">
										無料コース
									</span>
									<span class="mt-1 flex items-center text-sm text-gray-500">
										誰でも無料でアクセス可能
									</span>
								</div>
								{#if priceFormData.isFree}
									<svg class="h-5 w-5 text-blue-600 absolute top-4 right-4" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
									</svg>
								{/if}
							</label>
							
							<label class="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none {!priceFormData.isFree ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-300'}">
								<input
									type="radio"
									bind:group={priceFormData.isFree}
									value={false}
									class="sr-only"
								/>
								<div class="flex flex-col">
									<span class="block text-sm font-medium text-gray-900">
										有料コース
									</span>
									<span class="mt-1 flex items-center text-sm text-gray-500">
										購入が必要
									</span>
								</div>
								{#if !priceFormData.isFree}
									<svg class="h-5 w-5 text-blue-600 absolute top-4 right-4" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
									</svg>
								{/if}
							</label>
						</div>
					</div>
					
					<!-- 価格設定（有料の場合のみ表示） -->
					{#if !priceFormData.isFree}
						<div class="space-y-4 border-t pt-6">
							<h3 class="text-lg font-medium text-gray-900">価格設定</h3>
							
							<div>
								<label for="price" class="block text-sm font-medium text-gray-700 mb-1">
									価格
								</label>
								<div class="mt-1 relative rounded-md shadow-sm">
									<input
										id="price"
										type="number"
										bind:value={priceFormData.price}
										min="0"
										step="100"
										class="block w-full pr-20 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
										placeholder="5000"
									/>
									<div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
										<span class="text-gray-500 sm:text-sm">
											{priceFormData.currency}
										</span>
									</div>
								</div>
							</div>
							
							<div>
								<label for="currency" class="block text-sm font-medium text-gray-700 mb-1">
									通貨
								</label>
								<select
									id="currency"
									bind:value={priceFormData.currency}
									class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								>
									<option value="JPY">日本円 (JPY)</option>
									<option value="USD">米ドル (USD)</option>
									<option value="EUR">ユーロ (EUR)</option>
								</select>
							</div>
							
							<!-- 価格プレビュー -->
							<div class="bg-blue-50 rounded-lg p-4">
								<p class="text-sm text-blue-600 mb-1">販売価格プレビュー:</p>
								<p class="text-2xl font-bold text-blue-900">
									{formatCurrency(priceFormData.price)}
								</p>
							</div>
						</div>
					{/if}
					
					<!-- Stripe決済設定（有料コースの場合） -->
					{#if !priceFormData.isFree}
						<div class="border-t pt-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4">Stripe決済設定</h3>
							
							{#if stripeConnected}
								<div class="bg-green-50 border border-green-200 rounded-lg p-4">
									<div class="flex items-start">
										<svg class="h-5 w-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
										<div class="ml-3 flex-1">
											<p class="text-sm font-medium text-green-800">Stripe決済が有効です</p>
											<p class="text-xs text-green-600 mt-1">商品ID: {stripeProductId}</p>
											<p class="text-xs text-green-600">価格ID: {stripePriceId}</p>
											<button
												type="button"
												on:click={disconnectStripe}
												class="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
											>
												決済を無効にする
											</button>
										</div>
									</div>
								</div>
							{:else}
								<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
									<div class="flex items-start">
										<svg class="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
										</svg>
										<div class="ml-3 flex-1">
											<p class="text-sm font-medium text-yellow-800">Stripe決済が未設定です</p>
											<p class="text-xs text-yellow-600 mt-1">有料コースを販売するにはStripe決済の設定が必要です</p>
											
											{#if !showStripeSetup}
												<button
													type="button"
													on:click={() => showStripeSetup = true}
													class="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
												>
													Stripe決済を設定
												</button>
											{/if}
										</div>
									</div>
									
									{#if showStripeSetup}
										<div class="mt-4 p-4 bg-white rounded border border-gray-200">
											<h4 class="text-sm font-medium text-gray-900 mb-3">Stripe決済セットアップ</h4>
											
											<div class="space-y-3">
												<div class="text-sm text-gray-600">
													<p class="mb-2">以下の手順で設定します：</p>
													<ol class="list-decimal list-inside space-y-1 text-xs">
														<li>Stripeで商品と価格を作成</li>
														<li>決済リンクを自動生成</li>
														<li>購入完了時の自動処理を設定</li>
													</ol>
												</div>
												
												<div class="bg-blue-50 p-3 rounded text-xs">
													<p class="font-medium text-blue-900 mb-1">実装オプション:</p>
													<ul class="space-y-1 text-blue-700">
														<li>• <strong>Stripe Checkout</strong>: 安全なホスティング決済ページ</li>
														<li>• <strong>Payment Links</strong>: QRコード対応の決済リンク</li>
														<li>• <strong>Embedded Checkout</strong>: サイト内埋め込み決済</li>
													</ul>
												</div>
												
												<div class="flex space-x-2">
													<button
														type="button"
														on:click={setupStripeProduct}
														class="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
													>
														自動設定を開始
													</button>
													<button
														type="button"
														on:click={() => showStripeSetup = false}
														class="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50"
													>
														キャンセル
													</button>
												</div>
											</div>
										</div>
									{/if}
								</div>
							{/if}
							
							<!-- Stripe設定のベストプラクティス -->
							<div class="mt-4 p-4 bg-gray-50 rounded-lg">
								<h4 class="text-xs font-medium text-gray-700 mb-2">💡 推奨設定</h4>
								<ul class="space-y-1 text-xs text-gray-600">
									<li>✓ Webhookでリアルタイム決済確認</li>
									<li>✓ 返金ポリシーの明示</li>
									<li>✓ 領収書の自動発行</li>
									<li>✓ 複数通貨対応（グローバル販売）</li>
								</ul>
							</div>
							
							<!-- 権限説明 -->
							<div class="mt-4 p-4 bg-blue-50 rounded-lg">
								<h4 class="text-xs font-medium text-blue-900 mb-2">🔐 Stripe決済の仕組み</h4>
								<div class="space-y-2 text-xs text-blue-700">
									<div>
										<p class="font-medium">講師側（設定のみ）:</p>
										<ul class="ml-4 space-y-0.5">
											<li>• 価格設定とStripe商品の作成</li>
											<li>• 決済は実行できません</li>
											<li>• 売上レポートの確認のみ</li>
										</ul>
									</div>
									<div>
										<p class="font-medium">生徒側（決済実行）:</p>
										<ul class="ml-4 space-y-0.5">
											<li>• 実際の購入・決済処理</li>
											<li>• セキュアな決済ページへ遷移</li>
											<li>• 購入後即座にコンテンツアクセス</li>
										</ul>
									</div>
									<div class="mt-2 p-2 bg-white/50 rounded">
										<p class="text-blue-800">
											💡 <strong>セキュリティ:</strong> 講師は決済情報に触れることなく、Stripeが安全に処理します
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}
					
					<!-- 現在の設定 -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h4 class="text-sm font-medium text-gray-700 mb-2">現在の設定:</h4>
						<div class="space-y-1 text-sm text-gray-600">
							<p>タイプ: <span class="font-medium">{course.is_free ? '無料' : '有料'}</span></p>
							{#if !course.is_free}
								<p>価格: <span class="font-medium">{new Intl.NumberFormat('ja-JP', { style: 'currency', currency: course.currency || 'JPY' }).format(course.price)}</span></p>
								<p>Stripe: <span class="font-medium">{stripeConnected ? '設定済み' : '未設定'}</span></p>
							{/if}
						</div>
					</div>
					
					<!-- Actions -->
					<div class="flex justify-end space-x-3 pt-4 border-t">
						<button
							type="button"
							on:click={handleCancel}
							class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							disabled={saving}
						>
							キャンセル
						</button>
						<button
							type="submit"
							class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
							disabled={saving}
						>
							{saving ? '保存中...' : '保存'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>