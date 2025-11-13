<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	export let data

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
			// スペース情報を取得
			const spaceResponse = await fetch(`/api/spaces?username=${username}&slug=${slug}`)
			const spaceResult = await spaceResponse.json()

			if (!spaceResponse.ok) {
				throw new Error(spaceResult.error || 'スペースの読み込みに失敗しました')
			}

			space = spaceResult.space

			// このスペースのコース一覧を取得
			const coursesResponse = await fetch(`/api/courses?username=${username}`)
			const coursesResult = await coursesResponse.json()

			if (coursesResponse.ok && coursesResult.courses) {
				// このスペースの公開済みコースのみフィルター
				courses = coursesResult.courses.filter((course: any) =>
					course.space_id === space.id && course.is_published
				)

				// 各コースのレッスン情報を取得
				for (const course of courses) {
					const lessonsResponse = await fetch(`/api/lessons?courseId=${course.id}`)
					const lessonsResult = await lessonsResponse.json()

					if (lessonsResponse.ok && lessonsResult.lessons) {
						course.lessons = lessonsResult.lessons.filter((l: any) => l.is_published)
					} else {
						course.lessons = []
					}
				}

				// 統計を計算
				calculateStats()
			}

			// 生徒の登録情報を取得
			if (data.user) {
				const studentResponse = await fetch(`/api/students?spaceId=${space.id}`)
				const studentResult = await studentResponse.json()

				if (studentResponse.ok) {
					student = studentResult.students?.find((s: any) => s.student_id === data.user.id)
				}
			}

			// 最近の進捗を読み込み
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
			// TODO: D1実装が必要 - 最近の学習進捗の取得
			recentProgress = []
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
			<p>{error}</p>
			<a href="/{username}/space/{slug}" class="text-sm underline mt-2 inline-block">
				スペースページに戻る
			</a>
		</div>
	{:else}
		<!-- 統計カード -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<!-- 総コース数 -->
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">総コース数</p>
						<p class="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
					</div>
				</div>
			</div>

			<!-- 完了コース数 -->
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">完了コース</p>
						<p class="text-2xl font-bold text-gray-900">{stats.completedCourses}</p>
					</div>
				</div>
			</div>

			<!-- 総レッスン数 -->
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">総レッスン数</p>
						<p class="text-2xl font-bold text-gray-900">{stats.totalLessons}</p>
					</div>
				</div>
			</div>

			<!-- 完了レッスン数 -->
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">完了レッスン</p>
						<p class="text-2xl font-bold text-gray-900">{stats.completedLessons}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- コース一覧 -->
		{#if courses.length > 0}
			<div class="bg-white rounded-lg shadow">
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-medium text-gray-900">コース一覧</h3>
				</div>
				<div class="divide-y divide-gray-200">
					{#each courses as course}
						<a
							href="/{username}/space/{slug}/student/course/{course.id}"
							class="block px-6 py-4 hover:bg-gray-50 transition-colors"
						>
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<h4 class="text-base font-medium text-gray-900">{course.title}</h4>
									{#if course.description}
										<p class="mt-1 text-sm text-gray-600">{course.description}</p>
									{/if}
									<div class="mt-2 flex items-center text-sm text-gray-500">
										<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
										</svg>
										{course.lessons?.length || 0}レッスン
									</div>
								</div>
								<div class="ml-4">
									<div class="text-right">
										<div class="text-2xl font-bold text-blue-600">{getProgressPercentage(course)}%</div>
										<div class="text-xs text-gray-500">完了</div>
									</div>
								</div>
							</div>
							<!-- プログレスバー -->
							<div class="mt-3 w-full bg-gray-200 rounded-full h-2">
								<div
									class="bg-blue-600 h-2 rounded-full transition-all"
									style="width: {getProgressPercentage(course)}%"
								></div>
							</div>
						</a>
					{/each}
				</div>
				<div class="px-6 py-4 bg-gray-50">
					<a
						href="/{username}/space/{slug}/student/courses"
						class="text-sm font-medium text-blue-600 hover:text-blue-800"
					>
						すべてのコースを見る →
					</a>
				</div>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow p-12 text-center">
				<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
				</svg>
				<h3 class="text-lg font-medium text-gray-900 mb-2">まだコースがありません</h3>
				<p class="text-gray-600 mb-4">講師がコースを公開するまでお待ちください</p>
			</div>
		{/if}
	{/if}
</div>
