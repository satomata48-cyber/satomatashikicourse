<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	
	let stats = {
		totalSpaces: 0,
		totalCourses: 0,
		totalStudents: 0,
		totalRevenue: 0
	}
	
	let recentActivities: any[] = []
	let loading = true

	// usernameが設定されたらデータをロード
	$: if (username) {
		loadDashboardData()
	}

	async function loadDashboardData() {
		try {
			// usernameが設定されるまで待つ
			if (!username) {
				console.error('Username is not set')
				loading = false
				return
			}

			// まずusernameから講師IDを取得
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('id')
				.eq('username', username)
				.single()
			
			if (profileError || !profileData) {
				console.error('Profile not found:', profileError)
				loading = false
				return
			}
			
			const instructorId = profileData.id
			
			// スペース数を取得
			const { count: spacesCount } = await supabase
				.from('spaces')
				.select('*', { count: 'exact', head: true })
				.eq('instructor_id', instructorId)
			
			// コース数を取得
			const { data: spaces } = await supabase
				.from('spaces')
				.select('id')
				.eq('instructor_id', instructorId)
			
			if (spaces && spaces.length > 0) {
				const spaceIds = spaces.map(s => s.id)
				const { count: coursesCount } = await supabase
					.from('courses')
					.select('*', { count: 'exact', head: true })
					.in('space_id', spaceIds)
				
				stats.totalCourses = coursesCount || 0
			}
			
			stats.totalSpaces = spacesCount || 0
			
		} catch (error) {
			console.error('Dashboard data loading error:', error)
		} finally {
			loading = false
		}
	}
	
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(amount)
	}
</script>

<div>
	<h2 class="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h2>
	
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else}
		<!-- Stats Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">スペース数</p>
						<p class="text-2xl font-semibold text-gray-900">{stats.totalSpaces}</p>
					</div>
					<div class="p-3 bg-blue-100 rounded-full">
						<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">コース数</p>
						<p class="text-2xl font-semibold text-gray-900">{stats.totalCourses}</p>
					</div>
					<div class="p-3 bg-green-100 rounded-full">
						<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">生徒数</p>
						<p class="text-2xl font-semibold text-gray-900">{stats.totalStudents}</p>
					</div>
					<div class="p-3 bg-purple-100 rounded-full">
						<svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">総収益</p>
						<p class="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
					</div>
					<div class="p-3 bg-yellow-100 rounded-full">
						<svg class="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Quick Actions -->
		<div class="bg-white rounded-lg shadow p-6 mb-8">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<a
					href="/{username}/spaces/create"
					class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
				>
					<svg class="h-6 w-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
					</svg>
					<span class="text-gray-600">新規スペース作成</span>
				</a>
				
				<a
					href="/{username}/courses/create"
					class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
				>
					<svg class="h-6 w-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
					</svg>
					<span class="text-gray-600">新規コース作成</span>
				</a>
				
				<a
					href="/{username}/students"
					class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
				>
					<svg class="h-6 w-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
					</svg>
					<span class="text-gray-600">生徒を招待</span>
				</a>
			</div>
		</div>
		
		<!-- Recent Activity -->
		<div class="bg-white rounded-lg shadow p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">最近のアクティビティ</h3>
			{#if recentActivities.length > 0}
				<ul class="divide-y divide-gray-200">
					{#each recentActivities as activity}
						<li class="py-3">
							<!-- Activity items will go here -->
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-500 text-center py-8">まだアクティビティはありません</p>
			{/if}
		</div>
	{/if}
</div>