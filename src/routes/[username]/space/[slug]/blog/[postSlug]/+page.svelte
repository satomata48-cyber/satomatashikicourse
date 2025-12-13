<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	$: username = $page.params.username
	$: spaceSlug = $page.params.slug
	$: postSlug = $page.params.postSlug

	let post: any = null
	let space: any = null
	let loading = true
	let error = ''

	onMount(async () => {
		await loadPost()
	})

	async function loadPost() {
		try {
			const response = await fetch(`/api/blog?username=${username}&space_slug=${spaceSlug}&slug=${postSlug}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '記事の取得に失敗しました')
			}

			post = result.post
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
	<title>{post?.title || '記事'} - {space?.title || 'ブログ'}</title>
	{#if post}
		<meta name="description" content={post.title} />
	{/if}
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- ヘッダー -->
	<header class="bg-white shadow-sm">
		<div class="max-w-4xl mx-auto px-4 py-6">
			<a
				href="/{username}/space/{spaceSlug}/blog"
				class="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center"
			>
				<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
				</svg>
				ブログ一覧に戻る
			</a>
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
		{:else if post}
			<article class="bg-white rounded-lg shadow-lg overflow-hidden">
				<!-- タイトルエリア -->
				<div class="px-8 py-12 border-b border-gray-100" style="background: linear-gradient(135deg, {getThemeColor()}10, {getThemeColor()}05)">
					<h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						{post.title}
					</h1>
					<div class="text-gray-500">
						{formatDate(post.published_at || post.created_at)}
					</div>
				</div>

				<!-- 本文 -->
				<div class="px-8 py-12">
					<div class="prose prose-lg max-w-none">
						{@html post.content}
					</div>
				</div>
			</article>

			<!-- フッター -->
			<div class="mt-8 text-center">
				<a
					href="/{username}/space/{spaceSlug}/blog"
					class="inline-flex items-center text-gray-600 hover:text-gray-900"
				>
					<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
					</svg>
					他の記事を見る
				</a>
			</div>
		{/if}
	</main>
</div>

<style>
	/* Prose スタイル */
	:global(.prose h1) { font-size: 2.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #111827; }
	:global(.prose h2) { font-size: 1.875rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #111827; }
	:global(.prose h3) { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #111827; }
	:global(.prose h4) { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #111827; }
	:global(.prose p) { margin-bottom: 1.25rem; line-height: 1.8; color: #374151; }
	:global(.prose ul) { margin-bottom: 1.25rem; padding-left: 1.5rem; list-style-type: disc; }
	:global(.prose ol) { margin-bottom: 1.25rem; padding-left: 1.5rem; list-style-type: decimal; }
	:global(.prose li) { margin-bottom: 0.5rem; line-height: 1.75; color: #374151; }
	:global(.prose blockquote) { border-left: 4px solid #e5e7eb; padding-left: 1.25rem; margin: 1.5rem 0; color: #6b7280; font-style: italic; }
	:global(.prose pre) { background-color: #1f2937; color: #f3f4f6; padding: 1.25rem; border-radius: 0.75rem; overflow-x: auto; margin: 1.5rem 0; }
	:global(.prose code) { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.875em; }
	:global(.prose :not(pre) > code) { background-color: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; }
	:global(.prose a) { color: #2563eb; text-decoration: underline; }
	:global(.prose a:hover) { color: #1d4ed8; }
	:global(.prose strong) { font-weight: 700; color: #111827; }
	:global(.prose em) { font-style: italic; }
	:global(.prose img) { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1.5rem 0; }
	:global(.prose hr) { border-top: 1px solid #e5e7eb; margin: 2rem 0; }
	:global(.prose table) { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
	:global(.prose th, .prose td) { border: 1px solid #e5e7eb; padding: 0.75rem 1rem; text-align: left; }
	:global(.prose th) { background-color: #f9fafb; font-weight: 600; }
</style>
