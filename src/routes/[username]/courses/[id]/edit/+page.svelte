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
		isPublished: false
	}
	let loading = true
	let saving = false
	let error = ''
	let slugError = ''
	let successMessage = ''
	let lessons: any[] = []
	let themeColor = '#3B82F6'

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
			
			// courseIdがUUIDかslugかを判定
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)

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
				isPublished: course.is_published
			}

			// スペースのテーマカラーを取得
			const { data: spaceData } = await supabase
				.from('spaces')
				.select('landing_page_content')
				.eq('id', course.space_id)
				.single()

			if (spaceData?.landing_page_content?.theme?.primaryColor) {
				themeColor = spaceData.landing_page_content.theme.primaryColor
			}

			// レッスン一覧を取得
			await loadLessons()
		} catch (err: any) {
			error = err.message
			console.error('Load course error:', err)
		} finally {
			loading = false
		}
	}

	async function loadLessons() {
		try {
			// courseオブジェクトから実際のIDを使用
			if (!course?.id) return

			const { data: lessonsData, error: lessonsError } = await supabase
				.from('lessons')
				.select('id, title, description, duration, order_index, is_published')
				.eq('course_id', course.id)
				.order('order_index', { ascending: true })

			if (lessonsError) throw lessonsError
			lessons = lessonsData || []
		} catch (err: any) {
			console.error('Load lessons error:', err)
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
		const { data: existingCourses } = await supabase
			.from('courses')
			.select('id')
			.eq('space_id', course.space_id)
			.eq('slug', formData.slug)
			.neq('id', courseId)

		if (existingCourses && existingCourses.length > 0) {
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
			// slugは編集できないため、バリデーションをスキップ

			// course_page_contentを更新（セクションは空、メタデータのみ）
			const updatedCoursePageContent = {
				sections: [],
				metadata: {
					title: formData.title,
					description: formData.description || `${formData.title}で新しいスキルを習得`,
					seoTitle: `${formData.title} | オンラインコース`,
					seoDescription: formData.description || `${formData.title}で新しいスキルを身に付けませんか？`
				}
			}

			const updateData = {
				title: formData.title,
				description: formData.description,
				// slug: formData.slug, // slugは更新しない
				is_free: formData.isFree,
				price: formData.isFree ? 0 : formData.price,
				currency: formData.currency,
				// estimated_duration_hours: formData.estimatedDurationHours, // このカラムは存在しない
				is_published: formData.isPublished,
				course_page_content: updatedCoursePageContent,
				updated_at: new Date().toISOString()
			}
			
			const { error: updateError } = await supabase
				.from('courses')
				.update(updateData)
				.eq('id', course.id)
			
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
				.eq('id', course.id)
			
			if (updateError) throw updateError
			
			formData.isPublished = newStatus
			course.is_published = newStatus
			
			successMessage = newStatus ? 'コースを公開しました' : 'コースを非公開にしました'
		} catch (err: any) {
			error = err.message
		}
	}

	function formatDuration(seconds: number): string {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	function getTotalDuration(): number {
		return lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0)
	}

	function formatCurrency(price: number, currency: string): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: currency
		}).format(price)
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
						href="/{username}/courses/{course.slug || courseId}/page-editor"
						class="text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
						style="background-color: {themeColor}"
						title="コース詳細ページのコンテンツを編集"
					>
						ページ編集
					</a>
					<a
						href="/{username}/courses/{course.slug || courseId}/lessons"
						class="text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
						style="background-color: {themeColor}"
					>
						レッスン管理
					</a>
				</div>
			</div>
		</div>

		<!-- 2カラムレイアウト -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- 左側：編集フォーム -->
			<div>
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

					<!-- スラッグは編集ページでは非表示（変更不可のため） -->

					<!-- 推定学習時間フィールドは削除（データベースにカラムが存在しないため） -->

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
							disabled={saving}
							class="flex-1 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
							style="background-color: {themeColor}"
						>
							{saving ? '保存中...' : '保存'}
						</button>
					</div>
				</form>
			</div>
			</div>

			<!-- 右側：プレビュー -->
			<div class="lg:sticky lg:top-24 lg:self-start">
				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">プレビュー</h3>

					<!-- コースヘッダー -->
					<div
						class="rounded-lg p-6 text-white mb-6"
						style="background: linear-gradient(135deg, {themeColor}, color-mix(in srgb, {themeColor} 80%, transparent))"
					>
						<h1 class="text-2xl font-bold mb-2">{formData.title || 'コースタイトル'}</h1>
						<p class="text-white/90 mb-4">{formData.description || 'コースの説明がここに表示されます'}</p>

						<!-- コース統計 -->
						<div class="flex flex-wrap gap-4 text-sm text-white/90">
							<div class="flex items-center">
								<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
								</svg>
								{lessons.length} レッスン
							</div>
							<div class="flex items-center">
								<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
								{formatDuration(getTotalDuration())}
							</div>
						</div>
					</div>

					<!-- 価格表示 -->
					<div class="mb-6">
						<div class="bg-gray-50 rounded-lg p-4 text-center">
							{#if formData.isFree}
								<div class="text-2xl font-bold text-gray-900">無料コース</div>
								<p class="text-sm text-gray-600 mt-1">誰でもアクセスできます</p>
							{:else}
								<div class="text-3xl font-bold text-gray-900 mb-1">
									{formatCurrency(formData.price, formData.currency)}
								</div>
								<p class="text-sm text-gray-600">購入が必要です</p>
							{/if}
						</div>
					</div>

					<!-- レッスン一覧 -->
					<div>
						<h4 class="text-sm font-semibold text-gray-900 mb-3">コンテンツ</h4>
						{#if lessons.length === 0}
							<p class="text-sm text-gray-500 text-center py-4">レッスンがまだありません</p>
						{:else}
							<div class="space-y-2">
								{#each lessons as lesson, index}
									<div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
										<div class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
											<span class="text-xs text-gray-600 font-medium">{index + 1}</span>
										</div>
										<div class="flex-1 min-w-0">
											<h5 class="text-sm font-medium text-gray-900 truncate">{lesson.title}</h5>
											{#if lesson.description}
												<p class="text-xs text-gray-600 mt-1 line-clamp-2">{lesson.description}</p>
											{/if}
											<div class="flex items-center mt-1 text-xs text-gray-500">
												<svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
												</svg>
												{formatDuration(lesson.duration)}
												{#if !lesson.is_published}
													<span class="ml-2 text-yellow-600">• 非公開</span>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
						<a
							href="/{username}/courses/{course.slug || courseId}/lessons"
							class="block mt-4 text-center text-sm text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
							style="background-color: {themeColor}"
						>
							レッスンを管理
						</a>
					</div>

					<!-- 公開ページへのリンク -->
					<div class="mt-6 pt-6 border-t border-gray-200">
						<a
							href="/{username}/space/{course.space.slug}/course/{course.slug || courseId}"
							target="_blank"
							class="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
						>
							<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
							</svg>
							公開ページで確認
						</a>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>