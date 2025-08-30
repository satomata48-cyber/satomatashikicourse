<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	
	let space: any = null
	let student: any = null
	let courses: any[] = []
	let loading = true
	let error = ''
	
	onMount(async () => {
		await loadCoursesData()
	})
	
	async function loadCoursesData() {
		try {
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
			
			// 生徒がこのスペースに登録されているか確認
			const { data: studentData, error: studentError } = await supabase
				.from('space_students')
				.select('*')
				.eq('student_id', data.user.id)
				.eq('space_id', space.id)
				.single()
			
			if (studentError || !studentData) {
				throw new Error('このスペースに登録されていません')
			}
			
			student = studentData
			
			// このスペースのコースを取得（進捗情報も含む）
			console.log('About to query courses for space:', space.id)
			
			// まず、すべてのコースをデバッグ用に取得
			const { data: allCoursesData } = await supabase
				.from('courses')
				.select('id, title, is_published, space_id, slug')
				.eq('space_id', space.id)
			
			console.log('All courses in this space:', allCoursesData)
			
			console.log('Testing with different query approach...')
			
			const { data: coursesData, error: coursesError } = await supabase
				.from('courses')
				.select('*')
				.eq('space_id', space.id)
				.eq('is_published', true)
				.order('created_at', { ascending: false })
			
			if (coursesError) {
				console.error('Courses error:', coursesError)
				throw coursesError
			}
			
			console.log('Raw courses data:', coursesData)
			console.log('Space ID being used:', space.id)
			console.log('Space slug:', slug)
			
			courses = coursesData || []
			
			console.log('Filtered courses data:', courses)
			
		} catch (err: any) {
			error = err.message || 'データの読み込みに失敗しました'
			console.error('Load courses data error:', err)
		} finally {
			loading = false
		}
	}
	
	
	// コース学習ページへ移動
	function navigateToCourse(course: any) {
		// URLのusernameを正しく設定
		const instructorUsername = space?.instructor?.username || username
		goto(`/${instructorUsername}/space/${slug}/student/course/${course.id}`)
	}
</script>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

<svelte:head>
	<title>コース一覧 - {space?.title || 'スペース'}</title>
</svelte:head>

<div>
	<div class="mb-8">
		<h2 class="text-2xl font-bold text-gray-900 mb-2">コース一覧</h2>
		<p class="text-gray-600">このスペースで学習できるコースを表示しています</p>
	</div>
	
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if courses.length === 0}
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
			</svg>
			<h3 class="text-lg font-medium text-gray-900 mb-2">コースがありません</h3>
			<p class="text-gray-600">
				現在、このスペースには公開されているコースがありません。
			</p>
		</div>
	{:else}
		<!-- コースカードのグリッド（3カラム） -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each courses as course}
				<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
					<!-- コース画像 -->
					{#if course.thumbnail_url}
						<img 
							src={course.thumbnail_url} 
							alt={course.title}
							class="w-full h-48 object-cover"
						/>
					{:else}
						<div class="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
							<svg class="h-16 w-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
							</svg>
						</div>
					{/if}
					
					<!-- コース内容 -->
					<div class="p-6">
						<!-- ステータスバッジ -->
						<div class="flex items-center justify-between mb-3">
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
								公開中
							</span>
							{#if course.price && !course.is_free}
								<span class="text-sm font-medium text-gray-900">
									{new Intl.NumberFormat('ja-JP', {
										style: 'currency',
										currency: course.currency || 'JPY'
									}).format(course.price)}
								</span>
							{:else}
								<span class="text-sm font-medium text-green-600">
									無料
								</span>
							{/if}
						</div>
						
						<!-- タイトル -->
						<h3 class="text-lg font-semibold text-gray-900 mb-2">
							{course.title}
						</h3>
						
						<!-- 説明 -->
						{#if course.description}
							<p class="text-sm text-gray-600 mb-4 line-clamp-3">
								{course.description}
							</p>
						{/if}
						
						<!-- アクションボタン -->
						<button
							on:click={() => navigateToCourse(course)}
							class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
						>
							コースを受講する
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>