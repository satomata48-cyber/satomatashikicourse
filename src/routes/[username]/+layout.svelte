<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import InstructorSidebar from '$lib/components/InstructorSidebar.svelte'

	export let data

	// TODO: D1実装が必要

	let username: string
	let currentPath: string

	$: {
		username = $page.params.username
		currentPath = $page.url.pathname
	}

	// 公開ページかどうかの判定
	$: isPublicPage = currentPath?.includes('/space/') || false

	// ページタイトルの取得
	function getPageTitle(): string {
		if (currentPath?.includes('/dashboard')) return 'ダッシュボード'
		if (currentPath?.includes('/spaces')) return 'スペース管理'
		if (currentPath?.includes('/courses')) return 'コース管理'
		if (currentPath?.includes('/payment-settings')) return '決済設定'
		if (currentPath?.includes('/student-pages')) return '生徒ページ管理'
		if (currentPath?.includes('/instructor-profiles')) return '講師プロフィール管理'
		if (currentPath?.includes('/profile')) return '講師プロフィール'
		return '詳細'
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
		<!-- Sidebar -->
		{#if username}
			<InstructorSidebar username={username} userEmail={data?.user?.email || ''} />
		{/if}

		<!-- Main Content Area -->
		<div class="flex-1" class:ml-64={username}>
			<!-- Header -->
			<header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-5">
				<div class="px-4 sm:px-6 lg:px-8">
					<div class="flex justify-between items-center h-16">
						<h2 class="text-lg font-semibold text-gray-900">
							{getPageTitle()}
						</h2>
						<div class="text-sm text-gray-500">
							{new Date().toLocaleDateString('ja-JP', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								weekday: 'long'
							})}
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
