<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	import { updateProgress } from '$lib/stores/progress'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	$: courseId = $page.params.id
	$: lessonId = $page.params.lessonId
	
	let space: any = null
	let course: any = null
	let lesson: any = null
	let student: any = null
	let allLessons: any[] = []
	let hasAccess = false
	let loading = true
	let error = ''
	
	// 動画プレイヤー関連
	let videoElement: HTMLVideoElement
	let currentTime = 0
	let duration = 0
	let progress = 0
	let paused = true
	let savedProgress: any = null
	
	$: isPlaying = !paused
	
	// 進捗保存
	let progressInterval: NodeJS.Timeout
	let lastSavedTime = 0
	
	onMount(async () => {
		await loadLessonData()
		if (hasAccess && lesson) {
			await loadSavedProgress()
			startProgressTracking()
		}
	})
	
	onDestroy(() => {
		if (progressInterval) {
			clearInterval(progressInterval)
		}
		// 最終的な進捗を保存
		saveProgress()
	})
	
	async function loadLessonData() {
		try {
			// まず、usernameで講師情報を取得
			const { data: instructorData, error: instructorError } = await supabase
				.from('instructors')
				.select('id')
				.eq('uuid', username)
				.single()
			
			if (instructorError || !instructorData) {
				throw new Error('講師が見つかりません')
			}
			
			// スペース情報を取得
			const { data: spaceData, error: spaceError } = await supabase
				.from('spaces')
				.select('*')
				.eq('slug', slug)
				.eq('instructor_id', instructorData.id)
				.single()
			
			if (spaceError) throw spaceError
			space = spaceData
			
			// 生徒登録状況を確認
			if (!data.user) {
				throw new Error('ログインが必要です')
			}
			
			const { data: studentData, error: studentError } = await supabase
				.from('space_students')
				.select('*')
				.eq('user_id', data.user.id)
				.eq('space_id', space.id)
				.single()
			
			if (studentError) throw new Error('このスペースに登録されていません')
			student = studentData
			
			// コース情報を取得
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select(`
					*,
					purchases:course_purchases(
						status,
						purchased_at
					)
				`)
				.eq('id', courseId)
				.eq('space_id', space.id)
				.single()
			
			if (courseError) throw courseError
			course = courseData
			
			// レッスン情報を取得
			const { data: lessonData, error: lessonError } = await supabase
				.from('lessons')
				.select('*')
				.eq('id', lessonId)
				.eq('course_id', courseId)
				.single()
			
			if (lessonError) throw lessonError
			lesson = lessonData
			
			// 全レッスン一覧を取得（ナビゲーション用）
			const { data: allLessonsData, error: allLessonsError } = await supabase
				.from('lessons')
				.select(`
					*,
					progress:lesson_progress(
						completion_percentage,
						is_completed
					)
				`)
				.eq('course_id', courseId)
				.eq('is_published', true)
				.order('sort_order', { ascending: true })
			
			if (allLessonsError) throw allLessonsError
			allLessons = allLessonsData || []
			
			// アクセス権限を確認
			if (course.is_free) {
				hasAccess = true
			} else {
				hasAccess = course.purchases && course.purchases.some(p => p.status === 'completed')
			}
			
			// プレビューの場合もアクセス可能
			if (!hasAccess && lesson.is_preview) {
				hasAccess = true
			}
			
			if (!hasAccess) {
				throw new Error('このレッスンにアクセスする権限がありません')
			}
			
		} catch (err: any) {
			error = err.message
			console.error('Load lesson data error:', err)
		} finally {
			loading = false
		}
	}
	
	async function loadSavedProgress() {
		try {
			const { data: progressData } = await supabase
				.from('lesson_progress')
				.select('*')
				.eq('student_id', student.id)
				.eq('lesson_id', lesson.id)
				.single()
			
			if (progressData) {
				savedProgress = progressData
				// 前回の視聴位置を復元
				if (videoElement && progressData.last_position_seconds > 0) {
					videoElement.currentTime = progressData.last_position_seconds
				}
			}
		} catch (err) {
			console.log('No saved progress found')
		}
	}
	
	function startProgressTracking() {
		// 30秒毎に進捗を保存
		progressInterval = setInterval(() => {
			saveProgress()
		}, 30000)
	}
	
	async function saveProgress() {
		if (!lesson || !student || !videoElement) return
		
		const watchTime = Math.floor(currentTime)
		const percentage = duration > 0 ? (currentTime / duration) * 100 : 0
		const isCompleted = percentage >= (lesson.completion_threshold * 100)
		
		// 最後に保存した時間から5秒以上経過している場合のみ保存
		if (Math.abs(watchTime - lastSavedTime) < 5 && !isCompleted) return
		
		try {
			const progressData = {
				student_id: student.id,
				lesson_id: lesson.id,
				watch_time_seconds: watchTime,
				last_position_seconds: watchTime,
				completion_percentage: percentage,
				is_completed: isCompleted,
				completed_at: isCompleted ? new Date().toISOString() : null,
				last_watched_at: new Date().toISOString(),
				total_sessions: savedProgress ? savedProgress.total_sessions + 1 : 1
			}
			
			const { error } = await supabase
				.from('lesson_progress')
				.upsert(progressData, {
					onConflict: 'student_id,lesson_id'
				})
			
			if (error) throw error
			
			lastSavedTime = watchTime
			
			// ストアを更新
			updateProgress(lesson.id, progressData)
			
		} catch (err: any) {
			console.error('Save progress error:', err)
		}
	}
	
	function handleTimeUpdate() {
		if (duration > 0) {
			progress = (currentTime / duration) * 100
		}
	}
	
	function handleEnded() {
		saveProgress()
		// 次のレッスンがあれば自動で進む
		const currentIndex = allLessons.findIndex(l => l.id === lesson.id)
		if (currentIndex < allLessons.length - 1) {
			const nextLesson = allLessons[currentIndex + 1]
			if (confirm('次のレッスンに進みますか？')) {
				window.location.href = `/${username}/space/${slug}/course/${courseId}/lesson/${nextLesson.id}`
			}
		}
	}
	
	function getYouTubeId(url: string): string {
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
		return match ? match[1] : ''
	}
	
	function formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = Math.floor(seconds % 60)
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}
	
	function getCurrentLessonIndex(): number {
		return allLessons.findIndex(l => l.id === lesson.id)
	}
	
	function getNextLesson(): any {
		const currentIndex = getCurrentLessonIndex()
		return currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
	}
	
	function getPreviousLesson(): any {
		const currentIndex = getCurrentLessonIndex()
		return currentIndex > 0 ? allLessons[currentIndex - 1] : null
	}
</script>

<svelte:head>
	<title>{lesson?.title || 'Loading...'} | {course?.title || ''}</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen flex justify-center items-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else if error}
	<div class="min-h-screen flex justify-center items-center">
		<div class="max-w-md text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.598 0L4.216 15.5C3.445 16.333 4.406 18 5.946 18z"/>
			</svg>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">アクセスできません</h1>
			<p class="text-gray-600 mb-4">{error}</p>
			<a
				href="/{username}/space/{slug}/course/{courseId}"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
			>
				コースに戻る
			</a>
		</div>
	</div>
{:else if lesson && course}
	<div class="min-h-screen bg-gray-900">
		<!-- 動画プレイヤーエリア -->
		<div class="bg-black">
			<div class="max-w-6xl mx-auto">
				<div class="aspect-video bg-black relative">
					{#if lesson.video_type === 'youtube'}
						<iframe 
							src="https://www.youtube.com/embed/{getYouTubeId(lesson.video_url)}?enablejsapi=1"
							class="w-full h-full"
							allowfullscreen
							title={lesson.title}
						></iframe>
					{:else}
						<video 
							bind:this={videoElement}
							bind:currentTime
							bind:duration
							bind:paused
							src={lesson.video_url}
							class="w-full h-full bg-black"
							controls
							on:timeupdate={handleTimeUpdate}
							on:ended={handleEnded}
							on:loadedmetadata={loadSavedProgress}
						>
							<track kind="captions" />
						</video>
					{/if}
				</div>
				
				<!-- 動画コントロール情報 -->
				{#if lesson.video_type !== 'youtube'}
					<div class="bg-gray-800 px-6 py-4">
						<div class="flex justify-between items-center text-white text-sm">
							<span>進捗: {Math.round(progress)}%</span>
							<span>{formatTime(currentTime)} / {formatTime(duration)}</span>
						</div>
						<div class="w-full bg-gray-700 rounded-full h-1 mt-2">
							<div 
								class="bg-blue-600 h-1 rounded-full transition-all duration-300"
								style="width: {progress}%"
							></div>
						</div>
					</div>
				{/if}
			</div>
		</div>
		
		<!-- コンテンツエリア -->
		<div class="bg-white">
			<div class="max-w-6xl mx-auto">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
					<!-- メインコンテンツ -->
					<div class="lg:col-span-2">
						<!-- レッスンヘッダー -->
						<div class="mb-6">
							<nav class="flex items-center space-x-2 text-sm text-gray-600 mb-4">
								<a href="/{username}/space/{slug}" class="hover:text-blue-600">
									{space.title}
								</a>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
								</svg>
								<a href="/{username}/space/{slug}/course/{courseId}" class="hover:text-blue-600">
									{course.title}
								</a>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
								</svg>
								<span class="text-gray-900">{lesson.title}</span>
							</nav>
							
							<h1 class="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
							{#if lesson.description}
								<p class="text-gray-600">{lesson.description}</p>
							{/if}
						</div>
						
						<!-- レッスンコンテンツ -->
						{#if lesson.content && lesson.content.sections && lesson.content.sections.length > 0}
							<div class="prose max-w-none">
								{#each lesson.content.sections as section}
									<div class="mb-6">
										{#if section.type === 'text'}
											<div class="text-gray-700">{@html section.content}</div>
										{:else if section.type === 'heading'}
											<h3 class="text-xl font-semibold text-gray-900 mb-3">{section.content}</h3>
										{:else if section.type === 'list'}
											<ul class="list-disc list-inside space-y-1 text-gray-700">
												{#each section.items as item}
													<li>{item}</li>
												{/each}
											</ul>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<div class="bg-gray-50 rounded-lg p-6 text-center">
								<p class="text-gray-600">このレッスンには追加のコンテンツがありません</p>
							</div>
						{/if}
						
						<!-- ナビゲーション -->
						<div class="flex justify-between items-center mt-8 pt-8 border-t border-gray-200">
							<div>
								{#if getPreviousLesson()}
									<a
										href="/{username}/space/{slug}/course/{courseId}/lesson/{getPreviousLesson().id}"
										class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
									>
										<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
										</svg>
										前のレッスン
									</a>
								{/if}
							</div>
							<div>
								{#if getNextLesson()}
									<a
										href="/{username}/space/{slug}/course/{courseId}/lesson/{getNextLesson().id}"
										class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
									>
										次のレッスン
										<svg class="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
										</svg>
									</a>
								{/if}
							</div>
						</div>
					</div>
					
					<!-- サイドバー: レッスン一覧 -->
					<div class="lg:col-span-1">
						<div class="bg-gray-50 rounded-lg p-4">
							<h3 class="font-semibold text-gray-900 mb-4">
								コース内容 ({getCurrentLessonIndex() + 1} / {allLessons.length})
							</h3>
							<div class="space-y-2">
								{#each allLessons as lessonItem, index}
									{@const isCompleted = lessonItem.progress && lessonItem.progress.some(p => p.is_completed)}
									{@const isCurrent = lessonItem.id === lesson.id}
									
									<a
										href="/{username}/space/{slug}/course/{courseId}/lesson/{lessonItem.id}"
										class="block p-3 rounded-lg transition-colors {isCurrent 
											? 'bg-blue-100 border border-blue-200' 
											: 'bg-white hover:bg-gray-100'}"
									>
										<div class="flex items-start space-x-3">
											<div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center {isCompleted ? 'bg-green-100' : isCurrent ? 'bg-blue-100' : 'bg-gray-100'}">
												{#if isCompleted}
													<svg class="h-3 w-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
													</svg>
												{:else if isCurrent}
													<div class="w-2 h-2 bg-blue-600 rounded-full"></div>
												{:else}
													<span class="text-xs text-gray-600 font-medium">{index + 1}</span>
												{/if}
											</div>
											<div class="flex-1 min-w-0">
												<p class="text-sm font-medium text-gray-900 truncate">
													{lessonItem.title}
												</p>
												<p class="text-xs text-gray-500">
													{formatTime(lessonItem.video_duration_seconds)}
												</p>
											</div>
										</div>
									</a>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}