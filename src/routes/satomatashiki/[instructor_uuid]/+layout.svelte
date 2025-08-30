<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	
	export let data
	
	$: uuid = $page.params.instructor_uuid
	$: currentPath = $page.url.pathname
	
	const menuItems = [
		{ label: 'ダッシュボード', href: `/satomatashiki/${uuid}/dashboard`, icon: 'dashboard' },
		{ label: 'スペース管理', href: `/satomatashiki/${uuid}/dashboard/spaceview`, icon: 'space' },
		{ label: 'コース管理', href: `/satomatashiki/${uuid}/dashboard/course/courseview`, icon: 'course' }
	]
	
	function isActive(href: string): boolean {
		return currentPath.startsWith(href)
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-gray-200">
		<div class="px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<div class="flex items-center">
					<h1 class="text-xl font-semibold text-gray-900">講師ダッシュボード</h1>
				</div>
				<div class="flex items-center space-x-4">
					<span class="text-sm text-gray-600">{data.user?.email}</span>
					<button
						on:click={() => goto('/logout')}
						class="text-sm text-gray-500 hover:text-gray-700"
					>
						ログアウト
					</button>
				</div>
			</div>
		</div>
	</header>
	
	<div class="flex">
		<!-- Sidebar -->
		<aside class="w-64 bg-white shadow-md">
			<nav class="mt-5 px-2">
				{#each menuItems as item}
					<a
						href={item.href}
						class="group flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1
						       {isActive(item.href) 
						         ? 'bg-blue-50 text-blue-700' 
						         : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
					>
						<span class="mr-3">
							{#if item.icon === 'dashboard'}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
								</svg>
							{:else if item.icon === 'space'}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
								</svg>
							{:else if item.icon === 'course'}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
								</svg>
							{:else if item.icon === 'students'}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
								</svg>
							{:else}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
								</svg>
							{/if}
						</span>
						{item.label}
					</a>
				{/each}
			</nav>
		</aside>
		
		<!-- Main Content -->
		<main class="flex-1 p-8">
			<slot />
		</main>
	</div>
</div>