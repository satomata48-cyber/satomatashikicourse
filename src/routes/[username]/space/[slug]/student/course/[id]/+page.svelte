<script lang="ts">
	import { onMount, tick } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	export let data

	$: username = $page.params.username
	$: slug = $page.params.slug
	$: courseId = $page.params.id

	let space: any = null
	let student: any = null
	let course: any = null
	let lessons: any[] = []
	let loading = true
	let error = ''
	let selectedLesson: any = null
	let currentView = 'overview' // 'overview' | 'lesson'
	let lessonCompletions: any[] = []
	let completingLesson = false

	// サーバーから購入状態を取得
	$: hasPurchased = data.hasPurchased ?? false

	onMount(async () => {
		await loadCourseData()
	})

	async function loadCourseData() {
		try {
			// courseIdがUUIDかslugかを判定
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)

			let response;
			if (isUUID) {
				// UUIDの場合は従来通りID検索
				response = await fetch(`/api/courses?id=${courseId}`)
			} else {
				// slugの場合はslug検索
				response = await fetch(`/api/courses?username=${username}&space_slug=${slug}&slug=${courseId}`)
			}

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'コースの取得に失敗しました')
			}

			course = result.course
			space = result.space

			// レッスン一覧を取得（公開済みのみ）
			const lessonsResponse = await fetch(`/api/lessons?courseId=${course.id}`)
			const lessonsResult = await lessonsResponse.json()

			if (lessonsResponse.ok) {
				// 公開済みのレッスンのみフィルタリング
				lessons = (lessonsResult.lessons || []).filter((l: any) => l.is_published)
				// order_indexでソート
				lessons.sort((a: any, b: any) => a.order_index - b.order_index)
			} else {
				console.warn('Failed to load lessons:', lessonsResult.error)
				lessons = []
			}

			// TODO: ユーザー情報の取得
			student = null

			// レッスン完了状態を取得
			await loadLessonCompletions()

		} catch (err: any) {
			error = err.message || 'データの読み込みに失敗しました'
			console.error('Load course data error:', err)
		} finally {
			loading = false
		}
	}

	// レッスン完了状態を取得
	async function loadLessonCompletions() {
		try {
			// TODO: D1実装が必要 - レッスン完了状態の取得
			lessonCompletions = []
		} catch (err) {
			console.error('Failed to load lesson completions:', err)
		}
	}

	// レッスンを選択してウィジェットに表示
	function selectLesson(lesson: any) {
		selectedLesson = lesson
		currentView = 'lesson'
	}

	// 概要表示に戻る
	function showOverview() {
		selectedLesson = null
		currentView = 'overview'
	}

	// コース一覧に戻る
	function backToCourses() {
		const instructorUsername = space?.instructor?.username || username
		goto(`/${instructorUsername}/space/${slug}/student/courses`)
	}

	// YouTube URLを埋め込み用URLに変換
	function getYouTubeEmbedUrl(url: string): string {
		if (!url) return ''

		// YouTube URLのパターンをチェック
		const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
		const match = url.match(youtubeRegex)

		if (match && match[1]) {
			return `https://www.youtube.com/embed/${match[1]}`
		}

		return url // YouTube以外のURLはそのまま返す
	}

	// YouTube ID を取得する
	function getYouTubeId(url: string): string {
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
		return match ? match[1] : ''
	}

	// レッスンが完了済みかチェック
	function isLessonCompleted(lessonId: string): boolean {
		return lessonCompletions.some(completion => completion.lesson_id === lessonId)
	}

	// レッスンを完了として記録
	async function completeLesson() {
		if (!selectedLesson || completingLesson || isLessonCompleted(selectedLesson.id)) {
			return
		}

		completingLesson = true
		try {
			// TODO: D1実装が必要 - レッスン完了の記録
			alert('この機能は現在実装中です')
		} catch (err) {
			console.error('Failed to complete lesson:', err)
			alert('レッスン完了の記録に失敗しました')
		} finally {
			completingLesson = false
		}
	}
</script>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

<svelte:head>
	<title>{course?.title || 'コース'} - 学習</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			<p>{error}</p>
			<a href="/{username}/space/{slug}/student/courses" class="text-sm underline mt-2 inline-block">
				コース一覧に戻る
			</a>
		</div>
	{:else if course}
		<!-- ヘッダー -->
		<div class="bg-white shadow-sm border-b">
			<div class="px-6 py-4">
				<button
					on:click={backToCourses}
					class="flex items-center text-blue-600 hover:text-blue-800 mb-3"
				>
					<svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
					</svg>
					コース一覧に戻る
				</button>
				
				<h1 class="text-2xl font-bold text-gray-900">{course.title}</h1>
			</div>
		</div>
		
		<!-- 購入が必要な場合の表示 -->
		{#if !course.is_free && !hasPurchased}
			<div class="max-w-4xl mx-auto mt-12 px-6">
				<div class="bg-white rounded-lg shadow-lg p-8 text-center">
					<div class="mb-6">
						<svg class="mx-auto h-16 w-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
						</svg>
					</div>
					<h2 class="text-3xl font-bold text-gray-900 mb-4">このコースは有料です</h2>
					<p class="text-xl text-gray-600 mb-8">
						このコースにアクセスするには購入が必要です
					</p>

					<div class="mb-8 p-6 bg-gray-50 rounded-lg">
						<div class="text-4xl font-bold text-blue-600 mb-2">
							{new Intl.NumberFormat('ja-JP', {
								style: 'currency',
								currency: course.currency || 'JPY'
							}).format(course.price)}
						</div>
						<div class="text-sm text-gray-500">一度購入すると、無制限にアクセスできます</div>
					</div>

					<div class="flex flex-col items-center space-y-4">
						<a
							href="/{username}/space/{slug}/course/{course.id}/purchase"
							class="w-full md:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
						>
							このコースを購入する
						</a>
						<a
							href="/{username}/space/{slug}/student/courses"
							class="text-blue-600 hover:text-blue-800"
						>
							コース一覧に戻る
						</a>
					</div>
				</div>
			</div>
		{:else}
			<!-- 2カラムレイアウト -->
			<div class="flex h-screen">
				<!-- 左カラム: レッスン一覧 -->
				<div class="w-80 bg-white border-r border-gray-200 overflow-y-auto">
				<div class="p-6 border-b border-gray-200">
					<h2 class="text-lg font-semibold text-gray-900">レッスン一覧</h2>
					<p class="text-sm text-gray-500 mt-1">{lessons.length}個のレッスン</p>
				</div>
				
				<div class="divide-y divide-gray-100">
					{#each lessons as lesson, index}
						<div 
							class="p-4 hover:bg-gray-50 transition-colors cursor-pointer {selectedLesson && selectedLesson.id === lesson.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''}" 
							on:click={() => selectLesson(lesson)}
						>
							<div class="flex items-start">
								<div class="relative mr-3 flex-shrink-0">
									<span class="inline-flex items-center justify-center h-8 w-8 {selectedLesson && selectedLesson.id === lesson.id ? 'bg-blue-500 text-white' : isLessonCompleted(lesson.id) ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-800'} text-sm font-medium rounded-full">
										{#if isLessonCompleted(lesson.id)}
											<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
											</svg>
										{:else}
											{index + 1}
										{/if}
									</span>
									{#if isLessonCompleted(lesson.id)}
										<div class="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center">
										<h3 class="text-sm font-medium {selectedLesson && selectedLesson.id === lesson.id ? 'text-blue-900' : isLessonCompleted(lesson.id) ? 'text-green-900' : 'text-gray-900'} mb-1 line-clamp-2 flex-1">
											{lesson.title}
										</h3>
										{#if isLessonCompleted(lesson.id)}
											<svg class="h-4 w-4 text-green-500 ml-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
											</svg>
										{/if}
									</div>
									{#if lesson.description}
										<p class="text-xs text-gray-600 line-clamp-2 mb-2">
											{lesson.description}
										</p>
									{/if}
									<div class="flex items-center text-xs {isLessonCompleted(lesson.id) ? 'text-green-600' : 'text-gray-500'}">
										<svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											{#if isLessonCompleted(lesson.id)}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
											{:else if selectedLesson && selectedLesson.id === lesson.id}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h2m6 0h2M8 21l4-7 4 7M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
											{:else}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
											{/if}
										</svg>
										{#if isLessonCompleted(lesson.id)}
											完了済み
										{:else if selectedLesson && selectedLesson.id === lesson.id}
											学習中
										{:else}
											未開始
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
			
			<!-- 右カラム: コース内容 -->
			<div class="flex-1 p-6 overflow-y-auto">
				<div class="bg-white rounded-lg shadow-sm p-6">
					{#if currentView === 'overview'}
						<!-- コース概要表示 -->
						<h2 class="text-xl font-semibold text-gray-900 mb-4">コース概要</h2>
						
						{#if course.description}
							<p class="text-gray-600 mb-6 leading-relaxed">{course.description}</p>
						{/if}
						
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
							<div class="text-center p-4 bg-blue-50 rounded-lg">
								<div class="text-2xl font-bold text-blue-600 mb-1">{lessons.length}</div>
								<div class="text-sm text-gray-600">レッスン数</div>
							</div>
							
							<div class="text-center p-4 bg-green-50 rounded-lg">
								<div class="text-2xl font-bold text-green-600 mb-1">
									{Math.round((lessonCompletions.length / lessons.length) * 100)}%
								</div>
								<div class="text-sm text-gray-600">完了率</div>
							</div>
							
							<div class="text-center p-4 bg-purple-50 rounded-lg">
								<div class="text-2xl font-bold text-purple-600 mb-1">-</div>
								<div class="text-sm text-gray-600">推定時間</div>
							</div>
						</div>
						
						{#if lessons.length === 0}
							<div class="text-center py-12">
								<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
								</svg>
								<h3 class="text-lg font-medium text-gray-900 mb-2">レッスンがありません</h3>
								<p class="text-gray-600">
									現在、このコースには公開されているレッスンがありません。
								</p>
							</div>
						{:else}
							<div class="space-y-4">
								<h3 class="text-lg font-semibold text-gray-900">学習を開始する</h3>
								<p class="text-gray-600">
									右側のレッスン一覧から学習したいレッスンを選択してください。順番通りに学習することをお勧めします。
								</p>
								
								<button
									on:click={() => selectLesson(lessons[0])}
									class="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
								>
									最初のレッスンを開始
								</button>
							</div>
						{/if}
					{:else if currentView === 'lesson' && selectedLesson}
						<!-- レッスン内容表示 -->

						<!-- レッスンタイトルとナビゲーション -->
						<div class="flex items-center justify-between mb-6">
							<div class="flex-1">
								<h2 class="text-2xl font-bold text-gray-900">{selectedLesson.title}</h2>
								{#if selectedLesson.description}
									<p class="text-gray-600 mt-2">{selectedLesson.description}</p>
								{/if}
							</div>
							<button
								on:click={showOverview}
								class="flex items-center text-blue-600 hover:text-blue-800 text-sm ml-4"
							>
								<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
								</svg>
								概要に戻る
							</button>
						</div>

						<!-- セクションベースの表示 -->
						{#if selectedLesson.sections}
							{@const sections = JSON.parse(selectedLesson.sections)}
							<div class="space-y-6">
								{#each sections as section}
									{#if section.type === 'text'}
										<!-- テキストセクション -->
										<div class="border-t border-gray-200 pt-6">
											<div class="prose max-w-none">
												<div class="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
													{section.content || ''}
												</div>
											</div>
										</div>
									{:else if section.type === 'video'}
										<!-- 動画セクション -->
										{@const youtubeId = getYouTubeId(section.videoUrl || '')}
										<div class="border-t border-gray-200 pt-6">
											{#if section.videoType === 'youtube' && youtubeId}
												<!-- YouTube埋め込み動画 -->
												<div class="aspect-video bg-black rounded-lg overflow-hidden">
													<iframe
														src="https://www.youtube.com/embed/{youtubeId}"
														title={selectedLesson.title}
														class="w-full h-full"
														frameborder="0"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
														allowfullscreen
													></iframe>
												</div>
											{:else if section.videoUrl}
												<!-- 外部動画URL -->
												<div class="aspect-video bg-black rounded-lg flex items-center justify-center">
													<a
														href={section.videoUrl}
														target="_blank"
														rel="noopener noreferrer"
														class="text-white hover:text-blue-300 underline"
													>
														動画を開く: {section.videoUrl}
													</a>
												</div>
											{/if}
										</div>
									{:else if section.type === 'attachment'}
										<!-- 添付ファイルセクション -->
										<div class="border-t border-gray-200 pt-6">
											<a
												href={section.linkUrl || '#'}
												target="_blank"
												rel="noopener noreferrer"
												class="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group"
											>
												<div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200">
													<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
													</svg>
												</div>
												<div class="flex-1 min-w-0">
													<p class="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
														{section.linkTitle || 'リンク'}
													</p>
													<p class="text-xs text-gray-500 mt-1 truncate">
														{section.linkUrl || ''}
													</p>
												</div>
												<svg class="h-5 w-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
												</svg>
											</a>
										</div>
									{/if}
								{/each}
							</div>
						{:else}
							<!-- 既存データとの互換性: レガシー形式の表示 -->
							{@const contentBefore = selectedLesson.content_before || selectedLesson.content || ''}
							{@const contentAfter = selectedLesson.content_after || ''}

							<!-- レッスン詳細コンテンツ（動画の前） -->
							{#if contentBefore}
								<div class="border-t border-gray-200 pt-6 pb-6">
									<div class="prose max-w-none">
										<div class="text-gray-800 leading-relaxed whitespace-pre-line text-base">
											{contentBefore}
										</div>
									</div>
								</div>
							{/if}

							<!-- 動画プレイヤーエリア -->
							{#if selectedLesson.video_url}
								{@const embedUrl = getYouTubeEmbedUrl(selectedLesson.video_url)}
								<div class="border-t border-gray-200 pt-6 pb-6">
									<!-- YouTube埋め込み動画プレイヤー -->
									{#if embedUrl.includes('youtube.com/embed')}
										<div class="aspect-video bg-black rounded-lg overflow-hidden">
											<iframe
												src={embedUrl}
												title={selectedLesson.title}
												class="w-full h-full"
												frameborder="0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
												allowfullscreen
											></iframe>
										</div>
									{:else}
										<!-- YouTube以外の動画URL -->
										<div class="aspect-video bg-black rounded-lg flex items-center justify-center">
											<a
												href={selectedLesson.video_url}
												target="_blank"
												rel="noopener noreferrer"
												class="text-white hover:text-blue-300 underline"
											>
												動画を開く: {selectedLesson.video_url}
											</a>
										</div>
									{/if}
								</div>
							{/if}

							<!-- レッスン詳細コンテンツ（動画の後） -->
							{#if contentAfter}
								<div class="border-t border-gray-200 pt-6 pb-6">
									<div class="prose max-w-none">
										<div class="text-gray-800 leading-relaxed whitespace-pre-line text-base">
											{contentAfter}
										</div>
									</div>
								</div>
							{/if}

							<!-- 添付リンク -->
							{#if selectedLesson.attachments}
								{@const attachments = JSON.parse(selectedLesson.attachments)}
								{#if attachments.length > 0}
									<div class="border-t border-gray-200 pt-6 pb-6">
										<h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
											<svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
											</svg>
											添付リンク ({attachments.length})
										</h3>
										<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
											{#each attachments as attachment (attachment.id)}
												<a
													href={attachment.url}
													target="_blank"
													rel="noopener noreferrer"
													class="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group"
												>
													<div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200">
														<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
														</svg>
													</div>
													<div class="flex-1 min-w-0">
														<p class="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
															{attachment.name}
														</p>
														<p class="text-xs text-gray-500 mt-1 truncate">
															{attachment.url}
														</p>
													</div>
													<svg class="h-5 w-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
													</svg>
												</a>
											{/each}
										</div>
									</div>
								{/if}
							{/if}
						{/if}

						<!-- レッスン完了ボタン -->
						<div class="border-t border-gray-200 pt-6">
							{#if isLessonCompleted(selectedLesson.id)}
								<div class="bg-green-50 border border-green-200 rounded-lg p-4">
									<div class="flex items-center text-green-800 mb-2">
										<svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
										</svg>
										<span class="font-medium text-lg">レッスンを完了しました</span>
									</div>
									<p class="text-green-700 text-sm">
										このレッスンは何度でも見直すことができます
									</p>
								</div>
							{:else}
								<button
									on:click={completeLesson}
									disabled={completingLesson}
									class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center"
								>
									{#if completingLesson}
										<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										処理中...
									{:else}
										<svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
										</svg>
										このレッスンを完了する
									{/if}
								</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
			</div>
		{/if}
	{/if}
</div>