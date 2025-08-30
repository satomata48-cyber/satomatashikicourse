<script>
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'

	export let data

	const supabase = createSupabaseBrowserClient()

	$: username = $page.params.username
	$: courseId = $page.params.id
	$: lessonId = $page.params.lessonId

	let instructorId = null
	let course = null
	let lesson = null
	let lessons = []
	let loading = true
	let error = ''
	let updateLoading = false
	let updateError = ''

	// 新規レッスン作成関連
	let isCreateMode = false
	let createLoading = false
	let createError = ''
	let newLesson = {
		title: '',
		description: '',
		videoType: 'youtube',
		videoUrl: '',
		duration: 0,
		isPublished: false
	}

	// フォームデータ
	let formData = {
		title: '',
		description: '',
		videoType: 'youtube',
		videoUrl: '',
		duration: 0,
		isPublished: false
	}

	onMount(async () => {
		if (username !== 'undefined') {
			await loadInstructorData()
			await loadData()
		}
	})

	async function loadInstructorData() {
		try {
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('id')
				.eq('username', username)
				.single()
			
			if (profileError || !profileData) {
				throw new Error('講師が見つかりません')
			}
			
			instructorId = profileData.id
		} catch (err) {
			error = err.message
			console.error('Load instructor data error:', err)
		}
	}

	async function loadData() {
		try {
			if (!instructorId) return
			
			// コース情報を取得
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
			
			// 講師の権限チェック
			if (courseData.space.instructor_id !== instructorId) {
				throw new Error('このコースを編集する権限がありません')
			}
			
			course = courseData

			// レッスン詳細を取得
			const { data: lessonData, error: lessonError } = await supabase
				.from('lessons')
				.select('*')
				.eq('id', lessonId)
				.eq('course_id', courseId)
				.single()
			
			if (lessonError) throw lessonError
			if (!lessonData) throw new Error('レッスンが見つかりません')
			
			lesson = lessonData

			// レッスン一覧も取得
			const { data: lessonsData, error: lessonsError } = await supabase
				.from('lessons')
				.select('*')
				.eq('course_id', courseId)
				.order('order_index', { ascending: true })
			
			if (lessonsError) throw lessonsError
			lessons = lessonsData || []

			// フォームデータに設定
			formData = {
				title: lesson.title,
				description: lesson.description || '',
				videoType: lesson.video_type,
				videoUrl: lesson.video_url,
				duration: lesson.duration,
				isPublished: lesson.is_published
			}
			
		} catch (err) {
			error = err.message
			console.error('Load data error:', err)
		} finally {
			loading = false
		}
	}

	function startCreateMode() {
		isCreateMode = true
		createError = ''
		newLesson = {
			title: '',
			description: '',
			videoType: 'youtube',
			videoUrl: '',
			duration: 0,
			isPublished: false
		}
	}

	function cancelCreateMode() {
		isCreateMode = false
		createError = ''
	}

	function getYouTubeId(url) {
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
		return match ? match[1] : ''
	}

	function formatDuration(seconds) {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	async function updateLesson() {
		if (!formData.title.trim()) {
			updateError = 'タイトルは必須です'
			return
		}
		
		updateLoading = true
		updateError = ''
		
		try {
			const { error: updateErr } = await supabase
				.from('lessons')
				.update({
					title: formData.title.trim(),
					description: formData.description?.trim() || null,
					video_type: formData.videoType,
					video_url: formData.videoUrl?.trim() || null,
					duration: formData.duration || 0,
					is_published: formData.isPublished
				})
				.eq('id', lessonId)
				.eq('course_id', courseId)
			
			if (updateErr) throw updateErr
			
			// レッスン情報を更新
			await loadData()
			alert('レッスンを更新しました')
		} catch (err) {
			updateError = err.message
			console.error('Update lesson error:', err)
		} finally {
			updateLoading = false
		}
	}

	async function createLesson() {
		if (!newLesson.title.trim()) {
			createError = 'タイトルは必須です'
			return
		}
		
		createLoading = true
		createError = ''
		
		try {
			// 次のorder_indexを取得
			const { data: lastLesson } = await supabase
				.from('lessons')
				.select('order_index')
				.eq('course_id', courseId)
				.order('order_index', { ascending: false })
				.limit(1)
				.single()
			
			const nextOrderIndex = (lastLesson?.order_index || 0) + 1
			
			const { error: createErr } = await supabase
				.from('lessons')
				.insert({
					course_id: courseId,
					title: newLesson.title.trim(),
					description: newLesson.description?.trim() || null,
					video_type: newLesson.videoType,
					video_url: newLesson.videoUrl?.trim() || null,
					duration: newLesson.duration || 0,
					is_published: newLesson.isPublished,
					order_index: nextOrderIndex
				})
			
			if (createErr) throw createErr
			
			// レッスン一覧を更新
			await loadData()
			
			// 作成モードを終了
			cancelCreateMode()
			alert('レッスンを作成しました')
		} catch (err) {
			createError = err.message || 'レッスンの作成に失敗しました'
			console.error('Create lesson error:', err)
			console.error('Error details:', {
				message: err.message,
				details: err.details,
				hint: err.hint,
				code: err.code
			})
		} finally {
			createLoading = false
		}
	}
</script>

<div>
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if course && lesson}
		<!-- Header -->
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">レッスン編集</h2>
					<nav class="flex items-center space-x-2 text-sm text-gray-600">
						<a href="/{username}/courses" class="hover:text-gray-900">コース管理</a>
						<span>/</span>
						<a href="/{username}/courses/{courseId}/lessons" class="hover:text-gray-900">{course.title}</a>
						<span>/</span>
						<span class="text-gray-900">{lesson.title}</span>
					</nav>
				</div>
				<a
					href="/{username}/courses/{courseId}/lessons"
					class="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
				>
					レッスン管理に戻る
				</a>
			</div>
		</div>
		
		<!-- 2カラムレイアウト（左：編集フォーム、右：レッスン一覧） -->
		<div class="grid grid-cols-12 gap-8">
			<!-- 左カラム: 編集フォーム -->
			<div class="col-span-6">
				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-semibold text-gray-900 mb-6">
						{isCreateMode ? '新規レッスン作成' : 'レッスン情報編集'}
					</h3>
					
					{#if updateError || createError}
						<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
							{updateError || createError}
						</div>
					{/if}
					
					<div class="space-y-6">
						<div class="grid grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									レッスンタイトル *
								</label>
								{#if isCreateMode}
									<input
										type="text"
										bind:value={newLesson.title}
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="レッスン1: 基礎概念"
									/>
								{:else}
									<input
										type="text"
										bind:value={formData.title}
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="レッスン1: 基礎概念"
									/>
								{/if}
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									動画タイプ
								</label>
								{#if isCreateMode}
									<select
										bind:value={newLesson.videoType}
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									>
										<option value="youtube">YouTube</option>
										<option value="supabase">Supabase Storage</option>
									</select>
								{:else}
									<select
										bind:value={formData.videoType}
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									>
										<option value="youtube">YouTube</option>
										<option value="supabase">Supabase Storage</option>
									</select>
								{/if}
							</div>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								説明
							</label>
							{#if isCreateMode}
								<textarea
									bind:value={newLesson.description}
									rows="3"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
									placeholder="このレッスンで学ぶ内容..."
								></textarea>
							{:else}
								<textarea
									bind:value={formData.description}
									rows="3"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
									placeholder="このレッスンで学ぶ内容..."
								></textarea>
							{/if}
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								動画URL *
							</label>
							{#if isCreateMode}
								<input
									type="url"
									bind:value={newLesson.videoUrl}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder={newLesson.videoType === 'youtube' 
										? 'https://www.youtube.com/watch?v=...' 
										: 'https://supabase-storage-url...'}
								/>
								
								{#if newLesson.videoType === 'youtube' && newLesson.videoUrl}
									<div class="mt-2">
										<img 
											src="https://img.youtube.com/vi/{getYouTubeId(newLesson.videoUrl)}/mqdefault.jpg"
											alt="YouTube thumbnail"
											class="w-32 h-24 object-cover rounded"
										/>
									</div>
								{/if}
							{:else}
								<input
									type="url"
									bind:value={formData.videoUrl}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder={formData.videoType === 'youtube' 
										? 'https://www.youtube.com/watch?v=...' 
										: 'https://supabase-storage-url...'}
								/>
								
								{#if formData.videoType === 'youtube' && formData.videoUrl}
									<div class="mt-2">
										<img 
											src="https://img.youtube.com/vi/{getYouTubeId(formData.videoUrl)}/mqdefault.jpg"
											alt="YouTube thumbnail"
											class="w-32 h-24 object-cover rounded"
										/>
									</div>
								{/if}
							{/if}
						</div>
						
						<div class="grid grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									動画長（秒）
								</label>
								{#if isCreateMode}
									<input
										type="number"
										bind:value={newLesson.duration}
										min="1"
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="600"
									/>
								{:else}
									<input
										type="number"
										bind:value={formData.duration}
										min="1"
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="600"
									/>
								{/if}
							</div>
							<div class="flex items-end">
								<label class="flex items-center">
									{#if isCreateMode}
										<input
											type="checkbox"
											bind:checked={newLesson.isPublished}
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
									{:else}
										<input
											type="checkbox"
											bind:checked={formData.isPublished}
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
									{/if}
									<span class="ml-2 text-sm text-gray-700">公開する</span>
								</label>
							</div>
						</div>
						
						<div class="flex space-x-4 pt-6 border-t">
							{#if isCreateMode}
								<button
									type="button"
									on:click={cancelCreateMode}
									class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
								>
									キャンセル
								</button>
								<button
									type="button"
									on:click={createLesson}
									disabled={createLoading}
									class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{createLoading ? '作成中...' : 'レッスンを作成'}
								</button>
							{:else}
								<a
									href="/{username}/courses/{courseId}/lessons"
									class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
								>
									レッスン管理に戻る
								</a>
								<button
									type="button"
									on:click={updateLesson}
									disabled={updateLoading}
									class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{updateLoading ? '更新中...' : 'レッスンを更新'}
								</button>
							{/if}
						</div>
					</div>
				</div>
			</div>
			
			<!-- 右カラム: レッスン一覧 -->
			<div class="col-span-6">
				<div class="bg-white rounded-lg shadow">
					<div class="p-4 border-b border-gray-200">
						<h3 class="text-lg font-semibold text-gray-900">レッスン一覧</h3>
						<p class="text-sm text-gray-600 mt-1">編集したいレッスンを選択</p>
					</div>
					
					<div class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
						<!-- 既存のレッスン一覧 -->
						{#each lessons as lessonItem, index}
							<div class="p-4 hover:bg-gray-50 transition-colors {lessonItem.id === lesson.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}">
								<div class="flex items-start justify-between">
									<div class="flex-1 cursor-pointer" on:click={() => goto(`/${username}/courses/${courseId}/lessons/${lessonItem.id}/edit`)}>
										<div class="flex items-center mb-1">
											<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mr-2">
												{index + 1}
											</span>
											<h4 class="text-sm font-medium text-gray-900 {lessonItem.id === lesson.id ? 'text-blue-800' : ''}">
												{lessonItem.title}
											</h4>
										</div>
										<div class="flex items-center space-x-2 text-xs text-gray-500 mb-2">
											<span class="flex items-center">
												<svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
												</svg>
												{formatDuration(lessonItem.duration)}
											</span>
											<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium {lessonItem.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
												{lessonItem.is_published ? '公開' : '非公開'}
											</span>
										</div>
										
										{#if lessonItem.video_type === 'youtube' && lessonItem.video_url}
											<div class="mb-2">
												<img 
													src="https://img.youtube.com/vi/{getYouTubeId(lessonItem.video_url)}/mqdefault.jpg"
													alt="YouTube thumbnail"
													class="w-16 h-12 object-cover rounded"
												/>
											</div>
										{/if}
									</div>
									
									<!-- アクションボタン（右側に配置） -->
									<div class="flex space-x-2 ml-3">
										<button
											on:click={() => {
												// 現在のレッスンを編集モードで読み込む
												if (lessonItem.id !== lesson.id) {
													goto(`/${username}/courses/${courseId}/lessons/${lessonItem.id}/edit`)
												}
											}}
											class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
										>
											編集
										</button>
										<button
											on:click={() => {
												if (confirm(`レッスン「${lessonItem.title}」を削除してもよろしいですか？この操作は取り消せません。`)) {
													// 削除処理（現在は確認のみ）
													alert('削除機能は実装予定です')
												}
											}}
											class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
										>
											削除
										</button>
									</div>
								</div>
							</div>
						{/each}
						
						<!-- 新規作成中の仮レッスン（作成モード時のみ表示 - 既存レッスンの後に表示） -->
						{#if isCreateMode}
							<div class="p-4 bg-yellow-50 border-l-4 border-l-yellow-400">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center mb-1">
											<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded mr-2">
												{lessons.length + 1}
											</span>
											<h4 class="text-sm font-medium text-yellow-800">
												{newLesson.title || '新しいレッスン'}
											</h4>
											<span class="ml-2 text-xs text-yellow-600">(作成中)</span>
										</div>
										<div class="flex items-center space-x-2 text-xs text-yellow-600 mb-2">
											<span class="flex items-center">
												<svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
												</svg>
												{formatDuration(newLesson.duration || 0)}
											</span>
											<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
												{newLesson.isPublished ? '公開予定' : '非公開予定'}
											</span>
										</div>
										
										{#if newLesson.videoType === 'youtube' && newLesson.videoUrl}
											<div class="mb-2">
												<img 
													src="https://img.youtube.com/vi/{getYouTubeId(newLesson.videoUrl)}/mqdefault.jpg"
													alt="YouTube thumbnail"
													class="w-16 h-12 object-cover rounded opacity-75"
												/>
											</div>
										{/if}
									</div>
									
									<!-- 作成中アイコン -->
									<div class="flex items-center ml-3">
										<svg class="animate-spin h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
									</div>
								</div>
							</div>
						{/if}
					</div>
					
					<!-- 新規レッスン追加ボタン -->
					<div class="p-4 border-t border-gray-200">
						<button
							on:click={startCreateMode}
							class="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center"
						>
							<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
							</svg>
							レッスンを追加
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>