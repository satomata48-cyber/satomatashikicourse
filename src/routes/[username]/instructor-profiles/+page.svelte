<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username

	let loading = false
	let error = ''
	let successMessage = ''
	let instructorProfiles: any[] = []
	let showCreateModal = false
	let showDeleteModal = false
	let deleteTargetId: string | null = null

	// 新規作成フォーム
	let newProfile = {
		display_name: '',
		username: '',
		bio: '',
		avatar_url: ''
	}

	onMount(async () => {
		// TODO: 複数講師プロフィール機能は現在実装中です
		// 現在は単一のプロフィールのみサポートしています
		error = 'この機能は現在実装中です。現在は単一の講師プロフィールのみサポートしています。'
	})

	async function loadProfiles() {
		// TODO: 実装が必要
	}

	async function handleCreateProfile() {
		error = 'この機能は現在実装中です'
	}

	async function handleSetPrimary(profileId: string) {
		error = 'この機能は現在実装中です'
	}

	async function handleToggleActive(profileId: string, currentStatus: boolean) {
		error = 'この機能は現在実装中です'
	}

	function openDeleteModal(profileId: string) {
		error = 'この機能は現在実装中です'
	}

	async function handleDelete() {
		error = 'この機能は現在実装中です'
	}

	function goToEdit(profileUsername: string) {
		goto(`/${profileUsername}/profile`)
	}
</script>

<svelte:head>
	<title>講師プロフィール管理 | 講師ダッシュボード</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
	<!-- Header -->
	<div class="mb-6 flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">講師プロフィール管理</h1>
			<p class="text-gray-600 mt-2">複数の講師ペルソナを作成・管理できます</p>
		</div>
		<button
			on:click={() => showCreateModal = true}
			class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
			</svg>
			<span>新規プロフィール作成</span>
		</button>
	</div>

	<!-- エラーメッセージ -->
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
			{error}
		</div>
	{/if}

	<!-- 成功メッセージ -->
	{#if successMessage}
		<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
			{successMessage}
		</div>
	{/if}

	<!-- プロフィール一覧 -->
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if instructorProfiles.length === 0}
		<div class="bg-white rounded-lg shadow-sm p-12 text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
			</svg>
			<h3 class="text-xl font-semibold text-gray-900 mb-2">講師プロフィールがありません</h3>
			<p class="text-gray-600 mb-6">最初の講師プロフィールを作成しましょう</p>
			<button
				on:click={() => showCreateModal = true}
				class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
			>
				プロフィールを作成
			</button>
		</div>
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each instructorProfiles as profile}
				<div class="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
					<!-- プライマリバッジ -->
					{#if profile.is_primary}
						<div class="bg-blue-600 text-white px-4 py-2 text-sm font-medium flex items-center">
							<svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
								<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
							</svg>
							プライマリプロフィール
						</div>
					{/if}

					<div class="p-6">
						<!-- アバター -->
						<div class="flex items-center space-x-4 mb-4">
							{#if profile.avatar_url}
								<img src={profile.avatar_url} alt={profile.display_name} class="h-16 w-16 rounded-full object-cover" />
							{:else}
								<div class="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
									<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
									</svg>
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-semibold text-gray-900 truncate">{profile.display_name}</h3>
								<p class="text-sm text-gray-500">@{profile.username}</p>
							</div>
						</div>

						<!-- 自己紹介 -->
						{#if profile.bio}
							<p class="text-sm text-gray-600 mb-4 line-clamp-3">{profile.bio}</p>
						{:else}
							<p class="text-sm text-gray-400 mb-4 italic">自己紹介が設定されていません</p>
						{/if}

						<!-- ステータスバッジ -->
						<div class="mb-4">
							{#if profile.is_active}
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
									<svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
									</svg>
									有効
								</span>
							{:else}
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
									無効
								</span>
							{/if}
						</div>

						<!-- アクション -->
						<div class="flex flex-col space-y-2">
							<button
								on:click={() => goToEdit(profile.username)}
								class="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
							>
								編集
							</button>

							{#if !profile.is_primary}
								<button
									on:click={() => handleSetPrimary(profile.id)}
									class="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
								>
									プライマリに設定
								</button>
							{/if}

							<button
								on:click={() => handleToggleActive(profile.id, profile.is_active)}
								class="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
							>
								{profile.is_active ? '無効化' : '有効化'}
							</button>

							<button
								on:click={() => openDeleteModal(profile.id)}
								class="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
							>
								削除
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- 新規作成モーダル -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6">
				<h2 class="text-2xl font-bold text-gray-900 mb-4">新規講師プロフィール作成</h2>

				<div class="space-y-4">
					<!-- 表示名 -->
					<div>
						<label for="display_name" class="block text-sm font-medium text-gray-700 mb-2">
							表示名 <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							id="display_name"
							bind:value={newProfile.display_name}
							placeholder="山田 太郎"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>

					<!-- ユーザー名 -->
					<div>
						<label for="username" class="block text-sm font-medium text-gray-700 mb-2">
							ユーザー名 <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							id="username"
							bind:value={newProfile.username}
							placeholder="yamada-taro"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<p class="text-xs text-gray-500 mt-1">英数字、ハイフン、アンダースコアのみ使用可能</p>
					</div>

					<!-- 自己紹介 -->
					<div>
						<label for="bio" class="block text-sm font-medium text-gray-700 mb-2">
							自己紹介
						</label>
						<textarea
							id="bio"
							bind:value={newProfile.bio}
							rows="4"
							placeholder="あなたの経歴、専門分野、教育理念など..."
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
						></textarea>
					</div>

					<!-- アバターURL -->
					<div>
						<label for="avatar_url" class="block text-sm font-medium text-gray-700 mb-2">
							アバター画像URL
						</label>
						<input
							type="url"
							id="avatar_url"
							bind:value={newProfile.avatar_url}
							placeholder="https://example.com/avatar.jpg"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<p class="text-xs text-gray-500 mt-1">後で詳細編集画面でアップロードできます</p>
					</div>
				</div>

				<!-- ボタン -->
				<div class="flex justify-end space-x-3 mt-6">
					<button
						on:click={() => showCreateModal = false}
						class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
					>
						キャンセル
					</button>
					<button
						on:click={handleCreateProfile}
						class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						作成
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- 削除確認モーダル -->
{#if showDeleteModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<h3 class="text-lg font-bold text-gray-900 mb-4">プロフィールを削除しますか？</h3>
			<p class="text-gray-600 mb-6">この操作は取り消せません。このプロフィールに関連するスペースやコースも影響を受ける可能性があります。</p>

			<div class="flex justify-end space-x-3">
				<button
					on:click={() => { showDeleteModal = false; deleteTargetId = null }}
					class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
				>
					キャンセル
				</button>
				<button
					on:click={handleDelete}
					class="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
				>
					削除
				</button>
			</div>
		</div>
	</div>
{/if}
