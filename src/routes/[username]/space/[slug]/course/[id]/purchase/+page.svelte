<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	export let data

	$: username = $page.params.username
	$: slug = $page.params.slug
	$: course = data.course
	$: space = data.space
	$: user = data.user

	let processing = false
	let error = ''

	async function handleFreePurchase() {
		processing = true
		error = ''

		try {
			const response = await fetch('/api/courses/purchase-free', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					courseId: course.id,
					studentId: user.id
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '購入処理に失敗しました')
			}

			// 成功したらコースページにリダイレクト
			await goto(`/${username}/space/${slug}/student/course/${course.id}`)
		} catch (err: any) {
			error = err.message
			console.error('Free purchase error:', err)
		} finally {
			processing = false
		}
	}

	function formatCurrency(price: number, currency: string = 'JPY'): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: currency
		}).format(price)
	}
</script>

<svelte:head>
	<title>{course?.title} - {course?.is_free ? '受講開始' : '購入'} | {space?.title}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-3xl mx-auto">
		<!-- ヘッダー -->
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">
				{course.is_free ? 'コースの受講開始' : 'コースの購入'}
			</h1>
			<p class="text-gray-600">
				{course.is_free
					? '以下のコースを無料で受講できます'
					: '以下のコースを購入します'}
			</p>
		</div>

		<!-- コース情報カード -->
		<div class="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
			{#if course.thumbnail_url}
				<img src={course.thumbnail_url} alt={course.title} class="w-full h-64 object-cover" />
			{/if}
			<div class="p-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-4">{course.title}</h2>
				<p class="text-gray-600 mb-6">{course.description}</p>

				<div class="border-t border-gray-200 pt-6">
					<div class="flex justify-between items-center mb-4">
						<span class="text-lg font-medium text-gray-900">価格</span>
						<span class="text-3xl font-bold text-blue-600">
							{course.is_free ? '¥0 (無料)' : formatCurrency(course.price, course.currency)}
						</span>
					</div>

					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<h3 class="font-medium text-blue-900 mb-2">コース内容</h3>
						<ul class="space-y-2 text-sm text-blue-800">
							<li class="flex items-start">
								<svg class="h-5 w-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
								</svg>
								無制限にアクセス可能
							</li>
							<li class="flex items-start">
								<svg class="h-5 w-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
								</svg>
								すべてのレッスンにアクセス可能
							</li>
							<li class="flex items-start">
								<svg class="h-5 w-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
								</svg>
								進捗管理機能
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>

		<!-- エラー表示 -->
		{#if error}
			<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
				{error}
			</div>
		{/if}

		<!-- 購入ボタン -->
		<div class="bg-white rounded-lg shadow p-6">
			{#if course.is_free}
				<button
					on:click={handleFreePurchase}
					disabled={processing}
					class="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{processing ? '処理中...' : '無料で受講開始'}
				</button>
			{:else}
				<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
					<p class="text-sm text-yellow-800">
						<strong>注意:</strong> 有料コースの決済機能は現在開発中です。Stripe連携が必要です。
					</p>
				</div>
				<button
					disabled
					class="w-full bg-gray-400 text-white py-4 px-6 rounded-lg text-lg font-semibold cursor-not-allowed"
				>
					Stripe決済（準備中）
				</button>
			{/if}

			<div class="mt-4 text-center">
				<a
					href="/{username}/space/{slug}/student/course/{course.id}"
					class="text-blue-600 hover:text-blue-800 text-sm"
				>
					コースページに戻る
				</a>
			</div>
		</div>

		<!-- 利用規約・プライバシーポリシー -->
		<p class="text-xs text-gray-500 text-center mt-6">
			{course.is_free ? '受講開始' : '購入'}することで、
			<a href="#" class="text-blue-600 hover:text-blue-800">利用規約</a>
			および
			<a href="#" class="text-blue-600 hover:text-blue-800">プライバシーポリシー</a>
			に同意したものとみなされます。
		</p>
	</div>
</div>
