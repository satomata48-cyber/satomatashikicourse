<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	$: username = $page.params.username
	$: spaceSlug = $page.params.slug

	let posts: any[] = []
	let space: any = null
	let loading = true
	let error = ''

	onMount(async () => {
		await loadPosts()
	})

	async function loadPosts() {
		try {
			const response = await fetch(`/api/blog?username=${username}&space_slug=${spaceSlug}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '記事の取得に失敗しました')
			}

			posts = result.posts || []
			space = result.space
		} catch (err: any) {
			error = err.message
		} finally {
			loading = false
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}

	function getThemeColor(): string {
		return space?.landing_page_content?.theme?.primaryColor || '#3B82F6'
	}
</script>

<svelte:head>
	<title>{space?.title || 'ブログ'} - ブログ</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- ヘッダー -->
	<header class="bg-white shadow-sm">
		<div class="max-w-4xl mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div>
					<a
						href="/{username}/space/{spaceSlug}"
						class="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
					>
						&larr; {space?.title || 'スペース'}に戻る
					</a>
					<h1 class="text-3xl font-bold text-gray-900">ブログ</h1>
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-4xl mx-auto px-4 py-8">
		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2" style="border-color: {getThemeColor()}"></div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
				{error}
			</div>
		{:else if posts.length === 0}
			<div class="text-center py-12">
				<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
				</svg>
				<h3 class="text-lg font-medium text-gray-900 mb-2">まだ記事がありません</h3>
			</div>
		{:else}
			<div class="space-y-6">
				{#each posts as post}
					<a
						href="/{username}/space/{spaceSlug}/blog/{post.slug}"
						class="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
					>
						<article>
							<h2 class="text-xl font-bold text-gray-900 mb-2 hover:opacity-80" style="color: {getThemeColor()}">
								{post.title}
							</h2>
							<div class="text-sm text-gray-500">
								{formatDate(post.published_at || post.created_at)}
							</div>
						</article>
					</a>
				{/each}
			</div>
		{/if}
	</main>
</div>
