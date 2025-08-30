<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	
	let space: any = null
	let formData = {
		title: '',
		description: '',
		slug: '',
		maxStudents: 1000,
		isActive: true,
		isPublic: true
	}
	let loading = true
	let saving = false
	let error = ''
	let slugError = ''
	let successMessage = ''
	
	onMount(async () => {
		await loadSpace()
	})
	
	async function loadSpace() {
		try {
			const { data: spaceData, error: spaceError } = await supabase
				.from('spaces')
				.select('*')
				.eq('instructor_id', data.user.id)
				.eq('slug', slug)
				.single()
			
			if (spaceError) throw spaceError
			if (!spaceData) throw new Error('スペースが見つかりません')
			
			space = spaceData
			formData = {
				title: space.title,
				description: space.description || '',
				slug: space.slug,
				maxStudents: space.max_students,
				isActive: space.is_active,
				isPublic: space.is_public
			}
		} catch (err: any) {
			error = err.message
			console.error('Load space error:', err)
		} finally {
			loading = false
		}
	}
	
	async function validateSlug() {
		if (!formData.slug) {
			slugError = 'スラッグは必須です'
			return false
		}
		
		if (!/^[a-zA-Z0-9_-]+$/.test(formData.slug)) {
			slugError = 'スラッグは英数字、アンダースコア、ハイフンのみ使用可能です'
			return false
		}
		
		// 元のスラッグと同じ場合はOK
		if (formData.slug === space?.slug) {
			slugError = ''
			return true
		}
		
		// 重複チェック
		const { data: existingSpace } = await supabase
			.from('spaces')
			.select('id')
			.eq('instructor_id', data.user.id)
			.eq('slug', formData.slug)
			.neq('id', space.id)
			.single()
		
		if (existingSpace) {
			slugError = 'このスラッグは既に使用されています'
			return false
		}
		
		slugError = ''
		return true
	}
	
	async function handleSave() {
		saving = true
		error = ''
		successMessage = ''
		
		try {
			const isValidSlug = await validateSlug()
			if (!isValidSlug) {
				saving = false
				return
			}
			
			const updateData = {
				title: formData.title,
				description: formData.description,
				slug: formData.slug,
				max_students: formData.maxStudents,
				is_active: formData.isActive,
				is_public: formData.isPublic,
				updated_at: new Date().toISOString()
			}
			
			const { error: updateError } = await supabase
				.from('spaces')
				.update(updateData)
				.eq('id', space.id)
			
			if (updateError) throw updateError
			
			successMessage = 'スペースを保存しました'
			
			// URLが変更された場合はリダイレクト
			if (formData.slug !== space.slug) {
				setTimeout(() => {
					goto(`/${username}/spaces/${formData.slug}/edit`)
				}, 1500)
			}
			
			await loadSpace() // 最新データを再読み込み
		} catch (err: any) {
			error = err.message
			console.error('Save space error:', err)
		} finally {
			saving = false
		}
	}
	
	async function toggleActive() {
		try {
			const newStatus = !space.is_active
			
			const { error: updateError } = await supabase
				.from('spaces')
				.update({ 
					is_active: newStatus,
					updated_at: new Date().toISOString()
				})
				.eq('id', space.id)
			
			if (updateError) throw updateError
			
			formData.isActive = newStatus
			space.is_active = newStatus
			
			successMessage = newStatus ? 'スペースをアクティブにしました' : 'スペースを非アクティブにしました'
		} catch (err: any) {
			error = err.message
		}
	}
</script>

<div>
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error && !space}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if space}
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">スペース編集</h2>
					<p class="text-gray-600">現在のURL: /{username}/space/{space.slug}</p>
				</div>
				<div class="flex space-x-3">
					<button
						on:click={toggleActive}
						class="px-4 py-2 rounded-lg font-medium transition-colors {space.is_active 
							? 'bg-yellow-600 text-white hover:bg-yellow-700' 
							: 'bg-green-600 text-white hover:bg-green-700'}"
					>
						{space.is_active ? '非アクティブにする' : 'アクティブにする'}
					</button>
					<a
						href="/{username}/spaces/{space.slug}/page-editor"
						class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						ページ編集
					</a>
				</div>
			</div>
		</div>
		
		<div class="max-w-2xl">
			<div class="bg-white rounded-lg shadow p-6">
				{#if error}
					<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
						{error}
					</div>
				{/if}
				
				{#if successMessage}
					<div class="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6">
						{successMessage}
					</div>
				{/if}
				
				<form on:submit|preventDefault={handleSave} class="space-y-6">
					<div>
						<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
							スペース名 *
						</label>
						<input
							id="title"
							type="text"
							bind:value={formData.title}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					
					<div>
						<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
							説明
						</label>
						<textarea
							id="description"
							bind:value={formData.description}
							rows="4"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
						></textarea>
					</div>
					
					<div>
						<label for="slug" class="block text-sm font-medium text-gray-700 mb-2">
							スラッグ (URL用) *
						</label>
						<div class="flex">
							<span class="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-lg">
							/{username}/space/
							</span>
							<input
								id="slug"
								type="text"
								bind:value={formData.slug}
								on:blur={validateSlug}
								required
								class="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
						{#if slugError}
							<p class="mt-1 text-sm text-red-600">{slugError}</p>
						{:else}
							<p class="mt-1 text-sm text-gray-500">
								英数字、アンダースコア、ハイフンのみ使用可能です
							</p>
						{/if}
					</div>
					
					<div>
						<label for="maxStudents" class="block text-sm font-medium text-gray-700 mb-2">
							最大生徒数
						</label>
						<input
							id="maxStudents"
							type="number"
							bind:value={formData.maxStudents}
							min="1"
							max="10000"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					
					<div class="border-t border-gray-200 pt-6">
						<div class="flex items-center mb-4">
							<input
								id="isActive"
								type="checkbox"
								bind:checked={formData.isActive}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isActive" class="ml-2 block text-sm text-gray-900">
								スペースをアクティブにする
							</label>
						</div>
						<p class="mt-1 text-sm text-gray-500 mb-6">
							非アクティブにすると新規登録を停止しますが、既存の生徒はアクセス可能です
						</p>
						
						<div class="flex items-center">
							<input
								id="isPublic"
								type="checkbox"
								bind:checked={formData.isPublic}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isPublic" class="ml-2 block text-sm text-gray-900">
								ページを公開する
							</label>
						</div>
						<p class="mt-1 text-sm text-gray-500">
							非公開にすると、スペースのランディングページが表示されなくなります
						</p>
					</div>
					
					<div class="flex space-x-4 pt-4">
						<button
							type="button"
							on:click={() => goto(`/${username}/spaces/${space.slug}`)}
							class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							キャンセル
						</button>
						<button
							type="submit"
							disabled={saving || !!slugError}
							class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? '保存中...' : '保存'}
						</button>
					</div>
				</form>
				
				<!-- 危険な操作 -->
				<div class="mt-8 pt-8 border-t border-gray-200">
					<h3 class="text-lg font-medium text-red-900 mb-4">危険な操作</h3>
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<p class="text-sm text-red-600 mb-3">
							スペースを削除すると、関連するすべてのコース、レッスン、生徒データが永久に失われます。
						</p>
						<button
							on:click={() => {
								if (confirm('本当にこのスペースを削除しますか？この操作は元に戻せません。')) {
									if (confirm('最終確認: すべてのデータが削除されます。続行しますか？')) {
										// 削除処理の実装
									}
								}
							}}
							class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
						>
							スペースを削除
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>