<script>
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'

	export let data

	// TODO: D1実装が必要

	$: username = $page.params.username
	$: courseId = $page.params.id
	$: lessonId = $page.params.lessonId

	let instructorId = null
	let course = null
	let lesson = null
	let lessons = []
	let loading = true
	let error = 'この機能は現在実装中です。D1データベースへの移行が必要です。'
	let updateLoading = false
	let updateError = ''

	// 新規レッスン作成関連
	let isCreateMode = false
	let createLoading = false
	let createError = ''
	let newLesson = {
		title: '',
		description: '',
		videoType: 'youtube',
		videoUrl: '',
		duration: 0,
		isPublished: false
	}

	// フォームデータ
	let formData = {
		title: '',
		description: '',
		videoType: 'youtube',
		videoUrl: '',
		duration: 0,
		isPublished: false
	}

	onMount(async () => {
		// TODO: D1実装が必要 - レッスンデータの読み込み
		loading = false
	})

	async function loadInstructorData() {
		// TODO: D1実装が必要 - 講師データの読み込み
	}

	async function loadData() {
		// TODO: D1実装が必要 - データの読み込み
	}

	function startCreateMode() {
		isCreateMode = true
		createError = ''
		newLesson = {
			title: '',
			description: '',
			videoType: 'youtube',
			videoUrl: '',
			duration: 0,
			isPublished: false
		}
	}

	function cancelCreateMode() {
		isCreateMode = false
		createError = ''
	}

	function getYouTubeId(url) {
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
		return match ? match[1] : ''
	}

	function formatDuration(seconds) {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	async function updateLesson() {
		// TODO: D1実装が必要 - レッスン更新機能
		updateError = 'レッスン更新機能は現在実装中です'
	}

	async function createLesson() {
		// TODO: D1実装が必要 - レッスン作成機能
		createError = 'レッスン作成機能は現在実装中です'
	}
</script>

<div>
	{#if loading}
		<div class="flex justify-center items-center h-64">
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
					href="/{username}/courses"
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
				>
					コース一覧に戻る
				</a>
			</div>
		</div>
	{/if}
</div>
