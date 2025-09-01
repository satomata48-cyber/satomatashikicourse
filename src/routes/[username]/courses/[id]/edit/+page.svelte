<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: courseId = $page.params.id
	
	let course: any = null
	let formData = {
		title: '',
		description: '',
		slug: '',
		isFree: true,
		price: 0,
		currency: 'JPY',
		estimatedDurationHours: 1,
		isPublished: false
		// sortOrder removed - not needed for courses
	}
	let loading = true
	let saving = false
	let error = ''
	let slugError = ''
	let successMessage = ''
	
	onMount(async () => {
		await loadCourse()
	})
	
	async function loadCourse() {
		try {
			// 現在のユーザーを取得
			const { data: { user } } = await supabase.auth.getUser()
			
			if (!user) {
				error = 'ログインが必要です'
				goto('/login')
				return
			}
			
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select(`
					*,
					space:spaces!inner(instructor_id, title, slug)
				`)
				.eq('id', courseId)
				.single()
			
			if (courseError) throw courseError
			if (!courseData) throw new Error('コースが見つかりません')
			
			// URLのユーザー名を確認（ユーザー名が自分のものか確認）
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('id, username')
				.eq('username', username)
				.single()
			
			if (profileError || !profileData) {
				console.error('Profile lookup error:', profileError)
				goto('/login')
				return
			}
			
			// URLのユーザー名が自分のものでない場合は、何もしない（他人のコースを見ているだけかもしれない）
			// 権限チェックは後で行う
			
			// 講師の権限チェック
			if (courseData.space.instructor_id !== user.id) {
				console.log('Permission check failed:', {
					instructor_id: courseData.space.instructor_id,
					user_id: user.id,
					course_title: courseData.title,
					space_title: courseData.space.title
				})
				error = 'このコースを編集する権限がありません'
				// エラーを表示して、3秒後にリダイレクト
				setTimeout(async () => {
					const { data: myProfile } = await supabase
						.from('profiles')
						.select('username')
						.eq('id', user.id)
						.single()
					
					if (myProfile?.username) {
						goto(`/${myProfile.username}/courses`)
					} else {
						goto('/login')
					}
				}, 3000)
				return
			}
			
			course = courseData
			formData = {
				title: course.title,
				description: course.description || '',
				slug: course.slug,
				isFree: course.is_free,
				price: course.price,
				currency: course.currency,
				estimatedDurationHours: course.estimated_duration_hours || 1,
				isPublished: course.is_published,
				sortOrder: 0
			}
		} catch (err: any) {
			error = err.message
			console.error('Load course error:', err)
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
		if (formData.slug === course?.slug) {
			slugError = ''
			return true
		}
		
		// 同一スペース内での重複チェック
		const { data: existingCourse } = await supabase
			.from('courses')
			.select('id')
			.eq('space_id', course.space_id)
			.eq('slug', formData.slug)
			.neq('id', courseId)
			.single()
		
		if (existingCourse) {
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
				is_free: formData.isFree,
				price: formData.isFree ? 0 : formData.price,
				currency: formData.currency,
				estimated_duration_hours: formData.estimatedDurationHours,
				is_published: formData.isPublished,
				// Removed sort_order field as courses table should not have this
				updated_at: new Date().toISOString()
			}
			
			const { error: updateError } = await supabase
				.from('courses')
				.update(updateData)
				.eq('id', courseId)
			
			if (updateError) throw updateError
			
			successMessage = 'コースを保存しました'
			await loadCourse() // 最新データを再読み込み
		} catch (err: any) {
			error = err.message
			console.error('Save course error:', err)
		} finally {
			saving = false
		}
	}
	
	async function togglePublished() {
		try {
			const newStatus = !course.is_published
			
			const { error: updateError } = await supabase
				.from('courses')
				.update({ 
					is_published: newStatus,
					updated_at: new Date().toISOString()
				})
				.eq('id', courseId)
			
			if (updateError) throw updateError
			
			formData.isPublished = newStatus
			course.is_published = newStatus
			
			successMessage = newStatus ? 'コースを公開しました' : 'コースを非公開にしました'
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
	{:else if error && !course}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if course}
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">コース編集</h2>
					<p class="text-gray-600">スペース: {course.space.title}</p>
				</div>
				<div class="flex space-x-3">
					<button
						on:click={togglePublished}
						class="px-4 py-2 rounded-lg font-medium transition-colors {course.is_published 
							? 'bg-yellow-600 text-white hover:bg-yellow-700' 
							: 'bg-green-600 text-white hover:bg-green-700'}"
					>
						{course.is_published ? '非公開にする' : '公開する'}
					</button>
					<a
						href="/{username}/courses/{courseId}/lessons"
						class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						レッスン管理
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
							コース名 *
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
						<input
							id="slug"
							type="text"
							bind:value={formData.slug}
							on:blur={validateSlug}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						{#if slugError}
							<p class="mt-1 text-sm text-red-600">{slugError}</p>
						{:else}
							<p class="mt-1 text-sm text-gray-500">
								URL: /{username}/space/{course.space.slug}/course/{formData.slug}
							</p>
						{/if}
					</div>
					
					<div class="grid grid-cols-1 gap-4">
						<div>
							<label for="estimatedDurationHours" class="block text-sm font-medium text-gray-700 mb-2">
								推定学習時間（時間）
							</label>
							<input
								id="estimatedDurationHours"
								type="number"
								bind:value={formData.estimatedDurationHours}
								min="1"
								max="1000"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>
					
					<!-- 価格設定 -->
					<div class="border-t border-gray-200 pt-6">
						<h3 class="text-lg font-medium text-gray-900 mb-4">価格設定</h3>
						
						<div class="space-y-4">
							<div class="flex items-center">
								<input
									id="isFree"
									type="checkbox"
									bind:checked={formData.isFree}
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label for="isFree" class="ml-2 block text-sm text-gray-900">
									無料コース
								</label>
							</div>
							
							{#if !formData.isFree}
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="price" class="block text-sm font-medium text-gray-700 mb-2">
											価格
										</label>
										<input
											id="price"
											type="number"
											bind:value={formData.price}
											min="0"
											step="100"
											required={!formData.isFree}
											class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
									<div>
										<label for="currency" class="block text-sm font-medium text-gray-700 mb-2">
											通貨
										</label>
										<select
											id="currency"
											bind:value={formData.currency}
											class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										>
											<option value="JPY">日本円 (JPY)</option>
											<option value="USD">米ドル (USD)</option>
										</select>
									</div>
								</div>
							{/if}
						</div>
					</div>
					
					<div class="flex space-x-4 pt-4">
						<button
							type="button"
							on:click={() => goto(`/${username}/courses`)}
							class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							戻る
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
			</div>
		</div>
	{/if}
</div>