<script lang="ts">
	import { onMount, tick } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	export let data

	$: username = $page.params.username
	
	let courses: any[] = []
	let spaces: any[] = []
	let loading = true
	let error = ''
	let selectedSpace = ''
	let initialized = false
	let themeColor = '#3B82F6' // デフォルト: blue-600
	
	
	let redirecting = false

	onMount(async () => {
		// usernameが設定されたらデータをロード（UUIDではない場合のみ）
		if (username && username !== 'undefined' && !redirecting) {
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)
			if (!isUUID && !initialized) {
				initialized = true
				await loadData()
			}
		}
	})
	
	async function loadData() {
		loading = true
		try {
			// API からコースとスペース一覧を取得
			const response = await fetch(`/api/courses?username=${username}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'データの取得に失敗しました')
			}

			courses = result.courses || []
			spaces = result.spaces || []

		} catch (err: any) {
			error = err.message
			console.error('Load data error:', err)
		} finally {
			loading = false
		}
	}
	
	// スペースフィルタリング用のフィルター済みコース
	$: filteredCourses = selectedSpace
		? courses.filter(c => c.space_id === selectedSpace)
		: courses

	// テーマカラー更新
	$: if (selectedSpace && spaces.length > 0) {
		const selectedSpaceData = spaces.find(s => s.id === selectedSpace)
		if (selectedSpaceData?.landing_page_content?.theme?.primaryColor) {
			const color = selectedSpaceData.landing_page_content.theme.primaryColor
			themeColor = (color && color.trim() !== '') ? color : '#3B82F6'
		} else {
			themeColor = '#3B82F6'
		}
	} else if (spaces.length > 0) {
		const firstSpace = spaces[0]
		if (firstSpace?.landing_page_content?.theme?.primaryColor) {
			const color = firstSpace.landing_page_content.theme.primaryColor
			themeColor = (color && color.trim() !== '') ? color : '#3B82F6'
		} else {
			themeColor = '#3B82F6'
		}
	}

	async function deleteCourse(courseId: string) {
		if (!confirm('このコースを削除してもよろしいですか？関連するレッスンもすべて削除されます。')) {
			return
		}

		try {
			const response = await fetch(`/api/courses?id=${courseId}`, {
				method: 'DELETE'
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '削除に失敗しました')
			}

			// ローカル state から削除
			courses = courses.filter(c => c.id !== courseId)

		} catch (err: any) {
			alert(`削除に失敗しました: ${err.message}`)
		}
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('ja-JP')
	}
	
	function formatCurrency(price: number): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(price)
	}
</script>

<div>
	<div class="flex justify-between items-center mb-6">
		<h2 class="text-2xl font-bold text-gray-900">コース管理</h2>
		<a
			href="/{username}/courses/create"
			class="text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
			style="background-color: {themeColor}"
		>
			新規コース作成
		</a>
	</div>
	
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
			{error}
		</div>
	{/if}
	
	<!-- Filters -->
	{#if spaces.length > 0}
		<div class="bg-white rounded-lg shadow p-4 mb-6">
			<div class="flex items-center space-x-4">
				<label for="spaceFilter" class="text-sm font-medium text-gray-700">
					スペースで絞り込み:
				</label>
				<select
					id="spaceFilter"
					bind:value={selectedSpace}
					class="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value="">すべてのスペース</option>
					{#each spaces as space}
						<option value={space.id}>{space.title}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}
	
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if spaces.length === 0}
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
			</svg>
			<h3 class="text-lg font-medium text-gray-900 mb-2">スペースがありません</h3>
			<p class="text-gray-600 mb-6">コースを作成するには、まずスペースが必要です。</p>
			<a
				href="/{username}/spaces/create"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
			>
				スペースを作成
			</a>
		</div>
	{:else if courses.length === 0}
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
			</svg>
			<h3 class="text-lg font-medium text-gray-900 mb-2">コースがありません</h3>
			<p class="text-gray-600 mb-6">最初のコースを作成しましょう。</p>
			<a
				href="/{username}/courses/create"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white hover:opacity-90 transition-opacity"
				style="background-color: {themeColor}"
			>
				新規コース作成
			</a>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow overflow-hidden">
			<div class="divide-y divide-gray-200">
				{#each filteredCourses as course}
					<div class="p-6 hover:bg-gray-50">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="flex items-center mb-2">
									<h3 class="text-lg font-medium text-gray-900 mr-3">
										{course.title}
									</h3>
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {course.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
										{course.is_published ? '公開中' : '非公開'}
									</span>
								</div>
								<p class="text-gray-600 mb-2">
									{course.description || '説明なし'}
								</p>
								<div class="flex items-center space-x-4 text-sm text-gray-500">
									<span>スペース: {course.space?.title}</span>
									<span>レッスン数: {course.lessons?.[0]?.count || 0}</span>
									<span>価格: {course.is_free ? '無料' : formatCurrency(course.price)}</span>
									<span>作成日: {formatDate(course.created_at)}</span>
								</div>
							</div>
							<div class="flex space-x-2 ml-4">
								<a
									href="/{username}/space/{course.space.slug}/course/{course.id}"
									target="_blank"
									class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors"
									title="公開コースページを新しいタブで開く"
								>
									<svg class="inline h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
									</svg>
									コースページ
								</a>
								<a
									href="/{username}/courses/{course.id}/edit"
									class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
								>
									コース編集
								</a>
								<a
									href="/{username}/courses/{course.id}/page-editor"
									class="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition-colors"
									title="コース詳細ページのコンテンツを編集"
								>
									ページ編集
								</a>
								<a
									href="/{username}/courses/{course.id}/lessons"
									class="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
								>
									レッスン管理
								</a>
								<a
									href="/{username}/courses/{course.id}/pricing"
									class="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
								>
									料金編集
								</a>
								<button
									on:click={() => deleteCourse(course.id)}
									class="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
								>
									削除
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>