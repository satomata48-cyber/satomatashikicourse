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
			// TODO: D1実装が必要 - ダッシュボードデータの取得
			throw new Error('この機能は現在実装中です')
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
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
			</svg>
			<h3 class="text-lg font-medium text-gray-900 mb-2">学習を始めましょう</h3>
			<p class="text-gray-600 mb-4">この機能は現在実装中です</p>
			<a
				href="/{username}/space/{slug}/student/courses"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
			>
				コース一覧を見る
			</a>
		</div>
	{/if}
</div>
