<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	const supabase = createSupabaseBrowserClient()
	
	let loading = true
	let error = ''
	let course: any = null
	let sessionId = ''
	let courseId = ''
	
	$: sessionId = $page.url.searchParams.get('session_id') || ''
	$: courseId = $page.url.searchParams.get('course_id') || ''
	
	onMount(async () => {
		if (!sessionId || !courseId) {
			error = '無効なアクセスです'
			loading = false
			return
		}
		
		await loadPurchaseInfo()
	})
	
	async function loadPurchaseInfo() {
		try {
			// コース情報を取得
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select(`
					*,
					space:spaces!inner(
						title,
						slug,
						instructor_id,
						profiles:profiles!inner(username)
					)
				`)
				.eq('id', courseId)
				.single()
			
			if (courseError) throw courseError
			
			course = courseData
			
		} catch (err: any) {
			error = err.message
			console.error('Load purchase info error:', err)
		} finally {
			loading = false
		}
	}
	
	function goToCourse() {
		if (course) {
			const username = course.space.profiles.username
			const spaceSlug = course.space.slug
			goto(`/${username}/space/${spaceSlug}/student/course/${courseId}`)
		}
	}
	
	function goToSpace() {
		if (course) {
			const username = course.space.profiles.username
			const spaceSlug = course.space.slug
			goto(`/${username}/space/${spaceSlug}/student`)
		}
	}
</script>

<svelte:head>
	<title>購入完了 - {course?.title}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
	<div class="max-w-md w-full">
		{#if loading}
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
				<p class="mt-4 text-gray-600">購入情報を確認中...</p>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
				<svg class="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				<h3 class="text-lg font-medium text-red-800 mb-2">エラーが発生しました</h3>
				<p class="text-red-600">{error}</p>
			</div>
		{:else if course}
			<div class="bg-white rounded-lg shadow-lg overflow-hidden">
				<!-- Success Header -->
				<div class="bg-green-50 px-6 py-8 text-center">
					<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
						<svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
						</svg>
					</div>
					<h1 class="text-2xl font-bold text-gray-900 mb-2">購入が完了しました！</h1>
					<p class="text-gray-600">コースにアクセスできるようになりました</p>
				</div>
				
				<!-- Course Info -->
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="font-medium text-gray-900 mb-1">{course.title}</h2>
					<p class="text-sm text-gray-500">スペース: {course.space.title}</p>
				</div>
				
				<!-- Actions -->
				<div class="px-6 py-6 space-y-3">
					<button
						on:click={goToCourse}
						class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
					>
						コースを開始する
					</button>
					
					<button
						on:click={goToSpace}
						class="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
					>
						スペースダッシュボードへ
					</button>
				</div>
				
				<!-- Next Steps -->
				<div class="px-6 py-4 bg-gray-50">
					<h3 class="text-sm font-medium text-gray-900 mb-2">次のステップ:</h3>
					<ul class="text-sm text-gray-600 space-y-1">
						<li>• 購入したコースはいつでも受講できます</li>
						<li>• 進捗は自動的に保存されます</li>
						<li>• 質問があれば講師に連絡できます</li>
					</ul>
				</div>
			</div>
			
			<!-- Receipt Info -->
			<div class="mt-6 text-center text-sm text-gray-500">
				<p>領収書はメールで送信されます</p>
				<p class="mt-1">セッションID: {sessionId.slice(-8)}</p>
			</div>
		{/if}
	</div>
</div>