<script lang="ts">
	import { onMount } from 'svelte'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	let spaces: any[] = []
	let loading = true
	let error = ''
	
	$: uuid = $page.params.uuid
	
	onMount(async () => {
		await loadSpaces()
	})
	
	async function loadSpaces() {
		try {
			const { data: spacesData, error: spacesError } = await supabase
				.from('spaces')
				.select(`
					*,
					courses:courses(count)
				`)
				.eq('instructor_id', data.user.id)
				.order('created_at', { ascending: false })
			
			if (spacesError) throw spacesError
			
			spaces = spacesData || []
		} catch (err: any) {
			error = err.message
			console.error('Load spaces error:', err)
		} finally {
			loading = false
		}
	}
	
	async function deleteSpace(spaceId: string) {
		if (!confirm('このスペースを削除してもよろしいですか？関連するコースもすべて削除されます。')) {
			return
		}
		
		try {
			const { error: deleteError } = await supabase
				.from('spaces')
				.delete()
				.eq('id', spaceId)
			
			if (deleteError) throw deleteError
			
			await loadSpaces()
		} catch (err: any) {
			alert(`削除に失敗しました: ${err.message}`)
		}
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('ja-JP')
	}
</script>

<div>
	<div class="flex justify-between items-center mb-6">
		<h2 class="text-2xl font-bold text-gray-900">スペース管理</h2>
		<a
			href="/{uuid}/spaces/create"
			class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
		>
			新規スペース作成
		</a>
	</div>
	
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
			{error}
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
			<p class="text-gray-600 mb-6">最初のスペースを作成して、コースの販売を始めましょう。</p>
			<a
				href="/{uuid}/spaces/create"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
			>
				新規スペース作成
			</a>
		</div>
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each spaces as space}
				<div class="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
					<div class="p-6">
						<div class="flex items-start justify-between mb-4">
							<div class="flex-1">
								<h3 class="text-lg font-semibold text-gray-900 mb-1">
									{space.title}
								</h3>
								<p class="text-sm text-gray-600 line-clamp-2">
									{space.description || '説明なし'}
								</p>
							</div>
							<div class="flex items-center text-sm text-gray-500">
								{#if space.is_active}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
										アクティブ
									</span>
								{:else}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
										非アクティブ
									</span>
								{/if}
							</div>
						</div>
						
						<div class="flex items-center justify-between text-sm text-gray-500 mb-4">
							<span>作成日: {formatDate(space.created_at)}</span>
							<span>コース数: {space.courses?.[0]?.count || 0}</span>
						</div>
						
						<div class="grid grid-cols-2 gap-2">
							<a
								href="/{uuid}/spaces/{space.slug}"
								class="text-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
							>
								詳細
							</a>
							<a
								href="/{uuid}/spaces/{space.slug}/edit"
								class="text-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
							>
								編集
							</a>
							<a
								href="/{uuid}/spaces/{space.slug}/page-editor"
								class="text-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-50"
							>
								<svg class="h-4 w-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
								</svg>
								ページエディター
							</a>
							<button
								on:click={() => deleteSpace(space.id)}
								class="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
							>
								削除
							</button>
						</div>
						
						<div class="mt-4 pt-4 border-t border-gray-200">
							<a
								href="/{uuid}/space/{space.slug}"
								target="_blank"
								class="text-sm text-blue-600 hover:text-blue-800 flex items-center"
							>
								<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"/>
								</svg>
								公開ページを見る
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>