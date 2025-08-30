<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	
	let space: any = null
	let student: any = null
	let profile: any = null
	let loading = true
	let error = ''
	let success = ''
	
	// 編集モード
	let editing = false
	let displayName = ''
	let email = ''
	let bio = ''
	
	onMount(async () => {
		await loadProfileData()
	})
	
	async function loadProfileData() {
		try {
			// まずスペース情報をslugから取得
			const { data: spaceData, error: spaceError } = await supabase
				.from('spaces')
				.select(`
					*,
					instructor:profiles!instructor_id(username, display_name)
				`)
				.eq('slug', slug)
				.single()
			
			if (spaceError || !spaceData) {
				throw new Error('スペースが見つかりません')
			}
			
			space = spaceData
			
			// 生徒がこのスペースに登録されているか確認
			const { data: studentData, error: studentError } = await supabase
				.from('space_students')
				.select('*')
				.eq('student_id', data.user.id)
				.eq('space_id', space.id)
				.single()
			
			if (studentError || !studentData) {
				throw new Error('このスペースに登録されていません')
			}
			
			student = studentData
			
			// プロフィール情報を取得
			const { data: profileInfo, error: profileInfoError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', data.user.id)
				.single()
			
			if (profileInfoError) throw profileInfoError
			
			profile = profileInfo
			displayName = profile.display_name || ''
			email = profile.email || ''
			bio = profile.bio || ''
			
		} catch (err: any) {
			error = err.message
			console.error('Load profile data error:', err)
		} finally {
			loading = false
		}
	}
	
	function startEdit() {
		editing = true
		displayName = profile.display_name || ''
		bio = profile.bio || ''
	}
	
	function cancelEdit() {
		editing = false
		displayName = profile.display_name || ''
		bio = profile.bio || ''
		error = ''
	}
	
	async function saveProfile() {
		try {
			error = ''
			success = ''
			
			const { error: updateError } = await supabase
				.from('profiles')
				.update({
					display_name: displayName,
					bio: bio
				})
				.eq('id', data.user.id)
			
			if (updateError) throw updateError
			
			// プロフィールを再読み込み
			await loadProfileData()
			
			editing = false
			success = 'プロフィールを更新しました'
			
			// 3秒後にメッセージを消す
			setTimeout(() => {
				success = ''
			}, 3000)
			
		} catch (err: any) {
			error = err.message || 'プロフィールの更新に失敗しました'
		}
	}
	
	function formatDate(dateString: string): string {
		const date = new Date(dateString)
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}
	
	function getStatusColor(status: string): string {
		switch(status) {
			case 'active': return 'bg-green-100 text-green-800'
			case 'completed': return 'bg-blue-100 text-blue-800'
			case 'suspended': return 'bg-red-100 text-red-800'
			default: return 'bg-gray-100 text-gray-800'
		}
	}
	
	function getStatusText(status: string): string {
		switch(status) {
			case 'active': return '学習中'
			case 'completed': return '修了済み'
			case 'suspended': return '停止中'
			default: return status
		}
	}
</script>

<svelte:head>
	<title>プロフィール - {space?.title || 'スペース'}</title>
</svelte:head>

<div>
	<div class="mb-8">
		<h2 class="text-2xl font-bold text-gray-900 mb-2">プロフィール</h2>
		<p class="text-gray-600">あなたのプロフィール情報を管理します</p>
	</div>
	
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error && !editing}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if profile}
		<div class="bg-white rounded-lg shadow">
			<!-- プロフィールヘッダー -->
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900">基本情報</h3>
					{#if !editing}
						<button
							on:click={startEdit}
							class="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
						>
							編集
						</button>
					{/if}
				</div>
			</div>
			
			<!-- プロフィール内容 -->
			<div class="px-6 py-4">
				{#if success}
					<div class="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
						{success}
					</div>
				{/if}
				
				{#if error && editing}
					<div class="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
						{error}
					</div>
				{/if}
				
				<div class="space-y-6">
					<!-- 表示名 -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							表示名
						</label>
						{#if editing}
							<input
								type="text"
								bind:value={displayName}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="表示名を入力"
							/>
						{:else}
							<p class="text-gray-900">{profile.display_name || '未設定'}</p>
						{/if}
					</div>
					
					<!-- メールアドレス（編集不可） -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							メールアドレス
						</label>
						<p class="text-gray-900">{profile.email}</p>
					</div>
					
					<!-- 自己紹介 -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							自己紹介
						</label>
						{#if editing}
							<textarea
								bind:value={bio}
								rows="4"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="自己紹介を入力"
							/>
						{:else}
							<p class="text-gray-900 whitespace-pre-wrap">{profile.bio || '未設定'}</p>
						{/if}
					</div>
					
					<!-- 編集ボタン -->
					{#if editing}
						<div class="flex space-x-3">
							<button
								on:click={saveProfile}
								class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								保存
							</button>
							<button
								on:click={cancelEdit}
								class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
							>
								キャンセル
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
		
		<!-- スペース登録情報 -->
		<div class="mt-6 bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<h3 class="text-lg font-medium text-gray-900">スペース登録情報</h3>
			</div>
			<div class="px-6 py-4">
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">スペース名</span>
						<span class="text-sm text-gray-900">{space.title}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">ステータス</span>
						<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(student.status)}">
							{getStatusText(student.status)}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">登録日</span>
						<span class="text-sm text-gray-900">{formatDate(student.enrolled_at)}</span>
					</div>
				</div>
			</div>
		</div>
		
		<!-- アカウント設定 -->
		<div class="mt-6 bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<h3 class="text-lg font-medium text-gray-900">アカウント設定</h3>
			</div>
			<div class="px-6 py-4">
				<div class="space-y-4">
					<div>
						<h4 class="text-sm font-medium text-gray-700 mb-2">パスワード変更</h4>
						<p class="text-sm text-gray-600 mb-3">
							パスワードを変更する場合は、登録メールアドレスにリセットリンクを送信します。
						</p>
						<button
							on:click={() => alert('パスワードリセット機能は準備中です')}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
						>
							パスワードをリセット
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>