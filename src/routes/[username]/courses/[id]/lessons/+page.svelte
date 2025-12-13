<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username
	$: courseId = $page.params.id

	let course: any = null
	let space: any = null
	let lessons: any[] = []
	let loading = true
	let error = ''

	// R2動画関連
	let showVideoModal = false
	let r2Videos: any[] = []
	let loadingVideos = false
	let uploadingVideo = false
	let uploadProgress = 0
	let currentVideoSectionIndex: number | null = null

	// セクションの型定義
	interface Section {
		id: string
		type: string
		content?: string
		videoType?: string
		videoUrl?: string
		linkUrl?: string
		linkTitle?: string
	}

	// 編集中のレッスン
	let editingLesson: any = null
	let editMode = false

	// レッスンフォーム
	let lessonTitle = ''
	let lessonDescription = ''
	let sections: Section[] = []
	let isPublished = false
	let duration = 0

	// フォーム状態
	let saveLoading = false
	let saveError = ''

	// セクション開閉状態
	let expandedSections: Set<string> = new Set()

	// ドラッグ&ドロップ
	let draggedIndex: number | null = null

	// セクションテンプレート
	const templates = [
		{
			name: 'テキストコンテンツ',
			icon: '📝',
			description: 'テキストや説明を追加',
			template: {
				type: 'text',
				content: ''
			}
		},
		{
			name: '動画',
			icon: '🎥',
			description: 'YouTube/R2動画を追加',
			template: {
				type: 'video',
				videoType: 'youtube',
				videoUrl: ''
			}
		},
		{
			name: '添付ファイル',
			icon: '📎',
			description: '外部リンクを添付',
			template: {
				type: 'attachment',
				linkUrl: '',
				linkTitle: ''
			}
		}
	]

	// R2動画一覧を取得
	async function loadR2Videos() {
		loadingVideos = true
		try {
			const response = await fetch(`/api/upload/video?courseId=${courseId}`)
			const result = await response.json()
			if (response.ok) {
				r2Videos = result.videos || []
			}
		} catch (err) {
			console.error('Failed to load R2 videos:', err)
		} finally {
			loadingVideos = false
		}
	}

	// 動画選択モーダルを開く
	function openVideoModal(sectionIndex: number) {
		currentVideoSectionIndex = sectionIndex
		showVideoModal = true
		loadR2Videos()
	}

	// R2動画を選択
	function selectR2Video(video: any) {
		if (currentVideoSectionIndex !== null) {
			sections[currentVideoSectionIndex].videoType = 'r2'
			sections[currentVideoSectionIndex].videoUrl = video.url
			sections = [...sections]
		}
		showVideoModal = false
		currentVideoSectionIndex = null
	}

	// 動画をアップロード
	async function uploadVideo(event: Event) {
		const input = event.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return

		uploadingVideo = true
		uploadProgress = 0

		try {
			const formData = new FormData()
			formData.append('file', file)
			formData.append('courseId', courseId)

			const response = await fetch('/api/upload/video', {
				method: 'POST',
				body: formData
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'アップロードに失敗しました')
			}

			// アップロード成功後、動画一覧を再読み込み
			await loadR2Videos()

			// アップロードした動画を自動選択
			if (currentVideoSectionIndex !== null) {
				sections[currentVideoSectionIndex].videoType = 'r2'
				sections[currentVideoSectionIndex].videoUrl = result.url
				sections = [...sections]
			}

			alert('動画をアップロードしました')
		} catch (err: any) {
			alert(`アップロードに失敗しました: ${err.message}`)
		} finally {
			uploadingVideo = false
			uploadProgress = 0
			input.value = ''
		}
	}

	// 動画を削除
	async function deleteR2Video(video: any) {
		if (!confirm(`「${video.name}」を削除しますか？`)) return

		try {
			const response = await fetch(`/api/upload/video?key=${encodeURIComponent(video.key)}`, {
				method: 'DELETE'
			})

			if (!response.ok) {
				throw new Error('削除に失敗しました')
			}

			await loadR2Videos()
		} catch (err: any) {
			alert(`削除に失敗しました: ${err.message}`)
		}
	}

	// ファイルサイズをフォーマット
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B'
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
		if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
		return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
	}

	onMount(async () => {
		await loadData()
	})

	async function loadData() {
		try {
			// APIからコース情報を取得
			const courseResponse = await fetch(`/api/courses?id=${courseId}`)
			const courseResult = await courseResponse.json()

			if (!courseResponse.ok) {
				throw new Error(courseResult.error || 'コースの取得に失敗しました')
			}

			course = courseResult.course
			space = courseResult.space

			// レッスン一覧を取得
			const lessonsResponse = await fetch(`/api/lessons?courseId=${courseId}`)
			const lessonsResult = await lessonsResponse.json()

			if (lessonsResponse.ok) {
				lessons = lessonsResult.lessons || []
			} else {
				console.warn('Failed to load lessons:', lessonsResult.error)
				lessons = []
			}

		} catch (err: any) {
			error = err.message
			console.error('Load data error:', err)
		} finally {
			loading = false
		}
	}

	// 既存データをセクション形式に変換
	function convertLegacyToSections(lesson: any): Section[] {
		const convertedSections: Section[] = []

		// content_before
		if (lesson.content_before) {
			convertedSections.push({
				id: crypto.randomUUID(),
				type: 'text',
				content: lesson.content_before
			})
		}

		// video
		if (lesson.video_url) {
			convertedSections.push({
				id: crypto.randomUUID(),
				type: 'video',
				videoType: lesson.video_type || 'youtube',
				videoUrl: lesson.video_url
			})
		}

		// content_after
		if (lesson.content_after) {
			convertedSections.push({
				id: crypto.randomUUID(),
				type: 'text',
				content: lesson.content_after
			})
		}

		// attachments
		if (lesson.attachments) {
			try {
				const attachments = JSON.parse(lesson.attachments)
				attachments.forEach((att: any) => {
					convertedSections.push({
						id: crypto.randomUUID(),
						type: 'attachment',
						linkUrl: att.url,
						linkTitle: att.name
					})
				})
			} catch (e) {
				console.warn('Failed to parse attachments:', e)
			}
		}

		return convertedSections
	}

	// レッスンを編集モードにする
	function editLesson(lesson: any) {
		editMode = true
		editingLesson = lesson

		lessonTitle = lesson.title
		lessonDescription = lesson.description || ''
		isPublished = lesson.is_published
		duration = Math.round(lesson.duration / 60)

		// sectionsがあればそれを使用、なければレガシーデータから変換
		if (lesson.sections) {
			try {
				sections = JSON.parse(lesson.sections)
			} catch (e) {
				console.warn('Failed to parse sections:', e)
				sections = convertLegacyToSections(lesson)
			}
		} else {
			sections = convertLegacyToSections(lesson)
		}
	}

	// 編集をキャンセル
	function cancelEdit() {
		editMode = false
		editingLesson = null
		lessonTitle = ''
		lessonDescription = ''
		sections = []
		isPublished = false
		duration = 0
		saveError = ''
	}

	// レッスンを保存
	async function saveLesson() {
		saveLoading = true
		saveError = ''

		try {
			if (!lessonTitle.trim()) {
				throw new Error('レッスンタイトルを入力してください')
			}

			const lessonData = {
				course_id: courseId,
				title: lessonTitle,
				description: lessonDescription,
				sections: JSON.stringify(sections),
				duration: duration * 60,
				order_index: editMode ? editingLesson.order_index : lessons.length,
				is_published: isPublished
			}

			const url = '/api/lessons'
			const method = editMode ? 'PUT' : 'POST'

			const requestData = editMode
				? { id: editingLesson.id, ...lessonData }
				: lessonData

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestData)
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'レッスンの保存に失敗しました')
			}

			// フォームをリセット
			cancelEdit()

			// レッスンリストを再読み込み
			await loadData()

		} catch (err: any) {
			saveError = err.message || 'レッスン保存に失敗しました'
			console.error('Lesson save error:', err)
		} finally {
			saveLoading = false
		}
	}

	async function deleteLesson(lessonId: string) {
		if (!confirm('このレッスンを削除してもよろしいですか？')) {
			return
		}

		try {
			const response = await fetch(`/api/lessons?id=${lessonId}`, {
				method: 'DELETE'
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '削除に失敗しました')
			}

			await loadData()

		} catch (err: any) {
			alert(`削除に失敗しました: ${err.message}`)
		}
	}

	async function togglePublished(lesson: any) {
		try {
			const response = await fetch('/api/lessons', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: lesson.id,
					is_published: !lesson.is_published
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '公開状態の変更に失敗しました')
			}

			await loadData()

		} catch (err: any) {
			alert(`公開状態の変更に失敗しました: ${err.message}`)
		}
	}

	// セクション管理
	function addSection(template: any) {
		const newSection: Section = {
			id: crypto.randomUUID(),
			...template
		}
		sections = [...sections, newSection]
		expandedSections.add(newSection.id)
		expandedSections = new Set(expandedSections)
	}

	function deleteSection(index: number) {
		sections = sections.filter((_, i) => i !== index)
	}

	function toggleSection(sectionId: string) {
		if (expandedSections.has(sectionId)) {
			expandedSections.delete(sectionId)
		} else {
			expandedSections.add(sectionId)
		}
		expandedSections = new Set(expandedSections)
	}

	// ドラッグ&ドロップ
	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move'
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault()
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move'
		}
	}

	function handleDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault()
		if (draggedIndex !== null && draggedIndex !== targetIndex) {
			const newSections = [...sections]
			const [draggedItem] = newSections.splice(draggedIndex, 1)
			newSections.splice(targetIndex, 0, draggedItem)
			sections = newSections
		}
		draggedIndex = null
	}

	function handleDragEnd() {
		draggedIndex = null
	}

	function getSectionIcon(type: string): string {
		const template = templates.find(t => t.template.type === type)
		return template?.icon || '📄'
	}

	function getYouTubeId(url: string): string {
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
		return match ? match[1] : ''
	}

	function previewCourse() {
		if (space && course) {
			window.open(`/${username}/space/${space.slug}/course/${course.slug || course.id}`, '_blank')
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
	{:else if course}
		<!-- Header -->
		<div class="bg-white border-b border-gray-200 sticky top-0 z-10">
			<div class="px-6 py-4">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-xl font-bold text-gray-900">レッスン管理</h1>
						<p class="text-sm text-gray-600 mt-1">
							コース: {course.title}
						</p>
					</div>
					<div class="flex items-center space-x-3">
						<button
							on:click={previewCourse}
							class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
						>
							プレビュー
						</button>
						<button
							on:click={saveLesson}
							disabled={saveLoading || !lessonTitle}
							class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
						>
							{saveLoading ? '保存中...' : '保存'}
						</button>
					</div>
				</div>

				{#if saveError}
					<div class="mt-3 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-sm">
						{saveError}
					</div>
				{/if}
			</div>
		</div>

		<div class="flex h-[calc(100vh-120px)]">
			<!-- 左側: 編集エリア -->
			<div class="w-1/2 bg-white border-r border-gray-200 overflow-y-auto">
				<div class="p-6">
					<!-- 基本情報 -->
					<div class="mb-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">
							{editMode ? 'レッスン編集' : '新規レッスン作成'}
						</h2>

						<div class="space-y-4">
							<div>
								<label for="title" class="block text-sm font-medium text-gray-700 mb-1">
									レッスンタイトル *
								</label>
								<input
									id="title"
									type="text"
									bind:value={lessonTitle}
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
									bind:value={lessonDescription}
									rows="2"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
									placeholder="このレッスンで学ぶ内容..."
								></textarea>
							</div>

							<div>
								<label for="duration" class="block text-sm font-medium text-gray-700 mb-1">
									コンテンツ消費時間（分）
								</label>
								<input
									id="duration"
									type="number"
									bind:value={duration}
									min="0"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="10"
								/>
							</div>

							<div>
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={isPublished}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
									<span class="ml-2 text-sm text-gray-700">すぐに公開する</span>
								</label>
							</div>
						</div>
					</div>

					<!-- セクション一覧 -->
					<div class="mb-6">
						<h3 class="text-sm font-semibold text-gray-900 mb-3">コンテンツセクション</h3>
						{#if sections.length === 0}
							<div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
								<p class="text-xs text-gray-500">
									下のテンプレートから<br>セクションを追加してください
								</p>
							</div>
						{:else}
							<div class="space-y-2">
								{#each sections as section, index}
									<div
										class="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
										class:opacity-50={draggedIndex === index}
										class:border-blue-500={draggedIndex !== null && draggedIndex !== index}
										draggable="true"
										on:dragstart={(e) => handleDragStart(e, index)}
										on:dragover={handleDragOver}
										on:drop={(e) => handleDrop(e, index)}
										on:dragend={handleDragEnd}
									>
										<!-- ヘッダー -->
										<div class="p-3 flex items-center justify-between">
											<button
												type="button"
												on:click={() => toggleSection(section.id)}
												class="flex items-center space-x-2 flex-1 text-left hover:bg-gray-50 transition-colors -m-3 p-3 rounded-l-lg"
											>
												<span class="text-base">{getSectionIcon(section.type)}</span>
												<span class="text-xs font-medium text-gray-900">
													{section.type === 'text' ? 'テキストコンテンツ' : section.type === 'video' ? '動画' : '添付ファイル'}
												</span>
												<svg class="w-4 h-4 text-gray-400 transition-transform ml-auto" class:rotate-180={expandedSections.has(section.id)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
												</svg>
											</button>
											<div class="flex items-center space-x-1">
												<div class="p-1 text-gray-400 cursor-move" title="ドラッグして移動">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
													</svg>
												</div>
												<button
													type="button"
													on:click|stopPropagation={() => deleteSection(index)}
													class="p-1 text-red-400 hover:text-red-600"
													title="削除"
												>
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
													</svg>
												</button>
											</div>
										</div>

										<!-- 詳細編集 -->
										{#if expandedSections.has(section.id)}
											<div class="p-3 pt-0 border-t border-gray-100">
												{#if section.type === 'text'}
													<textarea
														bind:value={section.content}
														rows="4"
														class="w-full text-sm border border-gray-300 rounded px-3 py-2"
														placeholder="テキストコンテンツを入力..."
													></textarea>
												{:else if section.type === 'video'}
													<div class="space-y-2">
														<select
															bind:value={section.videoType}
															class="w-full text-sm border border-gray-300 rounded px-3 py-2"
														>
															<option value="youtube">YouTube</option>
															<option value="r2">R2ストレージ</option>
															<option value="external">外部URL</option>
														</select>
														{#if section.videoType === 'r2'}
															<div class="flex space-x-2">
																<input
																	type="url"
																	bind:value={section.videoUrl}
																	class="flex-1 text-sm border border-gray-300 rounded px-3 py-2"
																	placeholder="R2動画URL"
																	readonly
																/>
																<button
																	type="button"
																	on:click={() => openVideoModal(sections.indexOf(section))}
																	class="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
																>
																	選択
																</button>
															</div>
															{#if section.videoUrl}
																<p class="text-xs text-green-600">動画が選択されています</p>
															{/if}
														{:else}
															<input
																type="url"
																bind:value={section.videoUrl}
																class="w-full text-sm border border-gray-300 rounded px-3 py-2"
																placeholder={section.videoType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://video-url...'}
															/>
														{/if}
													</div>
												{:else if section.type === 'attachment'}
													<div class="space-y-2">
														<input
															type="text"
															bind:value={section.linkTitle}
															class="w-full text-sm border border-gray-300 rounded px-3 py-2"
															placeholder="リンクのタイトル"
														/>
														<input
															type="url"
															bind:value={section.linkUrl}
															class="w-full text-sm border border-gray-300 rounded px-3 py-2"
															placeholder="https://..."
														/>
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- テンプレートパレット -->
					<div class="border-t pt-4">
						<h3 class="text-sm font-semibold text-gray-900 mb-3">セクションを追加</h3>
						<div class="grid grid-cols-3 gap-2">
							{#each templates as template}
								<button
									on:click={() => addSection(template.template)}
									class="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group text-center"
								>
									<span class="text-2xl block mb-1">{template.icon}</span>
									<div class="font-medium text-gray-900 text-xs group-hover:text-blue-600">
										{template.name}
									</div>
								</button>
							{/each}
						</div>
					</div>

					<!-- アクションボタン -->
					<div class="flex space-x-3 pt-6 border-t mt-6">
						{#if editMode}
							<button
								type="button"
								on:click={cancelEdit}
								class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
							>
								キャンセル
							</button>
						{/if}
						<button
							type="button"
							on:click={saveLesson}
							disabled={saveLoading || !lessonTitle}
							class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
						>
							{saveLoading ? '保存中...' : editMode ? '更新' : '作成'}
						</button>
					</div>
				</div>
			</div>

			<!-- 右側: プレビュー -->
			<div class="w-1/2 bg-gray-50 overflow-y-auto">
				<div class="p-6">
					<div class="bg-white rounded-lg shadow-lg overflow-hidden max-w-3xl mx-auto">
						<!-- プレビューヘッダー -->
						<div class="bg-gray-50 border-b border-gray-200 px-4 py-3">
							<h2 class="text-sm font-semibold text-gray-900">プレビュー</h2>
						</div>

						<!-- レッスンカード -->
						<div class="p-6">
							<div class="flex items-start space-x-3 mb-6">
								<div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
									<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
									</svg>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="text-lg font-semibold text-gray-900 mb-1">
										{lessonTitle || 'レッスンタイトル'}
									</h3>
									{#if lessonDescription}
										<p class="text-sm text-gray-600 mb-2">{lessonDescription}</p>
									{/if}
									<div class="flex items-center space-x-3 text-xs text-gray-500">
										<span class="flex items-center">
											<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
											</svg>
											{duration ? `${duration}分` : '0分'}
										</span>
										{#if isPublished}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700">
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

							<!-- セクションプレビュー -->
							{#if sections.length > 0}
								<div class="space-y-4">
									{#each sections as section}
										{#if section.type === 'text'}
											<div class="bg-white p-4 border border-gray-200 rounded-lg">
												<div class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
													{section.content || 'テキストコンテンツがここに表示されます'}
												</div>
											</div>
										{:else if section.type === 'video' && section.videoUrl}
											{@const youtubeId = getYouTubeId(section.videoUrl)}
											{#if section.videoType === 'youtube' && youtubeId}
												<div class="border border-gray-200 rounded-lg overflow-hidden">
													<div class="aspect-video bg-black">
														<iframe
															src="https://www.youtube.com/embed/{youtubeId}"
															title="動画"
															frameborder="0"
															allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
															allowfullscreen
															class="w-full h-full"
														></iframe>
													</div>
												</div>
											{:else if section.videoType === 'r2'}
												<div class="border border-gray-200 rounded-lg overflow-hidden">
													<div class="aspect-video bg-black">
														<video
															src={section.videoUrl}
															controls
															class="w-full h-full"
														>
															お使いのブラウザは動画再生に対応していません
														</video>
													</div>
												</div>
											{:else}
												<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
													<p class="text-xs text-gray-600">動画URL: {section.videoUrl}</p>
												</div>
											{/if}
										{:else if section.type === 'attachment'}
											<a
												href={section.linkUrl || '#'}
												target="_blank"
												rel="noopener noreferrer"
												class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
											>
												<div class="flex items-center space-x-3 flex-1 min-w-0">
													<div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded flex items-center justify-center group-hover:bg-blue-200 transition-colors">
														<svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
														</svg>
													</div>
													<div class="flex-1 min-w-0">
														<p class="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
															{section.linkTitle || 'リンクタイトル'}
														</p>
														{#if section.linkUrl}
															<p class="text-xs text-gray-500 truncate mt-0.5">{section.linkUrl}</p>
														{/if}
													</div>
												</div>
												<svg class="h-5 w-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
												</svg>
											</a>
										{/if}
									{/each}
								</div>
							{:else}
								<div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
									<p class="text-sm text-gray-400">
										セクションを追加すると<br>ここにプレビューが表示されます
									</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- 作成済みレッスン一覧 -->
					{#if lessons.length > 0}
						<div class="mt-6 pt-6">
							<h4 class="text-sm font-semibold text-gray-700 mb-4">作成済みレッスン ({lessons.length}件)</h4>
							<div class="space-y-2">
								{#each lessons as lesson (lesson.id)}
									<div
										class="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors {editingLesson?.id === lesson.id ? 'bg-blue-50 border-blue-300' : ''}"
									>
										<div class="flex items-start justify-between">
											<div class="flex items-start space-x-2 flex-1 cursor-pointer" on:click={() => editLesson(lesson)}>
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

<!-- R2動画選択モーダル -->
{#if showVideoModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
			<div class="p-4 border-b border-gray-200 flex items-center justify-between">
				<h3 class="text-lg font-bold text-gray-900">R2から動画を選択</h3>
				<button
					on:click={() => { showVideoModal = false; currentVideoSectionIndex = null }}
					class="text-gray-400 hover:text-gray-600"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
					</svg>
				</button>
			</div>

			<div class="p-4">
				<!-- アップロードエリア -->
				<div class="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
					<input
						type="file"
						accept="video/*"
						on:change={uploadVideo}
						disabled={uploadingVideo}
						class="hidden"
						id="video-upload"
					/>
					<label
						for="video-upload"
						class="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
						class:opacity-50={uploadingVideo}
					>
						{#if uploadingVideo}
							<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							アップロード中...
						{:else}
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
							</svg>
							新しい動画をアップロード
						{/if}
					</label>
					<p class="text-xs text-gray-500 mt-2">MP4, WebM, MOV など（最大500MB）</p>
				</div>

				<!-- 動画一覧 -->
				<div class="overflow-y-auto max-h-[400px]">
					{#if loadingVideos}
						<div class="flex justify-center py-8">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						</div>
					{:else if r2Videos.length === 0}
						<div class="text-center py-8 text-gray-500">
							<svg class="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
							</svg>
							<p>アップロードされた動画がありません</p>
						</div>
					{:else}
						<div class="space-y-2">
							{#each r2Videos as video}
								<div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
									<div class="flex items-center space-x-3 flex-1 min-w-0">
										<div class="flex-shrink-0 w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
											<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
											</svg>
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-gray-900 truncate">{video.name}</p>
											<p class="text-xs text-gray-500">{formatFileSize(video.size)}</p>
										</div>
									</div>
									<div class="flex items-center space-x-2">
										<button
											on:click={() => selectR2Video(video)}
											class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
										>
											選択
										</button>
										<button
											on:click={() => deleteR2Video(video)}
											class="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
										>
											削除
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
