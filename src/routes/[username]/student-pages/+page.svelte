<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username

	let spaces: any[] = []
	let loading = true
	let error = ''
	let themeColor = '#3B82F6' // デフォルト
	let creatingTestStudent: { [key: string]: boolean } = {}
	let successMessage = ''

	onMount(async () => {
		await loadSpaces()
	})

	async function loadSpaces() {
		loading = true
		try {
			if (!username) {
				error = 'ユーザー名が必要です'
				return
			}

			// APIからスペース情報を取得
			const response = await fetch(`/api/spaces?username=${username}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'スペースの取得に失敗しました')
			}

			spaces = result.spaces || []
		} catch (err: any) {
			error = err.message
			console.error('Load spaces error:', err)
		} finally {
			loading = false
		}
	}

	async function createTestStudent(spaceId: string) {
		creatingTestStudent[spaceId] = true
		error = ''
		successMessage = ''

		try {
			const response = await fetch('/api/create-test-student', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ spaceId })
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'テスト生徒の作成に失敗しました')
			}

			successMessage = 'テスト生徒アカウント（satomata48@gmail.com）が作成され、このスペースに登録されました。パスワード: satomata4848'
		} catch (err: any) {
			error = err.message
		} finally {
			creatingTestStudent[spaceId] = false
		}
	}
</script>

<div class="max-w-7xl mx-auto">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">生徒ページ管理</h1>
		<p class="mt-2 text-gray-600">生徒が実際に見ているページを確認できます</p>
	</div>

	{#if successMessage}
		<div class="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
			<svg class="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
			<div>
				<p class="font-medium">成功</p>
				<p class="text-sm mt-1">{successMessage}</p>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if spaces.length === 0}
		<div class="text-center py-12 bg-white rounded-lg shadow">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">スペースがありません</h3>
			<p class="mt-1 text-sm text-gray-500">まずスペースを作成してください</p>
			<div class="mt-6">
				<a
					href="/{username}/spaces/create"
					class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
				>
					<svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
					</svg>
					スペースを作成
				</a>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each spaces as space}
				{@const primaryColor = space.landing_page_content?.theme?.primaryColor || '#3B82F6'}
				{@const courseCount = space.course_count || 0}

				<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
					<!-- ヘッダー -->
					<div class="p-6 border-b border-gray-200" style="background: linear-gradient(135deg, {primaryColor}15, {primaryColor}05)">
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<h3 class="text-xl font-bold text-gray-900 truncate">
									{space.title}
								</h3>
								{#if space.description}
									<p class="mt-2 text-sm text-gray-600 line-clamp-2">
										{space.description}
									</p>
								{/if}
							</div>
							<div class="ml-3 flex-shrink-0">
								{#if space.is_active}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
										公開中
									</span>
								{:else}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
										非公開
									</span>
								{/if}
							</div>
						</div>
					</div>

					<!-- 統計情報 -->
					<div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
						<div class="flex items-center text-sm text-gray-600">
							<svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
							</svg>
							<span>{courseCount} コース</span>
						</div>
					</div>

					<!-- アクションボタン -->
					<div class="px-6 py-4 space-y-2">
					<button
						on:click={() => createTestStudent(space.id)}
						disabled={creatingTestStudent[space.id]}
						class="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{#if creatingTestStudent[space.id]}
							<svg class="animate-spin h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
							</svg>
							作成中...
						{:else}
							<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
							</svg>
							テスト生徒を作成
						{/if}
					</button>

						<a
							href="/{username}/space/{space.slug}/student/login"
							target="_blank"
							class="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:opacity-90 transition-opacity"
							style="background-color: {primaryColor || '#3B82F6'}"
						>
							<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
							</svg>
							生徒ダッシュボード
							<svg class="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
							</svg>
						</a>

						<a
							href="/{username}/space/{space.slug}"
							target="_blank"
							class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
						>
							<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
							</svg>
							ランディングページ
							<svg class="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
							</svg>
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
