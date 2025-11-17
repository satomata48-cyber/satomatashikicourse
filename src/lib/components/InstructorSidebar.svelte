<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	export let username: string
	export let userEmail: string = ''

	$: currentPath = $page.url.pathname

	// ナビゲーションメニュー
	const navItems = [
		{
			name: 'ダッシュボード',
			href: `/dashboard`,
			icon: 'dashboard'
		},
		{
			name: 'スペース管理',
			href: `/spaces`,
			icon: 'spaces'
		},
		{
			name: 'コース管理',
			href: `/courses`,
			icon: 'courses'
		},
		{
			name: '決済設定',
			href: `/payment-settings`,
			icon: 'payment'
		},
		{
			name: '生徒ページ管理',
			href: `/student-pages`,
			icon: 'student-pages'
		}
	]

	// リアクティブにアクティブ状態を判定
	function isActive(href: string, path: string): boolean {
		const fullHref = `/${username}${href}`

		// 完全一致
		if (path === fullHref) {
			return true
		}

		// サブパスを含む場合
		if (path.startsWith(fullHref + '/')) {
			return true
		}

		return false
	}

	function handleLogout() {
		goto('/logout')
	}
</script>

<aside class="w-64 bg-white shadow-lg fixed h-full z-10 flex flex-col">
	<!-- Header -->
	<div class="p-4 border-b border-gray-200">
		<h1 class="text-xl font-bold text-gray-900">講師ダッシュボード</h1>
		<p class="text-xs text-gray-500 mt-1">{userEmail}</p>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 mt-5 px-2 overflow-y-auto">
		{#each navItems as item}
			{@const active = isActive(item.href, currentPath)}
			<a
				href="/{username}{item.href}"
				class="group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors"
				class:bg-blue-50={active}
				class:text-blue-700={active}
				class:text-gray-600={!active}
				class:hover:bg-gray-50={!active}
				class:hover:text-gray-900={!active}
			>
				<span class="mr-3">
					{#if item.icon === 'dashboard'}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
						</svg>
					{:else if item.icon === 'spaces'}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
						</svg>
					{:else if item.icon === 'courses'}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
						</svg>
					{:else if item.icon === 'student-pages'}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
						</svg>
					{:else if item.icon === 'payment'}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
						</svg>
					{:else if item.icon === 'profiles'}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
						</svg>
					{/if}
				</span>
				{item.name}
			</a>
		{/each}
	</nav>

	<!-- Logout Button -->
	<div class="p-4 border-t border-gray-200">
		<button
			on:click={handleLogout}
			class="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
		>
			<svg class="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
			</svg>
			ログアウト
		</button>
	</div>
</aside>
