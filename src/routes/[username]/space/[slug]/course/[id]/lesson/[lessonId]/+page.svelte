<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { page } from '$app/stores'
	import { updateProgress } from '$lib/stores/progress'

	export let data

	// TODO: D1実装が必要

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
	let error = 'この機能は現在実装中です。D1データベースへの移行が必要です。'

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
		// TODO: D1実装が必要 - レッスンデータの読み込み
		loading = false
	})

	onDestroy(() => {
		if (progressInterval) {
			clearInterval(progressInterval)
		}
	})

	async function loadLessonData() {
		// TODO: D1実装が必要 - データベースからレッスン情報を取得
		error = 'データベース機能は現在実装中です'
	}

	async function loadSavedProgress() {
		// TODO: D1実装が必要 - 保存済み進捗の読み込み
	}

	function startProgressTracking() {
		// TODO: D1実装が必要 - 進捗トラッキング
	}

	async function saveProgress() {
		// TODO: D1実装が必要 - 進捗の保存
	}

	function handleTimeUpdate() {
		if (duration > 0) {
			progress = (currentTime / duration) * 100
		}
	}

	function handleEnded() {
		// TODO: 次のレッスンへの遷移処理
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
	<title>レッスン読み込み中...</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen flex justify-center items-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else}
	<div class="min-h-screen flex justify-center items-center">
		<div class="max-w-md text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.598 0L4.216 15.5C3.445 16.333 4.406 18 5.946 18z"/>
			</svg>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">機能は実装中です</h1>
			<p class="text-gray-600 mb-4">{error}</p>
			<a
				href="/{username}/space/{slug}"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
			>
				スペースに戻る
			</a>
		</div>
	</div>
{/if}
