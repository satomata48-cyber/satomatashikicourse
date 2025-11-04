<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	
	let space: any = null
	let student: any = null
	let courses: any[] = []
	let recentProgress: any[] = []
	let stats = {
		totalCourses: 0,
		completedCourses: 0,
		totalLessons: 0,
		completedLessons: 0,
		totalWatchTime: 0
	}
	let loading = true
	let error = ''
	
	onMount(async () => {
		await loadDashboardData()
	})
	
	async function loadDashboardData() {
		try {
			// 現在のユーザーを取得
			const { data: { user } } = await supabase.auth.getUser()

			if (!user) {
				throw new Error('ログインが必要です')
			}

			// まずスペース情報をslugから取得
			const { data: spaceData, error: spaceError } = await supabase
				.from('spaces')
				.select(`
					*,
					instructor:profiles!instructor_id(username, display_name)
				`)
				.eq('slug', slug)
				.single()

			if (spaceError || !spaceData) {
				throw new Error('スペースが見つかりません')
			}

			space = spaceData

			// 講師かどうかを確認
			const isInstructor = space.instructor_id === user.id

			// 講師の場合はプレビューモードとして表示
			if (isInstructor) {
				// 講師用のプレビューモード
				student = {
					id: user.id,
					space_id: space.id,
					status: 'active',
					enrolled_at: new Date().toISOString(),
					isPreview: true
				}
			} else {
				// 生徒がこのスペースに登録されているか確認
				const { data: studentData, error: studentError } = await supabase
					.from('space_students')
					.select('*')
					.eq('student_id', user.id)
					.eq('space_id', space.id)
					.single()

				if (studentError || !studentData) {
					throw new Error('このスペースに登録されていません')
				}

				student = studentData
			}
			
			// コース一覧と進捗を取得
			const { data: coursesData, error: coursesError } = await supabase
				.from('courses')
				.select(`
					*,
					lessons:lessons(
						*,
						progress:lesson_progress(
							watch_time,
							total_duration,
							completed,
							last_watched_at
						)
					),
					purchases:course_purchases(
						status,
						purchased_at
					)
				`)
				.eq('space_id', space.id)
				.eq('is_published', true)
				.order('created_at', { ascending: false })
			
			if (coursesError) throw coursesError
			courses = coursesData || []
			
			// アクセス可能なコースのみフィルタリング
			courses = courses.filter(course => {
				if (course.is_free) return true
				return course.purchases && course.purchases.some(p => p.status === 'completed')
			})
			
			// 統計情報を計算
			calculateStats()
			
			// 最近の学習進捗を取得
			await loadRecentProgress()
			
		} catch (err: any) {
			error = err.message
			console.error('Load dashboard data error:', err)
		} finally {
			loading = false
		}
	}
	
	function calculateStats() {
		stats.totalCourses = courses.length
		stats.totalLessons = courses.reduce((total, course) => total + (course.lessons?.length || 0), 0)
		
		let completedLessonsCount = 0
		let totalWatchTimeSeconds = 0
		let completedCoursesCount = 0
		
		courses.forEach(course => {
			if (!course.lessons) return
			
			const completedInCourse = course.lessons.filter(lesson => 
				lesson.progress && lesson.progress.some(p => p.completed)
			).length
			
			completedLessonsCount += completedInCourse
			
			course.lessons.forEach(lesson => {
				if (lesson.progress) {
					lesson.progress.forEach(p => {
						totalWatchTimeSeconds += p.watch_time || 0
					})
				}
			})
			
			// コース完了判定（80%以上のレッスンが完了）
			const courseCompletionRate = course.lessons.length > 0 ? completedInCourse / course.lessons.length : 0
			if (courseCompletionRate >= 0.8) {
				completedCoursesCount++
			}
		})
		
		stats.completedLessons = completedLessonsCount
		stats.completedCourses = completedCoursesCount
		stats.totalWatchTime = Math.floor(totalWatchTimeSeconds / 60) // 分に変換
	}
	
	async function loadRecentProgress() {
		try {
			const { data: progressData, error: progressError } = await supabase
				.from('lesson_progress')
				.select(`
					*,
					lesson:lessons(
						title,
						course:courses(title)
					)
				`)
				.eq('student_id', student.id)
				.order('last_watched_at', { ascending: false })
				.limit(5)
			
			if (progressError) throw progressError
			recentProgress = progressData || []
		} catch (err: any) {
			console.error('Load recent progress error:', err)
		}
	}
	
	function formatDate(dateString: string): string {
		const date = new Date(dateString)
		const now = new Date()
		const diffTime = Math.abs(now.getTime() - date.getTime())
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
		
		if (diffDays === 1) return '今日'
		if (diffDays === 2) return '昨日'
		if (diffDays <= 7) return `${diffDays - 1}日前`
		
		return date.toLocaleDateString('ja-JP')
	}
	
	function formatWatchTime(minutes: number): string {
		if (minutes < 60) return `${minutes}分`
		const hours = Math.floor(minutes / 60)
		const remainingMinutes = minutes % 60
		return `${hours}時間${remainingMinutes > 0 ? remainingMinutes + '分' : ''}`
	}
	
	function getProgressPercentage(course: any): number {
		if (!course.lessons || course.lessons.length === 0) return 0
		const completedLessons = course.lessons.filter(lesson => 
			lesson.progress && lesson.progress.some(p => p.completed)
		).length
		return Math.round((completedLessons / course.lessons.length) * 100)
	}
</script>

<div>
	<div class="mb-8">
		<h2 class="text-2xl font-bold text-gray-900 mb-2">ダッシュボード</h2>
		<p class="text-gray-600">学習の進捗を確認しましょう</p>
	</div>
	
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else}
		<!-- 統計カード -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">総コース数</p>
						<p class="text-2xl font-semibold text-gray-900">{stats.totalCourses}</p>
					</div>
					<div class="p-3 bg-blue-100 rounded-full">
						<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">完了コース</p>
						<p class="text-2xl font-semibold text-gray-900">{stats.completedCourses}</p>
					</div>
					<div class="p-3 bg-green-100 rounded-full">
						<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">完了レッスン</p>
						<p class="text-2xl font-semibold text-gray-900">{stats.completedLessons} / {stats.totalLessons}</p>
					</div>
					<div class="p-3 bg-purple-100 rounded-full">
						<svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">総視聴時間</p>
						<p class="text-2xl font-semibold text-gray-900">{formatWatchTime(stats.totalWatchTime)}</p>
					</div>
					<div class="p-3 bg-yellow-100 rounded-full">
						<svg class="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
					</div>
				</div>
			</div>
		</div>
		
		<!-- 進行中のコース -->
		{#if courses.length > 0}
			<div class="bg-white rounded-lg shadow p-6 mb-8">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">学習中のコース</h3>
				<div class="space-y-4">
					{#each courses.slice(0, 3) as course}
						{@const progressPercentage = getProgressPercentage(course)}
						<div class="border border-gray-200 rounded-lg p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1">
									<h4 class="font-medium text-gray-900">{course.title}</h4>
									<p class="text-sm text-gray-600 mt-1">{course.description || ''}</p>
								</div>
								<div class="ml-4 text-right">
									<div class="text-sm font-medium text-gray-900">{progressPercentage}%</div>
									<div class="text-xs text-gray-500">完了</div>
								</div>
							</div>
							
							<div class="mb-3">
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div 
										class="bg-blue-600 h-2 rounded-full transition-all duration-300"
										style="width: {progressPercentage}%"
									></div>
								</div>
							</div>
							
							<div class="flex items-center justify-between">
								<div class="text-sm text-gray-500">
									{course.lessons?.length || 0} レッスン
								</div>
								<a
									href="/{username}/space/{slug}/course/{course.id}"
									class="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
								>
									続ける
								</a>
							</div>
						</div>
					{/each}
				</div>
				
				<div class="mt-6 text-center">
					<a
						href="/{username}/space/{slug}/student/courses"
						class="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
					>
						すべてのコースを見る
						<svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
						</svg>
					</a>
				</div>
			</div>
		{/if}
		
		<!-- 最近の学習活動 -->
		{#if recentProgress.length > 0}
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">最近の学習活動</h3>
				<div class="space-y-3">
					{#each recentProgress as progress}
						<div class="flex items-center justify-between py-2">
							<div class="flex items-center space-x-3">
								<div class="flex-shrink-0">
									{#if progress.completed}
										<div class="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
											<svg class="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
											</svg>
										</div>
									{:else}
										<div class="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
											<svg class="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-5-9v2m0 0V3"/>
											</svg>
										</div>
									{/if}
								</div>
								<div>
									<p class="text-sm font-medium text-gray-900">
										{progress.lesson?.title}
									</p>
									<p class="text-xs text-gray-500">
										{progress.lesson?.course?.title}
									</p>
								</div>
							</div>
							<div class="text-right">
								<div class="text-sm text-gray-900">
									{Math.round((progress.watch_time / progress.total_duration) * 100)}%
								</div>
								<div class="text-xs text-gray-500">
									{formatDate(progress.last_watched_at)}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="text-center py-12">
				<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
				</svg>
				<h3 class="text-lg font-medium text-gray-900 mb-2">学習を始めましょう</h3>
				<p class="text-gray-600 mb-4">コースを選択して最初のレッスンを開始してください</p>
				<a
					href="/{username}/space/{slug}/student/courses"
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
				>
					コース一覧を見る
				</a>
			</div>
		{/if}
	{/if}
</div>