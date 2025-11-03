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
	let showCreateForm = true // デフォルトで表示
	let dragDisabled = true
	
	// 新規レッスンフォーム（現在のスキーマに対応）
	let newLesson = {
		title: '',
		description: '',
		content: '', // テキストコンテンツ
		videoType: 'youtube',
		videoUrl: '',
		duration: 0,
		isPublished: false
	}
	let createLoading = false
	let createError = ''

	// 編集中のレッスン
	let editingLesson: any = null
	let editMode = false

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

			// courseIdがUUIDかslugかを判定
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)

			// コース情報を取得
			let courseQuery = supabase
				.from('courses')
				.select(`
					*,
					space:spaces!inner(instructor_id, title, slug)
				`)

			if (isUUID) {
				courseQuery = courseQuery.eq('id', courseId)
			} else {
				courseQuery = courseQuery.eq('slug', courseId)
			}

			const { data: courseData, error: courseError } = await courseQuery.single()

			if (courseError) throw courseError
			if (!courseData) throw new Error('コースが見つかりません')

			// 講師の権限チェック
			if (courseData.space.instructor_id !== instructorId) {
				throw new Error('このコースを編集する権限がありません')
			}

			course = courseData

			// レッスン一覧を取得（実際のコースIDを使用）
			const { data: lessonsData, error: lessonsError } = await supabase
				.from('lessons')
				.select('*')
				.eq('course_id', course.id)
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
	
	// レッスンを編集モードにする
	function editLesson(lesson: any) {
		editMode = true
		editingLesson = lesson
		newLesson = {
			title: lesson.title,
			description: lesson.description || '',
			content: lesson.content || '',
			videoType: lesson.video_type || 'youtube',
			videoUrl: lesson.video_url || '',
			duration: Math.round(lesson.duration / 60), // 秒から分に変換
			isPublished: lesson.is_published
		}
	}

	// 編集をキャンセル
	function cancelEdit() {
		editMode = false
		editingLesson = null
		newLesson = {
			title: '',
			description: '',
			content: '',
			videoType: 'youtube',
			videoUrl: '',
			duration: 0,
			isPublished: false
		}
	}

	async function createLesson() {
		createLoading = true
		createError = ''

		try {
			if (!newLesson.title) {
				throw new Error('タイトルは必須です')
			}

			// コンテンツまたは動画のいずれかが必要
			if (!newLesson.content && !newLesson.videoUrl) {
				throw new Error('テキストコンテンツまたは動画URLのいずれかは必須です')
			}

			// コンテンツ消費時間を分から秒に変換
			const durationInSeconds = (newLesson.duration || 0) * 60

			const lessonData = {
				course_id: course.id,
				title: newLesson.title,
				description: newLesson.description,
				content: newLesson.content || null,
				video_type: newLesson.videoUrl ? newLesson.videoType : null,
				video_url: newLesson.videoUrl || null,
				duration: durationInSeconds,
				order_index: lessons.length,
				is_published: newLesson.isPublished
			}

			if (editMode && editingLesson) {
				// 更新モード
				const { data: lesson, error: updateError } = await supabase
					.from('lessons')
					.update({
						...lessonData,
						order_index: editingLesson.order_index, // 既存の順序を保持
						updated_at: new Date().toISOString()
					})
					.eq('id', editingLesson.id)
					.select()
					.single()

				if (updateError) throw updateError

				// レッスンリストを更新
				lessons = lessons.map(l => l.id === lesson.id ? lesson : l)
			} else {
				// 新規作成モード
				const { data: lesson, error: createLessonError } = await supabase
					.from('lessons')
					.insert(lessonData)
					.select()
					.single()

				if (createLessonError) {
					console.error('Supabase insert error:', createLessonError)
					throw createLessonError
				}

				// レッスンリストを更新
				lessons = [...lessons, lesson]
			}

			// フォームをリセット
			cancelEdit()

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
			<div>
				<h2 class="text-2xl font-bold text-gray-900 mb-2">レッスン管理</h2>
				<p class="text-gray-600">コース: {course.title}</p>
			</div>
		</div>
		
		<!-- 新規レッスン作成フォーム（2カラムレイアウト） -->
		<div class="bg-white rounded-lg shadow mb-8 overflow-hidden">
			<div class="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
				<div>
					<h3 class="text-lg font-semibold text-gray-900">
						{#if editMode}
							レッスン編集
						{:else}
							新規レッスン作成
						{/if}
					</h3>
					{#if editMode}
						<p class="text-xs text-gray-600 mt-1">レッスン「{editingLesson?.title}」を編集中</p>
					{/if}
				</div>
				{#if editMode}
					<button
						type="button"
						on:click={cancelEdit}
						class="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border border-gray-300 rounded"
					>
						キャンセル
					</button>
				{/if}
			</div>

			<div class="grid grid-cols-2 divide-x divide-gray-200">
				<!-- 左側: 編集フォーム -->
				<div class="p-6">
					{#if createError}
						<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
							{createError}
						</div>
					{/if}

					<form on:submit|preventDefault={createLesson} class="space-y-4">
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
								<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
									説明
								</label>
								<textarea
									id="description"
									bind:value={newLesson.description}
									rows="2"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
									placeholder="このレッスンで学ぶ内容..."
								></textarea>
							</div>

							<div>
								<label for="content" class="block text-sm font-medium text-gray-700 mb-1">
									テキストコンテンツ
								</label>
								<textarea
									id="content"
									bind:value={newLesson.content}
									rows="6"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
									placeholder="レッスンの本文をここに入力...&#10;&#10;動画がない場合はこのテキストがメインコンテンツになります。"
								></textarea>
								<p class="mt-1 text-xs text-gray-500">動画URLが空の場合は必須です</p>
							</div>

							<div class="border-t border-gray-200 pt-4">
								<h5 class="text-sm font-medium text-gray-700 mb-3">動画（オプション）</h5>

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

								<div class="mt-3">
									<label for="videoUrl" class="block text-sm font-medium text-gray-700 mb-1">
										動画URL
									</label>
									<input
										id="videoUrl"
										type="url"
										bind:value={newLesson.videoUrl}
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder={newLesson.videoType === 'youtube'
											? 'https://www.youtube.com/watch?v=...'
											: 'https://supabase-storage-url...'}
									/>
									<p class="mt-1 text-xs text-gray-500">動画を追加する場合はURLを入力</p>
								</div>
							</div>

							<div>
								<label for="duration" class="block text-sm font-medium text-gray-700 mb-1">
									コンテンツ消費時間（分）
								</label>
								<input
									id="duration"
									type="number"
									bind:value={newLesson.duration}
									min="0"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="10"
								/>
								<p class="mt-1 text-xs text-gray-500">動画の長さまたはテキストを読む時間の目安（分単位）</p>
							</div>

							<div>
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={newLesson.isPublished}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
									<span class="ml-2 text-sm text-gray-700">すぐに公開する</span>
								</label>
							</div>

							<div class="flex space-x-3 pt-4 border-t border-gray-200">
								<button
									type="button"
									on:click={() => showCreateForm = false}
									class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
								>
									キャンセル
								</button>
								<button
									type="submit"
									disabled={createLoading}
									class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
								>
									{#if createLoading}
										{editMode ? '更新中...' : '作成中...'}
									{:else}
										{editMode ? 'レッスンを更新' : 'レッスンを作成'}
									{/if}
								</button>
							</div>
						</form>
					</div>

					<!-- 右側: プレビュー -->
					<div class="p-6 bg-gray-50">
						<h4 class="text-sm font-semibold text-gray-700 mb-4">プレビュー</h4>

						<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
							<!-- レッスンカード -->
							<div class="p-4">
								<div class="flex items-start space-x-3">
									<div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
										<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
										</svg>
									</div>
									<div class="flex-1 min-w-0">
										<h5 class="text-base font-semibold text-gray-900 mb-1">
											{newLesson.title || 'レッスンタイトル'}
										</h5>
										{#if newLesson.description}
											<p class="text-sm text-gray-600 mb-2">{newLesson.description}</p>
										{:else}
											<p class="text-sm text-gray-400 italic mb-2">説明文がここに表示されます</p>
										{/if}
										<div class="flex items-center space-x-3 text-xs text-gray-500">
											<span class="flex items-center">
												<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
												</svg>
												{newLesson.duration ? `${newLesson.duration}分` : '0分'}
											</span>
											{#if newLesson.isPublished}
												<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700">
													<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
														<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
													</svg>
													公開
												</span>
											{:else}
												<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
													非公開
												</span>
											{/if}
										</div>
									</div>
								</div>
							</div>

							<!-- テキストコンテンツプレビュー -->
							{#if newLesson.content}
								<div class="border-t border-gray-200 p-4 bg-white">
									<h6 class="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">コンテンツ</h6>
									<div class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
										{newLesson.content}
									</div>
								</div>
							{/if}

							<!-- 動画プレビュー -->
							{#if newLesson.videoUrl && newLesson.videoType === 'youtube'}
								{@const youtubeId = getYouTubeId(newLesson.videoUrl)}
								{#if youtubeId}
									<div class="border-t border-gray-200">
										<div class="aspect-video bg-black">
											<iframe
												src="https://www.youtube.com/embed/{youtubeId}"
												title={newLesson.title}
												frameborder="0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
												allowfullscreen
												class="w-full h-full"
											></iframe>
										</div>
									</div>
								{:else}
									<div class="border-t border-gray-200 p-4 bg-yellow-50">
										<p class="text-xs text-yellow-700">有効なYouTube URLを入力してください</p>
									</div>
								{/if}
							{:else if newLesson.videoUrl}
								<div class="border-t border-gray-200 p-4 bg-gray-100">
									<p class="text-xs text-gray-600">動画URL: {newLesson.videoUrl}</p>
								</div>
							{/if}

							<!-- コンテンツまたは動画が空の場合の警告 -->
							{#if !newLesson.content && !newLesson.videoUrl}
								<div class="border-t border-gray-200 p-4 bg-amber-50">
									<p class="text-xs text-amber-700">
										<strong>注意:</strong> テキストコンテンツまたは動画URLのいずれかが必要です
									</p>
								</div>
							{/if}
						</div>

						<div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
							<p class="text-xs text-blue-700">
								<strong>ヒント:</strong> 左側のフォームで入力した内容がリアルタイムでプレビューに反映されます。
							</p>
						</div>

						<!-- 作成済みレッスン一覧 -->
						{#if lessons.length > 0}
							<div class="mt-6 pt-6 border-t border-gray-200">
								<h4 class="text-sm font-semibold text-gray-700 mb-4">作成済みレッスン ({lessons.length}件)</h4>
								<p class="text-xs text-gray-500 mb-3">ドラッグ&ドロップで並び順を変更できます</p>

								<div
									use:dndzone={{ items: lessons, dragDisabled }}
									on:consider={handleDndConsider}
									on:finalize={handleDndFinalize}
									class="space-y-2"
								>
									{#each lessons as lesson (lesson.id)}
										<div
											animate:flip={{ duration: 200 }}
											class="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors {editingLesson?.id === lesson.id ? 'bg-blue-50 border-blue-300' : ''}"
										>
											<div class="flex items-start justify-between">
												<div class="flex items-start space-x-2 flex-1 cursor-pointer" on:click={() => editLesson(lesson)}>
													<div class="flex items-center text-gray-400 mt-0.5">
														<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
														</svg>
													</div>
													<div class="flex-1 min-w-0">
														<div class="flex items-center mb-1">
															<span class="text-xs font-medium text-gray-500 mr-1.5">#{lesson.order_index + 1}</span>
															<h3 class="text-sm font-medium text-gray-900 truncate">
																{lesson.title}
															</h3>
															<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium {lesson.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
																{lesson.is_published ? '公開' : '非公開'}
															</span>
														</div>
														<div class="flex items-center space-x-2 text-xs text-gray-500">
															{#if lesson.video_type}
																<span class="flex items-center">
																	<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
																	</svg>
																	動画
																</span>
															{:else if lesson.content}
																<span class="flex items-center">
																	<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
																	</svg>
																	テキスト
																</span>
															{/if}
															<span>{Math.round(lesson.duration / 60)}分</span>
														</div>
													</div>
												</div>
												<div class="flex space-x-1 ml-2">
													<button
														on:click={() => togglePublished(lesson)}
														class="px-2 py-1 text-xs rounded transition-colors {lesson.is_published
															? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
															: 'bg-green-100 text-green-700 hover:bg-green-200'}"
													>
														{lesson.is_published ? '非公開' : '公開'}
													</button>
													<button
														on:click={() => deleteLesson(lesson.id)}
														class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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
			</div>
		</div>
	{/if}
</div>