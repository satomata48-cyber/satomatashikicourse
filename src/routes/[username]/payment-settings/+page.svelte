<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { createStripeConnectAccount } from '$lib/stripe-connect'

	export let data

	$: username = $page.params.username

	let loading = true
	let saving = false
	let error = ''
	let successMessage = ''

	// Stripe接続情報
	let stripeAccountId = ''
	let stripeAccountStatus = ''
	let stripeOnboardingCompleted = false
	let isTestMode = true // デフォルトはテストモード

	// 売上統計
	let totalRevenue = 0
	let totalSales = 0
	let pendingPayouts = 0

	// スペースごと・コースごとの売上詳細
	interface SpaceRevenue {
		spaceId: string
		spaceTitle: string
		spaceSlug: string
		totalRevenue: number
		totalSales: number
		courses: CourseRevenue[]
	}

	interface CourseRevenue {
		courseId: string
		courseTitle: string
		price: number
		revenue: number
		salesCount: number
		stripeProductId: string | null
	}

	let spaceRevenueList: SpaceRevenue[] = []

	onMount(async () => {
		// URLパラメータからメッセージを取得
		const successParam = $page.url.searchParams.get('success')
		const errorParam = $page.url.searchParams.get('error')

		if (successParam) {
			successMessage = successParam
		}
		if (errorParam) {
			error = errorParam
		}

		// LocalStorageからテストモードの状態を読み込み
		const savedTestMode = localStorage.getItem('stripe_test_mode')
		if (savedTestMode !== null) {
			isTestMode = savedTestMode === 'true'
		}

		await loadPaymentSettings()
	})

	async function loadPaymentSettings() {
		try {
			if (!username) {
				error = 'ユーザー名が必要です'
				loading = false
				return
			}

			// APIからスペースとコース情報を取得（プロフィール情報も含む）
			const response = await fetch(`/api/courses?username=${username}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'データの取得に失敗しました')
			}

			// プロフィール情報を取得（profileフィールドが存在する場合）
			if (result.profile) {
				stripeAccountId = result.profile.stripe_account_id || ''
				stripeAccountStatus = result.profile.stripe_account_status || 'pending'
				stripeOnboardingCompleted = result.profile.stripe_onboarding_completed || false
			}

			// 売上統計を取得
			await loadRevenueStats()

		} catch (err: any) {
			error = err.message
			console.error('Load payment settings error:', err)
		} finally {
			loading = false
		}
	}

	async function loadRevenueStats() {
		try {
			// APIからスペースとコース情報を取得
			const response = await fetch(`/api/courses?username=${username}`)
			const result = await response.json()

			if (!response.ok) {
				console.error('Failed to load courses:', result.error)
				return
			}

			const spaces = result.spaces || []
			const courses = result.courses || []

			if (spaces.length === 0) return

			// TODO: 購入データAPIの実装が必要
			// 現在は購入データがないため、統計は0のままにします
			totalSales = 0
			totalRevenue = 0

			// スペースごとに集計（購入データがないため空の配列）
			spaceRevenueList = spaces.map((space: any) => {
				const spaceCourses = courses.filter((c: any) => c.space_id === space.id)

				const courseRevenueData: CourseRevenue[] = spaceCourses.map((course: any) => {
					return {
						courseId: course.id,
						courseTitle: course.title,
						price: course.price || 0,
						revenue: 0, // TODO: 購入データから計算
						salesCount: 0, // TODO: 購入データから計算
						stripeProductId: course.stripe_product_id
					}
				})

				return {
					spaceId: space.id,
					spaceTitle: space.title,
					spaceSlug: space.slug,
					totalRevenue: 0, // TODO: 購入データから計算
					totalSales: 0, // TODO: 購入データから計算
					courses: courseRevenueData
				}
			})

		} catch (err) {
			console.error('Revenue stats error:', err)
		}
	}

	async function connectStripe() {
		try {
			saving = true
			error = ''
			successMessage = ''

			// TODO: Stripe Connect機能は後で実装
			error = 'Stripe Connect機能は現在実装中です'

		} catch (err: any) {
			error = err.message || 'Stripe接続に失敗しました'
			console.error('Stripe Connect error:', err)
		} finally {
			saving = false
		}
	}

	async function toggleTestMode() {
		try {
			saving = true
			error = ''
			successMessage = ''

			// モードを切り替え
			isTestMode = !isTestMode

			// LocalStorageに保存（クライアントサイドで管理）
			localStorage.setItem('stripe_test_mode', isTestMode.toString())

			successMessage = isTestMode
				? 'テストモードに切り替えました。テストカードで決済をテストできます。'
				: '本番モードに切り替えました。実際の決済が処理されます。'

		} catch (err: any) {
			error = err.message || 'モード切り替えに失敗しました'
			console.error('Toggle mode error:', err)
		} finally {
			saving = false
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(amount)
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'active':
				return { color: 'green', label: '有効' }
			case 'pending':
				return { color: 'yellow', label: '保留中' }
			case 'restricted':
				return { color: 'red', label: '制限あり' }
			default:
				return { color: 'gray', label: '未接続' }
		}
	}
</script>

<div>
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else}
		<!-- 成功/エラーメッセージ -->
		{#if successMessage}
			<div class="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
				{successMessage}
			</div>
		{/if}

		{#if error}
			<div class="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
				{error}
			</div>
		{/if}

		<!-- Stripe接続ステータス -->
		<div class="bg-white rounded-lg shadow p-6 mb-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Stripe接続ステータス</h3>

			<div class="space-y-4">
				<!-- 接続状態 -->
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-700">接続状態</p>
						{#if stripeAccountId}
							<p class="text-xs text-gray-500 mt-1">アカウントID: {stripeAccountId}</p>
						{/if}
					</div>
					<div>
						{#if stripeAccountStatus === 'active'}
							<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
								有効
							</span>
						{:else if stripeAccountStatus === 'pending'}
							<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
								保留中
							</span>
						{:else if stripeAccountStatus === 'restricted'}
							<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
								制限あり
							</span>
						{:else}
							<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
								未接続
							</span>
						{/if}
					</div>
				</div>

				<!-- オンボーディング状態 -->
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-gray-700">オンボーディング</p>
					<div class="flex items-center">
						{#if stripeOnboardingCompleted}
							<svg class="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
							</svg>
							<span class="text-sm text-green-600">完了</span>
						{:else}
							<svg class="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
							<span class="text-sm text-yellow-600">未完了</span>
						{/if}
					</div>
				</div>

				<!-- アクションボタン -->
				<div class="pt-4 border-t">
					{#if !stripeAccountId}
						<button
							on:click={connectStripe}
							disabled={saving}
							class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
						>
							{saving ? '接続中...' : 'Stripeアカウントを接続'}
						</button>
					{:else if !stripeOnboardingCompleted}
						<button
							on:click={connectStripe}
							disabled={saving}
							class="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
						>
							オンボーディングを完了
						</button>
					{:else}
						<button
							on:click={connectStripe}
							disabled={saving}
							class="w-full bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
						>
							アカウント設定を更新
						</button>
					{/if}
				</div>
			</div>
		</div>

		<!-- 売上統計 -->
		<div class="bg-white rounded-lg shadow p-6 mb-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">売上統計</h3>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="bg-blue-50 rounded-lg p-4">
					<p class="text-sm text-blue-600 mb-1">総売上</p>
					<p class="text-2xl font-bold text-blue-900">{formatCurrency(totalRevenue)}</p>
				</div>

				<div class="bg-green-50 rounded-lg p-4">
					<p class="text-sm text-green-600 mb-1">販売数</p>
					<p class="text-2xl font-bold text-green-900">{totalSales}件</p>
				</div>

				<div class="bg-purple-50 rounded-lg p-4">
					<p class="text-sm text-purple-600 mb-1">保留中の支払い</p>
					<p class="text-2xl font-bold text-purple-900">{formatCurrency(pendingPayouts)}</p>
				</div>
			</div>
		</div>

		<!-- スペース・コース別売上詳細 -->
		{#if spaceRevenueList.length > 0}
			<div class="bg-white rounded-lg shadow p-6 mb-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">スペース・コース別売上詳細</h3>

				<div class="space-y-6">
					{#each spaceRevenueList as space}
						<div class="border border-gray-200 rounded-lg overflow-hidden">
							<!-- スペースヘッダー -->
							<div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
								<div class="flex justify-between items-center">
									<div>
										<h4 class="font-semibold text-gray-900">{space.spaceTitle}</h4>
										<p class="text-xs text-gray-500">/{username}/space/{space.spaceSlug}</p>
									</div>
									<div class="text-right">
										<p class="text-sm text-gray-600">スペース合計</p>
										<p class="text-lg font-bold text-gray-900">{formatCurrency(space.totalRevenue)}</p>
										<p class="text-xs text-gray-500">{space.totalSales}件の販売</p>
									</div>
								</div>
							</div>

							<!-- コース一覧 -->
							<div class="divide-y divide-gray-200">
								{#each space.courses as course}
									<div class="px-4 py-3 hover:bg-gray-50 transition-colors">
										<div class="flex justify-between items-start">
											<div class="flex-1">
												<div class="flex items-center space-x-2">
													<p class="font-medium text-gray-900">{course.courseTitle}</p>
													{#if course.stripeProductId}
														<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
															Stripe連携済み
														</span>
													{:else}
														<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
															未設定
														</span>
													{/if}
												</div>
												<div class="mt-1 flex items-center space-x-4 text-sm text-gray-500">
													<span>価格: {formatCurrency(course.price)}</span>
													{#if course.stripeProductId}
														<span class="text-xs">商品ID: {course.stripeProductId}</span>
													{/if}
												</div>
											</div>
											<div class="text-right ml-4">
												<p class="text-lg font-semibold text-gray-900">{formatCurrency(course.revenue)}</p>
												<p class="text-sm text-gray-600">{course.salesCount}件</p>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- テスト/本番モード情報 -->
		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-lg font-semibold text-gray-900">決済モード</h3>

				<!-- モード切り替えトグル -->
				<div class="flex items-center space-x-3">
					<span class="text-sm font-medium" class:text-gray-500={!isTestMode} class:text-gray-900={isTestMode}>
						テストモード
					</span>
					<button
						type="button"
						on:click={toggleTestMode}
						disabled={saving}
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
						class:bg-blue-600={isTestMode}
						class:bg-gray-600={!isTestMode}
						role="switch"
						aria-checked={isTestMode}
					>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
							class:translate-x-6={isTestMode}
							class:translate-x-1={!isTestMode}
						/>
					</button>
					<span class="text-sm font-medium" class:text-gray-500={isTestMode} class:text-gray-900={!isTestMode}>
						本番モード
					</span>
				</div>
			</div>

			<!-- 現在のモード表示 -->
			<div class="mb-4 p-3 rounded-lg" class:bg-blue-50={isTestMode} class:bg-green-50={!isTestMode}>
				<div class="flex items-center">
					<svg class="h-5 w-5 mr-2" class:text-blue-600={isTestMode} class:text-green-600={!isTestMode} fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
					</svg>
					<span class="text-sm font-medium" class:text-blue-800={isTestMode} class:text-green-800={!isTestMode}>
						{isTestMode ? '現在テストモードです - テストカードで決済をテストできます' : '現在本番モードです - 実際の決済が処理されます'}
					</span>
				</div>
			</div>

			<div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
						</svg>
					</div>
					<div class="ml-3">
						<h4 class="text-sm font-medium text-blue-800">モードについて</h4>
						<p class="mt-2 text-sm text-blue-700">
							• <strong>テストモード</strong>: テストカード（4242 4242 4242 4242）で動作確認<br>
							• <strong>本番モード</strong>: 実際の決済処理・入金が行われます<br><br>
							モードを切り替えると、すべてのコースの決済に反映されます。
						</p>
					</div>
				</div>
			</div>

			<div class="bg-yellow-50 border-l-4 border-yellow-500 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
						</svg>
					</div>
					<div class="ml-3">
						<h4 class="text-sm font-medium text-yellow-800">セキュリティに関する注意</h4>
						<p class="mt-2 text-sm text-yellow-700">
							• 本番用のAPIキーは安全に管理してください<br>
							• テストモードで十分な動作確認を行ってから本番に移行してください<br>
							• Webhookの設定も忘れずに行ってください
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
