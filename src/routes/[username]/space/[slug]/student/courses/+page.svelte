<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	export let data

	$: username = $page.params.username
	$: slug = $page.params.slug

	let space: any = null
	let student: any = null
	let courses: any[] = []
	let filteredCourses: any[] = []
	let purchasedCourses: Set<string> = new Set()
	let loading = true
	let error = ''
	let filter = 'all' // 'all', 'free', 'paid', 'purchased', 'unpurchased'

	onMount(async () => {
		await loadCoursesData()
	})

	async function loadCoursesData() {
		try {
			// スペース情報を取得
			const spaceResponse = await fetch(`/api/spaces?username=${username}&slug=${slug}`)
			const spaceResult = await spaceResponse.json()

			if (!spaceResponse.ok) {
				throw new Error(spaceResult.error || 'スペースの読み込みに失敗しました')
			}

			space = spaceResult.space

			// このスペースのコース一覧を取得
			const coursesResponse = await fetch(`/api/courses?username=${username}`)
			const coursesResult = await coursesResponse.json()

			if (coursesResponse.ok && coursesResult.courses) {
				// このスペースの公開済みコースのみフィルター
				courses = coursesResult.courses.filter((course: any) =>
					course.space_id === space.id && course.is_published
				)
			}

			// 購入済みコースを読み込み
			await loadPurchasedCourses()

		} catch (err: any) {
			error = err.message || 'データの読み込みに失敗しました'
			console.error('Load courses data error:', err)
		} finally {
			loading = false
		}
	}

	async function loadPurchasedCourses() {
		try {
			// TODO: 購入履歴APIが実装されるまで、無料コースは自動的にアクセス可能として扱う
			// 将来的には /api/purchases エンドポイントから取得する予定
			purchasedCourses = new Set()
		} catch (err) {
			console.error('Load purchased courses error:', err)
		}
	}
	
	// コース学習ページへ移動
	function navigateToCourse(course: any) {
		// URLのusernameを正しく設定
		const instructorUsername = space?.instructor?.username || username
		const courseSlug = course.slug || course.id
		goto(`/${instructorUsername}/space/${slug}/student/course/${courseSlug}`)
	}

	// 購入ページへ移動
	function navigateToPurchase(course: any) {
		const instructorUsername = space?.instructor?.username || username
		const courseSlug = course.slug || course.id
		console.log('navigateToPurchase called:', {
			course,
			space,
			instructorUsername,
			username,
			slug,
			courseSlug,
			targetUrl: `/${instructorUsername}/space/${slug}/course/${courseSlug}/purchase`
		})
		goto(`/${instructorUsername}/space/${slug}/course/${courseSlug}/purchase`)
	}
	
	// コースの購入状況を確認
	function isPurchased(courseId: string): boolean {
		return purchasedCourses.has(courseId)
	}
	
	// 価格をフォーマット
	function formatCurrency(price: number, currency: string): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: currency || 'JPY'
		}).format(price)
	}
	
	// フィルタリング処理
	$: {
		if (courses.length > 0) {
			switch (filter) {
				case 'free':
					filteredCourses = courses.filter(c => c.is_free)
					break
				case 'paid':
					filteredCourses = courses.filter(c => !c.is_free)
					break
				case 'purchased':
					filteredCourses = courses.filter(c => isPurchased(c.id))
					break
				case 'unpurchased':
					filteredCourses = courses.filter(c => !c.is_free && !isPurchased(c.id))
					break
				default:
					filteredCourses = courses
			}
		} else {
			filteredCourses = []
		}
	}
</script>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

<svelte:head>
	<title>コース一覧 - {space?.title || 'スペース'}</title>
</svelte:head>

<div>
	<div class="mb-8">
		<h2 class="text-2xl font-bold text-gray-900 mb-2">コース一覧</h2>
		<p class="text-gray-600 mb-4">このスペースで学習できるコースを表示しています</p>
		
		<!-- フィルタータブ -->
		{#if courses.length > 0}
			<div class="flex flex-wrap gap-2 mt-4">
				<button
					on:click={() => filter = 'all'}
					class="px-3 py-1 rounded-full text-sm font-medium transition-colors {filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					すべて ({courses.length})
				</button>
				<button
					on:click={() => filter = 'purchased'}
					class="px-3 py-1 rounded-full text-sm font-medium transition-colors {filter === 'purchased' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					購入済み ({courses.filter(c => isPurchased(c.id)).length})
				</button>
				<button
					on:click={() => filter = 'free'}
					class="px-3 py-1 rounded-full text-sm font-medium transition-colors {filter === 'free' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					無料 ({courses.filter(c => c.is_free).length})
				</button>
				<button
					on:click={() => filter = 'unpurchased'}
					class="px-3 py-1 rounded-full text-sm font-medium transition-colors {filter === 'unpurchased' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					未購入 ({courses.filter(c => !c.is_free && !isPurchased(c.id)).length})
				</button>
			</div>
		{/if}
	</div>
	
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			<p>{error}</p>
			<a href="/{username}/space/{slug}/student" class="text-sm underline mt-2 inline-block">
				ダッシュボードに戻る
			</a>
		</div>
	{:else if courses.length === 0}
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
			</svg>
			<h3 class="text-lg font-medium text-gray-900 mb-2">コースがありません</h3>
			<p class="text-gray-600">
				現在、このスペースには公開されているコースがありません。
			</p>
		</div>
	{:else}
		<!-- コースカードのグリッド（3カラム） -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredCourses as course}
				<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden relative">
					<!-- 購入済みオーバーレイ -->
					{#if isPurchased(course.id)}
						<div class="absolute top-4 right-4 z-10">
							<div class="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
								<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
								購入済み
							</div>
						</div>
					{/if}
					<!-- コース画像 -->
					{#if course.thumbnail_url}
						<img 
							src={course.thumbnail_url} 
							alt={course.title}
							class="w-full h-48 object-cover"
						/>
					{:else}
						<div class="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
							<svg class="h-16 w-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
							</svg>
						</div>
					{/if}
					
					<!-- コース内容 -->
					<div class="p-6">
						<!-- ステータスバッジ -->
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center space-x-2">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
									公開中
								</span>
								{#if isPurchased(course.id)}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
										購入済み
									</span>
								{/if}
							</div>
							{#if course.price && !course.is_free}
								<span class="text-sm font-medium text-gray-900">
									{formatCurrency(course.price, course.currency)}
								</span>
							{:else}
								<span class="text-sm font-medium text-green-600">
									無料
								</span>
							{/if}
						</div>
						
						<!-- タイトル -->
						<h3 class="text-lg font-semibold text-gray-900 mb-2">
							{course.title}
						</h3>
						
						<!-- 説明 -->
						{#if course.description}
							<p class="text-sm text-gray-600 mb-4 line-clamp-3">
								{course.description}
							</p>
						{/if}
						
						<!-- アクションボタン -->
						{#if course.is_free || isPurchased(course.id)}
							<!-- 無料コースまたは購入済みコース -->
							<button
								on:click={() => navigateToCourse(course)}
								class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
							>
								{#if isPurchased(course.id)}
									コースを受講する
								{:else}
									無料で受講開始
								{/if}
							</button>
						{:else}
							<!-- 有料コース（未購入） -->
							<div class="space-y-2">
								{#if course.stripe_price_id}
									<!-- Stripe決済が設定されている場合 -->
									<button
										on:click={() => navigateToPurchase(course)}
										class="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center"
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
										</svg>
										{formatCurrency(course.price, course.currency)} で購入
									</button>
									<button
										on:click={() => navigateToCourse(course)}
										class="w-full py-2 px-4 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
									>
										詳細を見る
									</button>
								{:else}
									<!-- Stripe決済が未設定の場合 -->
									<div class="text-center">
										<button
											disabled
											class="w-full py-2 px-4 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium text-sm"
										>
											購入設定準備中
										</button>
										<p class="text-xs text-gray-500 mt-1">
											講師が決済設定を完了するまでお待ちください
										</p>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>