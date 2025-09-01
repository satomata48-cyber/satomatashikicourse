<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	import { createCheckoutSession } from '$lib/stripe'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	$: courseId = $page.params.id
	
	let course: any = null
	let space: any = null
	let user: any = null
	let loading = true
	let purchasing = false
	let error = ''
	let alreadyPurchased = false
	
	onMount(async () => {
		await loadCourseData()
	})
	
	async function loadCourseData() {
		try {
			// ユーザー情報を取得
			const { data: { user: currentUser } } = await supabase.auth.getUser()
			user = currentUser
			
			// コース情報を取得
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select(`
					*,
					space:spaces!inner(
						id,
						instructor_id,
						title,
						slug,
						description
					)
				`)
				.eq('id', courseId)
				.single()
			
			if (courseError) throw courseError
			if (!courseData) throw new Error('コースが見つかりません')
			
			course = courseData
			space = courseData.space
			
			// 講師本人かチェック
			if (user && space.instructor_id === user.id) {
				error = '講師は自分のコースを購入できません'
				return
			}
			
			// 既に購入済みかチェック
			if (user) {
				const { data: purchase } = await supabase
					.from('course_purchases')
					.select('*')
					.eq('course_id', courseId)
					.eq('student_id', user.id)
					.eq('status', 'completed')
					.single()
				
				if (purchase) {
					alreadyPurchased = true
				}
			}
			
		} catch (err: any) {
			error = err.message
			console.error('Load course error:', err)
		} finally {
			loading = false
		}
	}
	
	async function handlePurchase() {
		if (!user) {
			goto('/login')
			return
		}
		
		if (!course.stripe_price_id) {
			error = 'この商品は現在購入できません'
			return
		}
		
		purchasing = true
		error = ''
		
		try {
			const { sessionUrl } = await createCheckoutSession(courseId, course.stripe_price_id)
			
			// Stripe Checkoutページへリダイレクト
			window.location.href = sessionUrl
			
		} catch (err: any) {
			error = `購入エラー: ${err.message}`
			purchasing = false
		}
	}
	
	function formatCurrency(price: number, currency: string): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: currency
		}).format(price)
	}
</script>

<svelte:head>
	<title>{course?.title} - 購入 | {space?.title}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error && !course}
		<div class="max-w-2xl mx-auto pt-20 px-4">
			<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
				{error}
			</div>
		</div>
	{:else if course}
		<div class="max-w-2xl mx-auto pt-10 px-4">
			<!-- Back Link -->
			<a 
				href="/{username}/space/{slug}/course/{courseId}"
				class="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
				</svg>
				コースに戻る
			</a>
			
			<!-- Course Purchase Card -->
			<div class="bg-white rounded-lg shadow-lg overflow-hidden">
				<!-- Header -->
				<div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
					<h1 class="text-2xl font-bold mb-2">{course.title}</h1>
					<p class="text-blue-100">スペース: {space.title}</p>
				</div>
				
				<!-- Content -->
				<div class="p-6 space-y-6">
					{#if course.description}
						<div>
							<h3 class="text-lg font-medium text-gray-900 mb-2">コース概要</h3>
							<p class="text-gray-600">{course.description}</p>
						</div>
					{/if}
					
					<!-- Price -->
					<div class="bg-gray-50 rounded-lg p-4">
						<div class="flex justify-between items-center">
							<div>
								<h3 class="text-lg font-medium text-gray-900">価格</h3>
								{#if course.is_free}
									<p class="text-2xl font-bold text-green-600">無料</p>
								{:else}
									<p class="text-3xl font-bold text-gray-900">
										{formatCurrency(course.price, course.currency)}
									</p>
								{/if}
							</div>
							<div class="text-right text-sm text-gray-500">
								<p>一度の購入で</p>
								<p>永続アクセス</p>
							</div>
						</div>
					</div>
					
					<!-- Purchase Status/Button -->
					{#if error}
						<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
							{error}
						</div>
					{/if}
					
					{#if alreadyPurchased}
						<div class="bg-green-50 border border-green-200 rounded-lg p-4">
							<div class="flex items-center">
								<svg class="h-6 w-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
								<div>
									<p class="font-medium text-green-800">購入済み</p>
									<p class="text-sm text-green-600">このコースは既に購入されています</p>
								</div>
							</div>
							<a
								href="/{username}/space/{slug}/student/course/{courseId}"
								class="mt-3 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
							>
								コースを受講する
							</a>
						</div>
					{:else if !user}
						<div class="text-center">
							<p class="text-gray-600 mb-4">購入するにはログインが必要です</p>
							<a
								href="/login?redirect={encodeURIComponent($page.url.pathname)}"
								class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								ログインして購入
							</a>
						</div>
					{:else if course.is_free}
						<button
							on:click={handlePurchase}
							disabled={purchasing}
							class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
						>
							{purchasing ? '登録中...' : '無料で受講開始'}
						</button>
					{:else}
						<button
							on:click={handlePurchase}
							disabled={purchasing || !course.stripe_price_id}
							class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
						>
							{purchasing ? '処理中...' : `${formatCurrency(course.price, course.currency)} で購入`}
						</button>
					{/if}
					
					<!-- Security Notice -->
					<div class="bg-blue-50 rounded-lg p-4">
						<div class="flex items-start">
							<svg class="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
							</svg>
							<div class="text-sm text-blue-700">
								<p class="font-medium mb-1">安全な決済</p>
								<p>決済はStripeにより安全に処理されます。カード情報は当サイトに保存されません。</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>