<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	$: username = $page.params.username
	$: spaceSlug = $page.params.slug
	$: postId = $page.params.id

	let post: any = null
	let space: any = null
	let loading = true
	let saving = false
	let error = ''
	let themeColor = '#3B82F6'

	// 編集フィールド
	let title = ''
	let slug = ''
	let content = ''
	let isPublished = false

	// プレビューモード
	let showPreview = false

	onMount(async () => {
		if (postId && spaceSlug && username) {
			await loadSpace()
			await loadPost()
		}
	})

	async function loadSpace() {
		try {
			const response = await fetch(`/api/spaces?username=${username}&slug=${spaceSlug}`)
			const result = await response.json()
			if (response.ok && result.space) {
				space = result.space
				if (space?.landing_page_content?.theme?.primaryColor) {
					themeColor = space.landing_page_content.theme.primaryColor
				}
			}
		} catch (err) {
			console.error('Failed to load space:', err)
		}
	}

	async function loadPost() {
		loading = true
		try {
			const response = await fetch(`/api/blog?id=${postId}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '記事の取得に失敗しました')
			}

			post = result.post
			title = post.title || ''
			slug = post.slug || ''
			content = post.content || ''
			isPublished = !!post.is_published
		} catch (err: any) {
			error = err.message
		} finally {
			loading = false
		}
	}

	async function savePost() {
		if (!title.trim()) {
			alert('タイトルを入力してください')
			return
		}

		saving = true
		try {
			const response = await fetch('/api/blog', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: postId,
					title,
					slug,
					content,
					is_published: isPublished
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '保存に失敗しました')
			}

			post = result.post
			alert('保存しました')
		} catch (err: any) {
			alert(`保存に失敗しました: ${err.message}`)
		} finally {
			saving = false
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		// Ctrl+S / Cmd+S で保存
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault()
			savePost()
		}
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="max-w-6xl mx-auto">
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2" style="border-color: {themeColor}"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if post}
		<!-- ヘッダー -->
		<div class="flex justify-between items-center mb-6">
			<div class="flex items-center space-x-4">
				<a
					href="/{username}/spaces/{spaceSlug}/blog"
					class="text-gray-600 hover:text-gray-900"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
					</svg>
				</a>
				<h2 class="text-2xl font-bold text-gray-900">記事を編集</h2>
			</div>
			<div class="flex items-center space-x-3">
				<a
					href="/{username}/space/{spaceSlug}/blog/{slug}"
					target="_blank"
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
				>
					公開ページを確認
				</a>
				<button
					on:click={() => showPreview = !showPreview}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					{showPreview ? 'エディタ' : 'プレビュー'}
				</button>
				<label class="flex items-center space-x-2">
					<input
						type="checkbox"
						bind:checked={isPublished}
						class="rounded border-gray-300 focus:ring-2"
						style="color: {themeColor}"
					/>
					<span class="text-sm text-gray-700">公開</span>
				</label>
				<button
					on:click={savePost}
					disabled={saving}
					class="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
					style="background-color: {themeColor}"
				>
					{saving ? '保存中...' : '保存 (Ctrl+S)'}
				</button>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<!-- タイトル -->
			<div class="mb-4">
				<label for="title" class="block text-sm font-medium text-gray-700 mb-1">
					タイトル
				</label>
				<input
					id="title"
					type="text"
					bind:value={title}
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-lg focus:ring-2 focus:border-transparent"
					placeholder="記事のタイトル"
				/>
			</div>

			<!-- スラッグ -->
			<div class="mb-6">
				<label for="slug" class="block text-sm font-medium text-gray-700 mb-1">
					スラッグ（URL）
				</label>
				<input
					id="slug"
					type="text"
					bind:value={slug}
					class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:border-transparent"
					placeholder="url-slug"
				/>
			</div>

			<!-- コンテンツ -->
			{#if showPreview}
				<div class="border border-gray-200 rounded-lg p-6 min-h-[500px]">
					<div class="prose prose-lg max-w-none">
						{@html content}
					</div>
				</div>
			{:else}
				<div>
					<label for="content" class="block text-sm font-medium text-gray-700 mb-1">
						本文（HTML）
					</label>
					<p class="text-xs text-gray-500 mb-2">
						NotionスタイルのHTMLを直接入力できます。LLMで生成したHTMLをペーストしてください。
					</p>
					<textarea
						id="content"
						bind:value={content}
						class="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:ring-2 focus:border-transparent"
						rows="25"
						placeholder="<h2>見出し</h2>
<p>段落テキスト</p>
<ul>
  <li>リストアイテム</li>
</ul>"
					></textarea>
				</div>
			{/if}
		</div>

		<!-- HTMLテンプレートヒント -->
		<div class="mt-6 bg-gray-50 rounded-lg p-4">
			<h3 class="text-sm font-medium text-gray-700 mb-2">HTMLテンプレート例</h3>
			<pre class="text-xs text-gray-600 overflow-x-auto"><code>{`<article class="prose prose-lg">
  <h2>見出し2</h2>
  <p>段落テキストです。<strong>太字</strong>や<em>斜体</em>も使えます。</p>

  <h3>見出し3</h3>
  <ul>
    <li>箇条書きアイテム1</li>
    <li>箇条書きアイテム2</li>
  </ul>

  <blockquote>
    <p>引用テキスト</p>
  </blockquote>

  <pre><code>コードブロック</code></pre>
</article>`}</code></pre>
		</div>
	{/if}
</div>

<style>
	/* Prose スタイル（簡易版） */
	:global(.prose h1) { font-size: 2.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 1rem; }
	:global(.prose h2) { font-size: 1.875rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; }
	:global(.prose h3) { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
	:global(.prose p) { margin-bottom: 1rem; line-height: 1.75; }
	:global(.prose ul, .prose ol) { margin-bottom: 1rem; padding-left: 1.5rem; }
	:global(.prose li) { margin-bottom: 0.25rem; }
	:global(.prose blockquote) { border-left: 4px solid #e5e7eb; padding-left: 1rem; margin: 1rem 0; color: #6b7280; }
	:global(.prose pre) { background-color: #1f2937; color: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
	:global(.prose code) { font-family: monospace; }
	:global(.prose a) { color: #2563eb; text-decoration: underline; }
	:global(.prose strong) { font-weight: 700; }
	:global(.prose em) { font-style: italic; }
</style>
