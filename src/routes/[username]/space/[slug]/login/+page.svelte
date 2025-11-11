<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'

	// TODO: D1実装が必要

	$: username = $page.params.username
	$: slug = $page.params.slug

	let email = ''
	let password = ''
	let loading = false
	let error = ''
	let space: any = null
	let spaceLoading = true

	// リアクティブにパラメータが設定されたらデータを読み込み
	$: if (username && slug && username !== 'undefined' && slug !== 'undefined') {
		console.log('Loading space info for:', { username, slug })
		loadSpaceInfo()
	} else {
		console.log('Waiting for params:', { username, slug })
	}

	// スペース情報を取得
	async function loadSpaceInfo() {
		try {
			// TODO: D1実装が必要 - スペース情報の取得
			error = 'この機能は現在実装中です'
		} catch (err: any) {
			console.error('Space load error:', err)
			error = err.message
		} finally {
			spaceLoading = false
		}
	}

	async function handleLogin() {
		if (!email || !password) {
			error = 'メールアドレスとパスワードを入力してください。'
			return
		}

		loading = true
		error = 'ログイン機能は現在実装中です。D1データベースへの移行が必要です。'
		loading = false
	}

	function navigateToEnroll() {
		goto(`/${username}/space/${slug}/enroll`)
	}

	function navigateToSpace() {
		goto(`/${username}/space/${slug}`)
	}
</script>

<svelte:head>
	<title>ログイン - {space?.title || 'スペース'}</title>
	<meta name="description" content="{space?.title || 'スペース'}にログインして学習を続けましょう。" />
</svelte:head>

{#if spaceLoading}
	<div class="min-h-screen flex justify-center items-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else if !space}
	<div class="min-h-screen flex justify-center items-center">
		<div class="max-w-md text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.598 0L4.216 15.5C3.445 16.333 4.406 18 5.946 18z"/>
			</svg>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">スペースが見つかりません</h1>
			<p class="text-gray-600">{error}</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-6">
		<div class="max-w-md w-full">
			<!-- Back to Space -->
			<button
				on:click={navigateToSpace}
				class="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
				</svg>
				スペースに戻る
			</button>

			<!-- Space Logo and Title -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">ログイン</h1>
				<p class="text-gray-600">この機能は現在実装中です</p>
			</div>

			<!-- Login Form -->
			<div class="bg-white p-8 rounded-2xl shadow-xl">
				{#if error}
					<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
						<div class="flex">
							<svg class="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
							<p class="text-sm text-red-800">{error}</p>
						</div>
					</div>
				{/if}

				<p class="text-center text-gray-600">
					ログイン機能はD1データベース実装後に利用可能になります。
				</p>
			</div>

			<!-- Enrollment Link -->
			<p class="mt-8 text-center text-sm text-gray-600">
				まだこのスペースに参加していませんか？
				<button
					on:click={navigateToEnroll}
					class="font-medium text-blue-600 hover:text-blue-500 transition-colors"
				>
					生徒登録
				</button>
			</p>
		</div>
	</div>
{/if}
