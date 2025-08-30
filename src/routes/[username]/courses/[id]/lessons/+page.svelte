<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	import { dndzone } from 'svelte-dnd-action'
	import { flip } from 'svelte/animate'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: courseId = $page.params.id
	
	let instructorId: string | null = null
	let redirecting = false
	
	let course: any = null
	let lessons: any[] = []
	let loading = true
	let error = ''
	let showCreateForm = false
	let dragDisabled = true
	
	// 新規レッスンフォーム（現在のスキーマに対応）
	let newLesson = {
		title: '',
		description: '',
		videoType: 'youtube',
		videoUrl: '',
		duration: 0,
		isPublished: false
	}
	let createLoading = false
	let createError = ''
	
	// リアクティブ文でリダイレクト処理
	$: if (username === 'undefined' && !redirecting) {
		redirecting = true
		handleUndefinedUsername()
	}
	
	async function handleUndefinedUsername() {
		try {
			const { data: { user } } = await supabase.auth.getUser()
			if (user) {
				const { data: profileData } = await supabase
					.from('profiles')
					.select('username')
					.eq('id', user.id)
					.single()
				
				if (profileData?.username) {
					goto(`/${profileData.username}/courses/${courseId}/lessons`)
					return
				} else {
					goto('/profile/setup')
					return
				}
			} else {
				goto('/login')
				return
			}
		} catch (err) {
			console.error('Redirect error:', err)
			goto('/login')
		}
	}
	
	onMount(async () => {
		if (username !== 'undefined') {
			await loadInstructorData()
			await loadData()
		}
	})
	
	async function loadInstructorData() {
		try {
			// usernameからinstructor_idを取得
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('id')
				.eq('username', username)
				.single()
			
			if (profileError || !profileData) {
				throw new Error('講師が見つかりません')
			}
			
			instructorId = profileData.id
		} catch (err: any) {
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
			
			// レッスン一覧を取得
			const { data: lessonsData, error: lessonsError } = await supabase
				.from('lessons')
				.select('*')
				.eq('course_id', courseId)
				.order('order_index', { ascending: true })
			
			if (lessonsError) throw lessonsError
			lessons = lessonsData || []
			
		} catch (err: any) {
			error = err.message
			console.error('Load data error:', err)
		} finally {
			loading = false
		}
	}
	
	async function createLesson() {
		createLoading = true
		createError = ''
		
		try {
			if (!newLesson.title || !newLesson.videoUrl) {
				throw new Error('タイトルと動画URLは必須です')
			}
			
			// 動画時間の設定
			let duration = newLesson.duration
			if (newLesson.videoType === 'youtube' && newLesson.videoUrl) {
				// YouTube URLから動画IDを抽出してAPIで時間を取得（簡略化）
				duration = duration || 600 // デフォルト10分
			}
			
			const lessonData = {
				course_id: courseId,
				title: newLesson.title,
				description: newLesson.description,
				video_type: newLesson.videoType,
				video_url: newLesson.videoUrl,
				duration: duration,
				order_index: lessons.length,
				is_published: newLesson.isPublished
			}
			
			console.log('Lesson data to insert:', lessonData)
			
			const { data: lesson, error: createLessonError } = await supabase
				.from('lessons')
				.insert(lessonData)
				.select()
				.single()
			
			console.log('Insert result:', { lesson, createLessonError })
			
			if (createLessonError) {
				console.error('Supabase insert error:', createLessonError)
				throw createLessonError
			}
			
			// レッスンリストを更新
			lessons = [...lessons, lesson]
			
			// フォームをリセット
			newLesson = {
				title: '',
				description: '',
				videoType: 'youtube',
				videoUrl: '',
				duration: 0,
				isPublished: false
			}
			showCreateForm = false
			
		} catch (err: any) {
			createError = err.message || 'レッスン作成に失敗しました'
			console.error('Lesson creation error:', err)
		} finally {
			createLoading = false
		}
	}
	
	async function deleteLesson(lessonId: string) {
		if (!confirm('このレッスンを削除してもよろしいですか？')) {
			return
		}
		
		try {
			const { error: deleteError } = await supabase
				.from('lessons')
				.delete()
				.eq('id', lessonId)
			
			if (deleteError) throw deleteError
			
			lessons = lessons.filter(l => l.id !== lessonId)
		} catch (err: any) {
			alert(`削除に失敗しました: ${err.message}`)
		}
	}
	
	async function togglePublished(lesson: any) {
		try {
			const newStatus = !lesson.is_published
			
			const { error: updateError } = await supabase
				.from('lessons')
				.update({ 
					is_published: newStatus,
					updated_at: new Date().toISOString()
				})
				.eq('id', lesson.id)
			
			if (updateError) throw updateError
			
			// UIを更新
			lessons = lessons.map(l => 
				l.id === lesson.id 
					? { ...l, is_published: newStatus }
					: l
			)
		} catch (err: any) {
			alert(`公開状態の変更に失敗しました: ${err.message}`)
		}
	}
	
	// ドラッグ&ドロップでの並び替え
	function handleDndConsider(e: any) {
		lessons = e.detail.items
		dragDisabled = false
	}
	
	async function handleDndFinalize(e: any) {
		lessons = e.detail.items
		dragDisabled = true
		
		// 並び順をデータベースに保存
		try {
			const updates = lessons.map((lesson, index) => ({
				id: lesson.id,
				order_index: index
			}))
			
			for (const update of updates) {
				await supabase
					.from('lessons')
					.update({ order_index: update.order_index })
					.eq('id', update.id)
			}
		} catch (err: any) {
			console.error('Order index update error:', err)
		}
	}
	
	function formatDuration(seconds: number): string {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}
	
	function getYouTubeId(url: string): string {
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
		return match ? match[1] : ''
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
	{:else if course}
		<!-- Header -->
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">レッスン管理</h2>
					<p class="text-gray-600">コース: {course.title}</p>
				</div>
				<div class="flex space-x-3">
					<a
						href="/{username}/courses/{courseId}/edit"
						class="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
					>
						コース編集
					</a>
					<button
						on:click={() => showCreateForm = !showCreateForm}
						class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						新規レッスン追加
					</button>
				</div>
			</div>
		</div>
		
		<!-- 新規レッスン作成フォーム -->
		{#if showCreateForm}
			<div class="bg-white rounded-lg shadow p-6 mb-8">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">新規レッスン作成</h3>
				
				{#if createError}
					<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
						{createError}
					</div>
				{/if}
				
				<form on:submit|preventDefault={createLesson} class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="title" class="block text-sm font-medium text-gray-700 mb-1">
								レッスンタイトル *
							</label>
							<input
								id="title"
								type="text"
								bind:value={newLesson.title}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="レッスン1: 基礎概念"
							/>
						</div>
						<div>
							<label for="videoType" class="block text-sm font-medium text-gray-700 mb-1">
								動画タイプ
							</label>
							<select
								id="videoType"
								bind:value={newLesson.videoType}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							>
								<option value="youtube">YouTube</option>
								<option value="supabase">Supabase Storage</option>
							</select>
						</div>
					</div>
					
					<div>
						<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
							説明
						</label>
						<textarea
							id="description"
							bind:value={newLesson.description}
							rows="3"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
							placeholder="このレッスンで学ぶ内容..."
						></textarea>
					</div>
					
					<div>
						<label for="videoUrl" class="block text-sm font-medium text-gray-700 mb-1">
							動画URL *
						</label>
						<input
							id="videoUrl"
							type="url"
							bind:value={newLesson.videoUrl}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder={newLesson.videoType === 'youtube' 
								? 'https://www.youtube.com/watch?v=...' 
								: 'https://supabase-storage-url...'}
						/>
					</div>
					
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="duration" class="block text-sm font-medium text-gray-700 mb-1">
								動画長（秒）
							</label>
							<input
								id="duration"
								type="number"
								bind:value={newLesson.duration}
								min="1"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								placeholder="600"
							/>
						</div>
						<div class="flex items-end">
							<label class="flex items-center">
								<input
									type="checkbox"
									bind:checked={newLesson.isPublished}
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<span class="ml-2 text-sm text-gray-700">すぐに公開する</span>
							</label>
						</div>
					</div>
					
					<div class="flex space-x-3 pt-4">
						<button
							type="button"
							on:click={() => showCreateForm = false}
							class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							キャンセル
						</button>
						<button
							type="submit"
							disabled={createLoading}
							class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
						>
							{createLoading ? '作成中...' : 'レッスンを作成'}
						</button>
					</div>
				</form>
			</div>
		{/if}
		
		<!-- レッスン一覧 -->
		{#if lessons.length === 0}
			<div class="text-center py-12">
				<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
				</svg>
				<h3 class="text-lg font-medium text-gray-900 mb-2">レッスンがありません</h3>
				<p class="text-gray-600 mb-6">最初のレッスンを作成しましょう。</p>
				<button
					on:click={() => showCreateForm = true}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
				>
					新規レッスン作成
				</button>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow">
				<div class="p-4 border-b border-gray-200">
					<p class="text-sm text-gray-600">
						ドラッグ&ドロップで並び順を変更できます
					</p>
				</div>
				
				<div
					use:dndzone={{ items: lessons, dragDisabled }}
					on:consider={handleDndConsider}
					on:finalize={handleDndFinalize}
					class="divide-y divide-gray-200"
				>
					{#each lessons as lesson (lesson.id)}
						<div animate:flip={{ duration: 200 }} class="p-6 hover:bg-gray-50 cursor-move">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center mb-2">
										<div class="flex items-center text-gray-400 mr-3">
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
											</svg>
										</div>
										<h3 class="text-lg font-medium text-gray-900 mr-3">
											{lesson.title}
										</h3>
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {lesson.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
											{lesson.is_published ? '公開中' : '非公開'}
										</span>
									</div>
									
									<p class="text-gray-600 mb-2">
										{lesson.description || '説明なし'}
									</p>
									
									<div class="flex items-center space-x-4 text-sm text-gray-500">
										<span>動画: {lesson.video_type}</span>
										<span>長さ: {formatDuration(lesson.duration)}</span>
										<span>順序: {lesson.order_index + 1}</span>
									</div>
									
									{#if lesson.video_type === 'youtube' && lesson.video_url}
										<div class="mt-3">
											<div class="flex items-center space-x-2">
												<img 
													src="https://img.youtube.com/vi/{getYouTubeId(lesson.video_url)}/mqdefault.jpg"
													alt="YouTube thumbnail"
													class="w-16 h-12 object-cover rounded"
												/>
												<a
													href={lesson.video_url}
													target="_blank"
													class="text-blue-600 hover:text-blue-800 text-sm"
												>
													YouTube で開く →
												</a>
											</div>
										</div>
									{/if}
								</div>
								
								<div class="flex space-x-2 ml-4">
									<button
										on:click={() => togglePublished(lesson)}
										class="text-sm px-3 py-1 rounded transition-colors {lesson.is_published 
											? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
											: 'bg-green-100 text-green-700 hover:bg-green-200'}"
									>
										{lesson.is_published ? '非公開' : '公開'}
									</button>
									<a
										href="/{username}/courses/{courseId}/lessons/{lesson.id}/edit"
										class="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors inline-block"
									>
										編集
									</a>
									<button
										on:click={() => deleteLesson(lesson.id)}
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
	{/if}
</div>