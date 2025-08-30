<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: currentPath = $page.url.pathname
	
	let redirecting = false
	
	// 公開ページかどうかの判定
	$: isPublicPage = currentPath.includes('/space/')
	
	// UUIDが渡された場合のリダイレクト処理（管理画面のみ）
	$: if (username && !isPublicPage && !redirecting && typeof window !== 'undefined') {
		const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)
		if (isUUID) {
			redirecting = true
			handleUuidRedirect()
		}
	}
	
	async function handleUuidRedirect() {
		try {
			const { data: { user } } = await supabase.auth.getUser()
			if (user) {
				const { data: profileData } = await supabase
					.from('profiles')
					.select('username')
					.eq('id', user.id)
					.single()
				
				if (profileData?.username) {
					const newPath = currentPath.replace(`/${username}`, `/${profileData.username}`)
					goto(newPath)
					return
				}
			}
			goto('/login')
		} catch (err) {
			console.error('UUID redirect error:', err)
			goto('/login')
		}
	}
	
	// menuItemsをリアクティブに変更
	$: menuItems = [
		{ label: 'ダッシュボード', href: `/${username}/dashboard`, icon: 'dashboard' },
		{ label: 'スペース管理', href: `/${username}/spaces`, icon: 'space' },
		{ label: 'コース管理', href: `/${username}/courses`, icon: 'course' }
	]
	
	function isActive(href: string): boolean {
		// 正確なマッチング
		if (href.endsWith('/dashboard')) {
			return currentPath === href || currentPath.startsWith(href + '/')
		}
		if (href.endsWith('/spaces')) {
			return currentPath === href || currentPath.startsWith(href + '/') || currentPath.includes('/spaces/')
		}
		if (href.endsWith('/courses')) {
			return currentPath === href || currentPath.startsWith(href + '/') || currentPath.includes('/courses/')
		}
		return currentPath === href
	}
</script>

{#if isPublicPage}
	<!-- 公開ページ：サイドバーなしのレイアウト -->
	<div class="min-h-screen">
		<slot />
	</div>
{:else}
	<!-- 管理画面：サイドバーありのレイアウト -->
	<div class="min-h-screen bg-gray-50 flex">
		<!-- Sidebar - 固定サイドバー -->
		<aside class="w-64 bg-white shadow-lg fixed h-full z-10">
			<div class="p-4 border-b border-gray-200">
				<h1 class="text-xl font-bold text-gray-900">講師ダッシュボード</h1>
				<p class="text-xs text-gray-500 mt-1">{data.user?.email}</p>
			</div>
			<nav class="mt-5 px-2">
				{#each menuItems as item}
					<a
						href={item.href}
						class="group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1
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
							{/if}
						</span>
						{item.label}
					</a>
				{/each}
			</nav>
			<div class="absolute bottom-0 w-full p-4 border-t border-gray-200">
				<button
					on:click={() => goto('/logout')}
					class="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
				>
					<svg class="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
					</svg>
					ログアウト
				</button>
			</div>
		</aside>
		
		<!-- Main Content Area with margin for sidebar -->
		<div class="flex-1 ml-64">
			<!-- Header -->
			<header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-5">
				<div class="px-4 sm:px-6 lg:px-8">
					<div class="flex justify-between items-center h-16">
						<h2 class="text-lg font-semibold text-gray-900">
							{#if isActive(`/${username}/dashboard`)}
								ダッシュボード
							{:else if isActive(`/${username}/spaces`)}
								スペース管理
							{:else if isActive(`/${username}/courses`)}
								コース管理
							{:else}
								詳細
							{/if}
						</h2>
						<div class="text-sm text-gray-500">
							{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
						</div>
					</div>
				</div>
			</header>
			
			<!-- Main Content -->
			<main class="p-8">
				<slot />
			</main>
		</div>
	</div>
{/if}