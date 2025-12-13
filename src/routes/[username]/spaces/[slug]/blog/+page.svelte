<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	$: username = $page.params.username
	$: spaceSlug = $page.params.slug

	let posts: any[] = []
	let space: any = null
	let loading = true
	let error = ''
	let themeColor = '#3B82F6'

	// 新規作成用
	let showCreateModal = false
	let newPostTitle = ''
	let newPostSlug = ''
	let creating = false

	onMount(async () => {
		if (username && spaceSlug && username !== 'undefined' && spaceSlug !== 'undefined') {
			await loadSpace()
		}
	})

	async function loadSpace() {
		try {
			const response = await fetch(`/api/spaces?username=${username}&slug=${spaceSlug}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'スペースの取得に失敗しました')
			}

			space = result.space
			if (space?.landing_page_content?.theme?.primaryColor) {
				themeColor = space.landing_page_content.theme.primaryColor
			}

			await loadPosts()
		} catch (err: any) {
			error = err.message
			loading = false
		}
	}

	async function loadPosts() {
		if (!space) return

		loading = true
		try {
			const response = await fetch(`/api/blog?space_id=${space.id}&include_unpublished=true`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '記事の取得に失敗しました')
			}

			posts = result.posts || []
		} catch (err: any) {
			error = err.message
		} finally {
			loading = false
		}
	}

	function generateSlug(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '')
			.replace(/\s+/g, '-')
			.substring(0, 50) || 'post-' + Date.now()
	}

	async function createPost() {
		if (!newPostTitle.trim() || !space) return

		creating = true
		try {
			const slug = newPostSlug.trim() || generateSlug(newPostTitle)

			const response = await fetch('/api/blog', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					space_id: space.id,
					title: newPostTitle,
					slug,
					content: '',
					is_published: false
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '作成に失敗しました')
			}

			// モーダルを閉じてリストを更新
			showCreateModal = false
			newPostTitle = ''
			newPostSlug = ''
			posts = [result.post, ...posts]
		} catch (err: any) {
			alert(`作成に失敗しました: ${err.message}`)
		} finally {
			creating = false
		}
	}

	async function deletePost(postId: string) {
		if (!confirm('この記事を削除してもよろしいですか？')) return

		try {
			const response = await fetch(`/api/blog?id=${postId}`, {
				method: 'DELETE'
			})

			if (!response.ok) {
				const result = await response.json()
				throw new Error(result.error || '削除に失敗しました')
			}

			posts = posts.filter(p => p.id !== postId)
		} catch (err: any) {
			alert(`削除に失敗しました: ${err.message}`)
		}
	}

	async function togglePublish(post: any) {
		try {
			const response = await fetch('/api/blog', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: post.id,
					is_published: !post.is_published
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '更新に失敗しました')
			}

			posts = posts.map(p => p.id === post.id ? result.post : p)
		} catch (err: any) {
			alert(`更新に失敗しました: ${err.message}`)
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('ja-JP')
	}
</script>

<div>
	<div class="flex justify-between items-center mb-6">
		<div>
			<a href="/{username}/spaces/{spaceSlug}" class="text-sm text-gray-500 hover:text-gray-700 mb-1 inline-block">
				&larr; {space?.title || 'スペース'}に戻る
			</a>
			<h2 class="text-2xl font-bold text-gray-900">ブログ管理</h2>
		</div>
		<button
			on:click={() => showCreateModal = true}
			class="text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
			style="background-color: {themeColor}"
		>
			新規記事作成
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2" style="border-color: {themeColor}"></div>
		</div>
	{:else if posts.length === 0}
		<div class="text-center py-12 bg-white rounded-lg shadow">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
			</svg>
			<h3 class="text-lg font-medium text-gray-900 mb-2">記事がありません</h3>
			<p class="text-gray-600 mb-6">最初のブログ記事を作成しましょう。</p>
			<button
				on:click={() => showCreateModal = true}
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white hover:opacity-90 transition-opacity"
				style="background-color: {themeColor}"
			>
				新規記事作成
			</button>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow overflow-hidden">
			<div class="divide-y divide-gray-200">
				{#each posts as post}
					<div class="p-6 hover:bg-gray-50">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="flex items-center mb-2">
									<h3 class="text-lg font-medium text-gray-900 mr-3">
										{post.title}
									</h3>
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {post.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
										{post.is_published ? '公開中' : '下書き'}
									</span>
								</div>
								<div class="flex items-center space-x-4 text-sm text-gray-500">
									<span>スラッグ: {post.slug}</span>
									<span>作成日: {formatDate(post.created_at)}</span>
									{#if post.published_at}
										<span>公開日: {formatDate(post.published_at)}</span>
									{/if}
								</div>
							</div>
							<div class="flex space-x-2 ml-4">
								<a
									href="/{username}/space/{spaceSlug}/blog/{post.slug}"
									target="_blank"
									class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors"
									title="公開ページを確認"
								>
									<svg class="inline h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
									</svg>
									表示
								</a>
								<a
									href="/{username}/spaces/{spaceSlug}/blog/{post.id}"
									class="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
								>
									編集
								</a>
								<button
									on:click={() => togglePublish(post)}
									class="text-sm px-3 py-1 rounded transition-colors {post.is_published ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}"
								>
									{post.is_published ? '非公開にする' : '公開する'}
								</button>
								<button
									on:click={() => deletePost(post.id)}
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

<!-- 新規作成モーダル -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h3 class="text-lg font-bold text-gray-900 mb-4">新規ブログ記事</h3>

			<div class="space-y-4">
				<div>
					<label for="title" class="block text-sm font-medium text-gray-700 mb-1">
						タイトル <span class="text-red-500">*</span>
					</label>
					<input
						id="title"
						type="text"
						bind:value={newPostTitle}
						class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="記事のタイトル"
					/>
				</div>

				<div>
					<label for="slug" class="block text-sm font-medium text-gray-700 mb-1">
						スラッグ（URL用）
					</label>
					<input
						id="slug"
						type="text"
						bind:value={newPostSlug}
						class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="空欄の場合は自動生成"
					/>
					<p class="text-xs text-gray-500 mt-1">英数字とハイフンのみ推奨</p>
				</div>
			</div>

			<div class="flex justify-end space-x-3 mt-6">
				<button
					on:click={() => { showCreateModal = false; newPostTitle = ''; newPostSlug = '' }}
					class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
				>
					キャンセル
				</button>
				<button
					on:click={createPost}
					disabled={!newPostTitle.trim() || creating}
					class="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
					style="background-color: {themeColor}"
				>
					{creating ? '作成中...' : '作成'}
				</button>
			</div>
		</div>
	</div>
{/if}
