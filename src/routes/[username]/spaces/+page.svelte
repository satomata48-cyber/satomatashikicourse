<script lang="ts">
	import { onMount, tick } from 'svelte'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	let spaces: any[] = []
	let loading = true
	let error = ''
	let initialized = false
	
	$: username = $page.params.username
	let redirecting = false
	
	// リアクティブ文でリダイレクト処理
	$: if (username === 'undefined' && !redirecting) {
		redirecting = true
		handleUndefinedUsername()
	}
	
	async function handleUndefinedUsername() {
		try {
			const { data: { user } } = await supabase.auth.getUser()
			if (user) {
				// プロフィールからusernameを取得
				const { data: profileData } = await supabase
					.from('profiles')
					.select('username')
					.eq('id', user.id)
					.single()
				
				if (profileData?.username) {
					goto(`/${profileData.username}/spaces`)
					return
				} else {
					// usernameが未設定の場合はセットアップページへ
					goto('/profile/setup')
					return
				}
			} else {
				// ログインしていない場合はログインページへ
				goto('/login')
				return
			}
		} catch (err) {
			console.error('Redirect error:', err)
			goto('/login')
		}
	}
	
	// usernameが設定されたらデータをロード（シンプルな実装）
	$: if (username && username !== 'undefined' && !redirecting) {
		if (!initialized) {
			initialized = true
			loadSpaces()
		}
	}
	
	async function loadSpaces() {
		loading = true
		try {
			// URLのusernameからuser_idを取得して instructor_idとして使用
			// まずユーザーネームから実際のuser_idを取得
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('id')
				.eq('username', username)
				.single()
			
			if (profileError) {
				console.error('Profile error:', profileError)
				if (profileError.code === 'PGRST116') {
					error = `ユーザー "${username}" が見つかりません`
				} else {
					error = 'プロフィール情報の取得に失敗しました'
				}
				loading = false
				return
			}
			
			if (!profileData) {
				error = 'ユーザーが見つかりません'
				loading = false
				return
			}
			const { data: spacesData, error: spacesError } = await supabase
				.from('spaces')
				.select(`
					*,
					courses:courses(count),
					students:space_students(count)
				`)
				.eq('instructor_id', profileData.id)
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
			href="/{username}/spaces/create"
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
				href="/{username}/spaces/create"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
			>
				新規スペース作成
			</a>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow overflow-hidden">
			<div class="divide-y divide-gray-200">
				{#each spaces as space}
					<div class="p-6 hover:bg-gray-50">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="flex items-center mb-2">
									<h3 class="text-lg font-medium text-gray-900 mr-3">
										{space.title}
									</h3>
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {space.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
										{space.is_active ? 'アクティブ' : '非アクティブ'}
									</span>
								</div>
								<p class="text-gray-600 mb-2">
									{space.description || '説明なし'}
								</p>
								<div class="flex items-center space-x-4 text-sm text-gray-500">
									<span>スラッグ: {space.slug}</span>
									<span>コース数: {space.courses?.[0]?.count || 0}</span>
									<span>生徒数: {space.students?.[0]?.count || 0}</span>
									<span>作成日: {formatDate(space.created_at)}</span>
								</div>
							</div>
							<div class="flex space-x-2 ml-4">
								<a
									href="/{username}/spaces/{space.slug}"
									class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
								>
									詳細
								</a>
								<a
									href="/{username}/spaces/{space.slug}/edit"
									class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
								>
									編集
								</a>
								<a
									href="/{username}/spaces/{space.slug}/page-editor"
									class="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
								>
									ページエディター
								</a>
								<a
									href="/{username}/space/{space.slug}"
									target="_blank"
									class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors"
									title="公開スペースページを新しいタブで開く"
								>
									<svg class="inline h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
									</svg>
									公開ページ
								</a>
								<a
									href="/{username}/spaces/{space.slug}/students"
									class="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition-colors"
								>
									生徒管理
								</a>
								<button
									on:click={() => deleteSpace(space.id)}
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