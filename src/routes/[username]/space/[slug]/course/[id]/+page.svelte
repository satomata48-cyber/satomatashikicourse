<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	import { getInstructorIdFromUuid } from '$lib/utils/instructor'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	$: courseId = $page.params.id
	
	let space: any = null
	let course: any = null
	let lessons: any[] = []
	let student: any = null
	let hasAccess = false
	let loading = true
	let error = ''
	
	onMount(async () => {
		await loadCourseData()
	})
	
	async function loadCourseData() {
		try {
			// usernameから講師IDを取得
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('id')
				.eq('username', username)
				.single()
			
			if (profileError || !profileData) {
				throw new Error('講師が見つかりません')
			}
			
			const instructorId = profileData.id
			
			// 現在のユーザーが生徒として登録されているかチェック
			const { data: { user } } = await supabase.auth.getUser()
			if (user) {
				const { data: studentData } = await supabase
					.from('space_students')
					.select('*, student:profiles!student_id(id, display_name, email)')
					.eq('student_id', user.id)
					.eq('status', 'active')
					.maybeSingle()
				
				if (studentData) {
					student = studentData.student
					// このスペースの生徒であるかチェック
					const { data: spaceStudentData } = await supabase
						.from('space_students')
						.select('*')
						.eq('student_id', user.id)
						.eq('status', 'active')
						.maybeSingle()
					
					if (spaceStudentData) {
						hasAccess = true
					}
				}
			}
			
			// スペース情報を取得
			const { data: spaceData, error: spaceError } = await supabase
				.from('spaces')
				.select('*')
				.eq('slug', slug)
				.eq('instructor_id', instructorId)
				.single()
			
			if (spaceError) throw spaceError
			space = spaceData
			
			// 生徒登録状況を確認（認証されている場合のみ）
			let currentUser = null
			try {
				const { data: { user } } = await supabase.auth.getUser()
				currentUser = user
			} catch (err) {
				console.log('Not authenticated or error getting user')
			}
			
			if (currentUser?.id) {
				try {
					const { data: studentData } = await supabase
						.from('space_students')
						.select('*')
						.eq('student_id', currentUser.id)
						.eq('space_id', space.id)
						.single()
					
					student = studentData
				} catch (err) {
					// 登録されていない場合はエラーになるが、それは正常
					console.log('Student not enrolled yet:', err.message)
					student = null
				}
			} else {
				// 認証されていない場合
				student = null
			}
			
			// コース詳細を取得（IDまたはslugで検索）
			let courseQuery = supabase
				.from('courses')
				.select(`
					*,
					purchases:course_purchases(
						status,
						purchased_at,
						amount,
						currency
					)
				`)
				.eq('space_id', space.id)
			
			// UUIDの場合はid、そうでなければslugで検索
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)
			if (isUUID) {
				courseQuery = courseQuery.eq('id', courseId)
			} else {
				courseQuery = courseQuery.eq('slug', courseId)
			}
			
			const { data: courseData, error: courseError } = await courseQuery.single()
			
			if (courseError) {
				console.error('Course query error:', courseError)
				throw new Error('コースが見つかりません')
			}
			if (!courseData) throw new Error('コースが見つかりません')
			
			course = courseData
			
			// アクセス権限を確認
			if (course.is_free) {
				hasAccess = !!student
			} else {
				hasAccess = !!student && course.purchases && course.purchases.some(p => p.status === 'completed')
			}
			
			// レッスン一覧を取得（実際のコースIDを使用）
			let lessonsQuery = supabase
				.from('lessons')
				.select(`
					*,
					progress:lesson_progress(
						watch_time,
						total_duration,
						completed,
						last_watched_at
					)
				`)
				.eq('course_id', course.id)
				.order('order_index', { ascending: true })
			
			// 公開済みレッスンのみ取得
			lessonsQuery = lessonsQuery.eq('is_published', true)
			
			const { data: lessonsData, error: lessonsError } = await lessonsQuery
			
			if (lessonsError) throw lessonsError
			lessons = lessonsData || []
			
		} catch (err: any) {
			error = err.message || 'データの読み込みに失敗しました'
			console.error('Load course data error:', err)
			console.error('Error details:', {
				username,
				slug,
				courseId,
				errorMessage: err.message,
				errorStack: err.stack
			})
		} finally {
			loading = false
		}
	}
	
	function formatDuration(seconds: number): string {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}
	
	function formatCurrency(price: number, currency: string): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: currency
		}).format(price)
	}
	
	function getLessonProgress(lesson: any): number {
		if (!lesson.progress || lesson.progress.length === 0) return 0
		const progress = lesson.progress[0]
		if (!progress.total_duration) return 0
		return Math.round((progress.watch_time / progress.total_duration) * 100)
	}
	
	function isLessonCompleted(lesson: any): boolean {
		return lesson.progress && lesson.progress.some(p => p.completed)
	}
	
	function getTotalDuration(): number {
		return lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0)
	}
	
	function getCompletedLessons(): number {
		return lessons.filter(lesson => isLessonCompleted(lesson)).length
	}
	
	function getCourseProgress(): number {
		if (lessons.length === 0) return 0
		return Math.round((getCompletedLessons() / lessons.length) * 100)
	}
	
	// ライティングページコンテンツの処理
	$: coursePageContent = (() => {
		if (!course?.course_page_content) {
			return {
				sections: [],
				metadata: {},
				theme: { primaryColor: '#3B82F6', accentColor: '#F59E0B' }
			}
		}
		
		try {
			const content = typeof course.course_page_content === 'string' 
				? JSON.parse(course.course_page_content)
				: course.course_page_content
			
			return {
				sections: content.sections || [],
				metadata: content.metadata || {},
				theme: content.theme || { primaryColor: '#3B82F6', accentColor: '#F59E0B' }
			}
		} catch (err) {
			console.error('Error parsing course page content:', err)
			return {
				sections: [],
				metadata: {},
				theme: { primaryColor: '#3B82F6', accentColor: '#F59E0B' }
			}
		}
	})()
	
	$: theme = coursePageContent.theme || space?.landing_page_content?.theme || { primaryColor: '#3B82F6', accentColor: '#F59E0B' }
</script>

<svelte:head>
	<title>{course?.title || 'Loading...'} | {space?.title || ''}</title>
	<meta name="description" content={course?.description || ''} />
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
			<h1 class="text-2xl font-bold text-gray-900 mb-2">エラーが発生しました</h1>
			<p class="text-gray-600">{error}</p>
		</div>
	</div>
{:else if course && space}
	<div class="min-h-screen bg-gray-50">
		<!-- トップナビゲーション（生徒向け） -->
		<nav class="bg-white shadow-sm border-b">
			<div class="max-w-7xl mx-auto px-6 py-4">
				<div class="flex justify-between items-center">
					<!-- 左側：スペース名とコース名 -->
					<div class="flex items-center space-x-2">
						<div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
							<span class="text-white font-bold text-sm">{space.title.charAt(0)}</span>
						</div>
						<div class="flex items-center space-x-2 text-sm text-gray-600">
							<a href="/{username}/space/{slug}" class="hover:text-gray-900 font-medium transition-colors">
								{space.title}
							</a>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
							</svg>
							<span class="text-gray-900 font-medium">{course.title}</span>
						</div>
					</div>
					
					<!-- 右側：生徒向けアクションボタン -->
					<div class="flex items-center space-x-4">
						{#if student}
							<!-- ログイン済み生徒の場合 -->
							<span class="text-sm text-gray-600">こんにちは、{student.display_name}さん</span>
							<a 
								href="/{username}/space/{slug}/dashboard" 
								class="text-gray-600 hover:text-gray-900 font-medium transition-colors"
							>
								マイページ
							</a>
						{:else}
							<!-- 未ログインの場合 -->
							<button 
								on:click={() => window.location.href = `/${username}/space/${slug}/login`}
								class="text-gray-600 hover:text-gray-900 font-medium transition-colors"
							>
								ログイン
							</button>
							<a 
								href="/{username}/space/{slug}/enroll" 
								class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
							>
								生徒登録
							</a>
						{/if}
					</div>
				</div>
			</div>
		</nav>

		<!-- ヘッダー -->
		<header 
			class="py-16 text-white relative overflow-hidden"
			style="background: linear-gradient(135deg, {theme.primaryColor}, color-mix(in srgb, {theme.primaryColor} 80%, transparent))"
		>
			<div class="absolute inset-0 bg-black opacity-10"></div>
			<div class="relative container mx-auto px-6">
				<div class="max-w-4xl mx-auto">
					
					<div class="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
						<div class="flex-1">
							<h1 class="text-4xl font-bold mb-4">{course.title}</h1>
							<p class="text-xl text-white/90 mb-6">{course.description}</p>
							
							<!-- コース統計 -->
							<div class="flex flex-wrap gap-6 text-white/90 mb-6">
								<div class="flex items-center">
									<svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
									</svg>
									{lessons.length} レッスン
								</div>
								<div class="flex items-center">
									<svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
									</svg>
									{formatDuration(getTotalDuration())}
								</div>
								{#if course.estimated_duration_hours}
									<div class="flex items-center">
										<svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
										</svg>
										推定 {course.estimated_duration_hours} 時間
									</div>
								{/if}
							</div>
						</div>
						
						<!-- 価格・アクションエリア -->
						<div class="lg:w-80">
							<div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
								{#if course.is_free}
									<div class="text-center mb-4">
										<span class="text-2xl font-bold">無料コース</span>
									</div>
								{:else}
									<div class="text-center mb-4">
										<div class="text-3xl font-bold">{formatCurrency(course.price, course.currency)}</div>
									</div>
								{/if}
								
								{#if hasAccess}
									{#if student}
										<div class="space-y-3">
											{#if getCourseProgress() > 0}
												<div class="mb-4">
													<div class="flex justify-between text-sm text-white/90 mb-2">
														<span>学習進捗</span>
														<span>{getCourseProgress()}%</span>
													</div>
													<div class="w-full bg-white/20 rounded-full h-2">
														<div 
															class="bg-white h-2 rounded-full transition-all duration-300"
															style="width: {getCourseProgress()}%"
														></div>
													</div>
												</div>
											{/if}
											
											<a
												href="/{username}/space/{slug}/dashboard"
												class="block w-full text-center bg-white text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
											>
												ダッシュボードへ
											</a>
										</div>
									{:else}
										<a
											href="/{username}/space/{slug}/enroll"
											class="block w-full text-center bg-white text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
										>
											学習を始める
										</a>
									{/if}
								{:else if student}
									<div class="text-center">
										<p class="text-white/90 mb-4">このコースにアクセスするには購入が必要です</p>
										<a
											href="/{username}/space/{slug}/course/{courseId}/purchase"
											class="block w-full text-center bg-white text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
										>
											今すぐ購入
										</a>
									</div>
								{:else}
									<a
										href="/{username}/space/{slug}/enroll"
										class="block w-full text-center bg-white text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
									>
										学習を始める
									</a>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>
		
		<!-- レッスン一覧 -->
		<section class="py-16">
			<div class="container mx-auto px-6">
				<div class="max-w-4xl mx-auto">
					<div class="flex items-center justify-between mb-8">
						<h2 class="text-2xl font-bold text-gray-900">コンテンツ</h2>
						{#if !hasAccess && lessons.length === 0}
							<span class="text-sm text-gray-500">
								プレビュー可能なレッスンがありません
							</span>
						{/if}
					</div>
					
					{#if lessons.length === 0}
						<div class="text-center py-12">
							<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
							</svg>
							<h3 class="text-lg font-medium text-gray-900 mb-2">
								{hasAccess ? 'レッスンがありません' : 'プレビューがありません'}
							</h3>
							<p class="text-gray-600">
								{hasAccess 
									? 'このコースにはまだレッスンが追加されていません' 
									: 'このコースのプレビューは利用できません。購入後に全てのレッスンにアクセスできます。'}
							</p>
						</div>
					{:else}
						<div class="bg-white rounded-lg shadow overflow-hidden">
							<div class="divide-y divide-gray-200">
								{#each lessons as lesson, index}
									{@const progress = getLessonProgress(lesson)}
									{@const isCompleted = isLessonCompleted(lesson)}
									{@const canAccess = hasAccess || lesson.is_preview}
									
									<div class="p-6 hover:bg-gray-50 transition-colors">
										<div class="flex items-start space-x-4">
											<!-- レッスン番号 / ステータス -->
											<div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center {isCompleted ? 'bg-green-100' : 'bg-gray-100'}">
												{#if isCompleted}
													<svg class="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
													</svg>
												{:else if progress > 0}
													<div class="w-3 h-3 bg-blue-600 rounded-full"></div>
												{:else}
													<span class="text-sm text-gray-600 font-medium">{index + 1}</span>
												{/if}
											</div>
											
											<!-- レッスン情報 -->
											<div class="flex-1">
												<div class="flex items-start justify-between">
													<div class="flex-1">
														<h3 class="text-lg font-medium text-gray-900 mb-1">
															{lesson.title}
														</h3>
														{#if lesson.description}
															<p class="text-gray-600 mb-2">{lesson.description}</p>
														{/if}
														
														<div class="flex items-center space-x-4 text-sm text-gray-500">
															<span class="flex items-center">
																<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
																</svg>
																{formatDuration(lesson.duration)}
															</span>
															{#if progress > 0}
																<span class="text-blue-600">{progress}% 完了</span>
															{/if}
														</div>
													</div>
													
													<!-- アクションボタン -->
													<div class="ml-4">
														{#if canAccess}
															<a
																href="/{username}/space/{slug}/course/{courseId}/lesson/{lesson.id}"
																class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
															>
																{progress > 0 ? '続ける' : '開始'}
																<svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-5-9v2m0 0V3"/>
																</svg>
															</a>
														{:else}
															<div class="flex items-center text-sm text-gray-500">
																<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
																</svg>
																購入が必要
															</div>
														{/if}
													</div>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</section>
		
		<!-- カスタムセクション表示 -->
		{#each coursePageContent.sections as section}
			{#if section.type === 'features'}
				<section class="py-16 bg-gray-50">
					<div class="container mx-auto px-6">
						<div class="max-w-6xl mx-auto">
							<h2 class="text-3xl font-bold text-gray-900 text-center mb-12">{section.content.title}</h2>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
								{#each section.content.features as feature}
									<div class="text-center p-6 bg-white rounded-lg shadow-md">
										<div class="mx-auto h-12 w-12 text-blue-600 mb-4">
											{#if feature.icon === 'academic-cap'}
												<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-12 w-12">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"/>
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
												</svg>
											{:else if feature.icon === 'user-group'}
												<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-12 w-12">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
												</svg>
											{:else if feature.icon === 'shield-check'}
												<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-12 w-12">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
												</svg>
											{:else}
												<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-12 w-12">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
												</svg>
											{/if}
										</div>
										<h3 class="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
										<p class="text-gray-600">{feature.description}</p>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</section>
			{/if}
		{/each}
		
		<!-- フッター CTA -->
		<section 
			class="py-16 text-white"
			style="background: linear-gradient(135deg, {theme.accentColor}, color-mix(in srgb, {theme.accentColor} 80%, transparent))"
		>
			<div class="container mx-auto px-6 text-center">
				<h2 class="text-3xl font-bold mb-4">今すぐ学習を始めましょう</h2>
				<p class="text-xl mb-8 text-white/90">質の高いコンテンツで、あなたのスキルアップをサポートします</p>
				
				{#if !hasAccess}
					{#if course.is_free}
						<a
							href="/{username}/space/{slug}/enroll"
							class="inline-flex items-center bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:scale-105 transition-transform duration-200"
						>
							無料で始める
							<svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
							</svg>
						</a>
					{:else}
						<a
							href="/{username}/space/{slug}/course/{courseId}/purchase"
							class="inline-flex items-center bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:scale-105 transition-transform duration-200"
						>
							今すぐ購入
							<svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
							</svg>
						</a>
					{/if}
				{/if}
			</div>
		</section>
	</div>
{/if}