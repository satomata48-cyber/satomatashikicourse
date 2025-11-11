<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username
	$: slug = $page.params.slug

	let space: any = null
	let courses: any[] = []
	let students: any[] = []
	let loading = true
	let error = ''

	onMount(async () => {
		await loadSpaceData()
	})

	async function loadSpaceData() {
		try {
			// スペース情報を取得
			const response = await fetch(`/api/spaces?username=${username}&slug=${slug}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'スペースの取得に失敗しました')
			}

			space = result.space

			// コース一覧と生徒一覧は今後実装予定
			courses = []
			students = []

		} catch (err: any) {
			error = err.message
			console.error('Load space data error:', err)
		} finally {
			loading = false
		}
	}

	function formatDate(timestamp: number | string): string {
		if (typeof timestamp === 'number') {
			return new Date(timestamp * 1000).toLocaleDateString('ja-JP')
		}
		return new Date(timestamp).toLocaleDateString('ja-JP')
	}
	
	function formatCurrency(price: number): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(price)
	}
</script>

<div>
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if space}
		<!-- Header -->
		<div class="flex justify-between items-start mb-6">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 mb-2">{space.title}</h1>
				<p class="text-gray-600 mb-4">{space.description}</p>
				<div class="flex items-center space-x-4 text-sm text-gray-500">
					<span>作成日: {formatDate(space.created_at)}</span>
					<span>最大生徒数: {space.max_students}名</span>
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {space.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
						{space.is_active ? 'アクティブ' : '非アクティブ'}
					</span>
				</div>
			</div>
			<div class="flex space-x-3">
				<a
					href="/{username}/spaces/{slug}/edit"
					class="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
				>
					編集
				</a>
				<a
					href="/{username}/spaces/{slug}/page-editor"
					class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
				>
					ページ編集
				</a>
			</div>
		</div>
		
		<!-- Stats -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">コース数</p>
						<p class="text-2xl font-semibold text-gray-900">{courses.length}</p>
					</div>
					<div class="p-3 bg-blue-100 rounded-full">
						<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">生徒数</p>
						<p class="text-2xl font-semibold text-gray-900">{students.length}</p>
					</div>
					<div class="p-3 bg-green-100 rounded-full">
						<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">公開URL</p>
						<a
							href="/{username}/space/{slug}"
							target="_blank"
							class="text-sm text-blue-600 hover:text-blue-800 break-all"
						>
							/{username}/space/{slug}
						</a>
					</div>
					<div class="p-3 bg-purple-100 rounded-full">
						<svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"/>
						</svg>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Courses -->
		<div class="mb-8">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-semibold text-gray-900">コース一覧</h2>
				<a
					href="/{username}/courses/create?space_id={space.id}"
					class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
				>
					新規コース作成
				</a>
			</div>
			
			{#if courses.length === 0}
				<div class="bg-white rounded-lg shadow p-6 text-center">
					<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
					</svg>
					<h3 class="text-lg font-medium text-gray-900 mb-2">コースがありません</h3>
					<p class="text-gray-600 mb-4">最初のコースを作成しましょう</p>
					<a
						href="/{username}/courses/create?space_id={space.id}"
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
					>
						新規コース作成
					</a>
				</div>
			{:else}
				<div class="bg-white rounded-lg shadow overflow-hidden">
					<div class="divide-y divide-gray-200">
						{#each courses as course}
							<div class="p-6 hover:bg-gray-50">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<h3 class="text-lg font-medium text-gray-900 mb-1">
											{course.title}
										</h3>
										<p class="text-gray-600 mb-2">
											{course.description || '説明なし'}
										</p>
										<div class="flex items-center space-x-4 text-sm text-gray-500">
											<span>レッスン数: {course.lessons?.[0]?.count || 0}</span>
											<span>価格: {course.is_free ? '無料' : formatCurrency(course.price)}</span>
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {course.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
												{course.is_published ? '公開中' : '非公開'}
											</span>
										</div>
									</div>
									<div class="flex space-x-2 ml-4">
										<a
											href="/{username}/courses/{course.id}/edit"
											class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
										>
											編集
										</a>
										<a
											href="/{username}/courses/{course.id}/lessons"
											class="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
										>
											レッスン管理
										</a>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
		
		<!-- Students -->
		<div>
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-semibold text-gray-900">生徒一覧</h2>
				<a
					href="/{username}/spaces/{slug}/students"
					class="text-blue-600 hover:text-blue-800 text-sm font-medium"
				>
					すべて見る →
				</a>
			</div>
			
			{#if students.length === 0}
				<div class="bg-white rounded-lg shadow p-6 text-center">
					<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
					</svg>
					<h3 class="text-lg font-medium text-gray-900 mb-2">生徒がいません</h3>
					<p class="text-gray-600">まだ誰も登録していません</p>
				</div>
			{:else}
				<div class="bg-white rounded-lg shadow overflow-hidden">
					<div class="divide-y divide-gray-200">
						{#each students.slice(0, 5) as student}
							<div class="p-4 flex items-center justify-between">
								<div>
									<p class="font-medium text-gray-900">{student.profile?.display_name}</p>
									<p class="text-sm text-gray-600">{student.profile?.email}</p>
								</div>
								<div class="text-sm text-gray-500">
									{formatDate(student.enrolled_at)}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>