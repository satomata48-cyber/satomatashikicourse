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

	// Password reset
	let showResetModal = false
	let resetEmail = ''
	let resetLoading = false
	let resetError = ''
	let resetSuccess = false
	let resetLink = ''

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
			const response = await fetch(`/api/spaces?username=${username}&slug=${slug}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'スペースの読み込みに失敗しました')
			}

			space = result.space
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
		error = ''

		try {
			// ログインAPIを呼び出す（生徒用にspaceIdを含める）
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password,
					spaceId: space?.id // 生徒ログインの場合、スペースIDを渡す
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'ログインに失敗しました')
			}

			// ログイン成功 - 生徒ダッシュボードにリダイレクト
			await goto(`/${username}/space/${slug}/student`)
		} catch (err: any) {
			error = err.message || 'ログインに失敗しました'
			console.error('Login error:', err)
		} finally {
			loading = false
		}
	}

	function navigateToEnroll() {
		goto(`/${username}/space/${slug}/register`)
	}

	function navigateToSpace() {
		goto(`/${username}/space/${slug}`)
	}

	async function handlePasswordReset() {
		if (!resetEmail) {
			resetError = 'メールアドレスを入力してください'
			return
		}

		resetLoading = true
		resetError = ''
		resetSuccess = false

		try {
			const response = await fetch('/api/auth/request-password-reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: resetEmail,
					spaceId: space?.id
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'パスワードリセットに失敗しました')
			}

			// リセットリンクを表示（メール送信機能がないため）
			resetLink = `${window.location.origin}/${username}/space/${slug}/reset-password?token=${result.token}`
			resetSuccess = true
		} catch (err: any) {
			resetError = err.message || 'パスワードリセットに失敗しました'
			console.error('Password reset error:', err)
		} finally {
			resetLoading = false
		}
	}

	function copyResetLink() {
		navigator.clipboard.writeText(resetLink)
		alert('リセットリンクをコピーしました！')
	}

	function closeResetModal() {
		showResetModal = false
		resetEmail = ''
		resetError = ''
		resetSuccess = false
		resetLink = ''
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
				<p class="text-gray-600">{space.title}で学習を続けましょう</p>
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

				<form on:submit|preventDefault={handleLogin} class="space-y-6">
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
							メールアドレス
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							placeholder="example@email.com"
						/>
					</div>

					<div>
						<div class="flex justify-between items-center mb-2">
							<label for="password" class="block text-sm font-medium text-gray-700">
								パスワード
							</label>
							<button
								type="button"
								on:click={() => showResetModal = true}
								class="text-sm text-blue-600 hover:text-blue-500 transition-colors"
							>
								パスワードを忘れた場合
							</button>
						</div>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							minlength="6"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							placeholder="パスワードを入力"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'ログイン中...' : 'ログイン'}
					</button>
				</form>
			</div>

			<!-- Enrollment Link -->
			<p class="mt-8 text-center text-sm text-gray-600">
				まだこのスペースに参加していませんか？
				<button
					on:click={navigateToEnroll}
					class="font-medium text-blue-600 hover:text-blue-500 transition-colors"
				>
					登録
				</button>
			</p>
		</div>
	</div>
{/if}

<!-- Password Reset Modal -->
{#if showResetModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-2xl font-bold text-gray-900">パスワードリセット</h2>
				<button
					on:click={closeResetModal}
					class="text-gray-400 hover:text-gray-600 transition-colors"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
					</svg>
				</button>
			</div>

			{#if !resetSuccess}
				<p class="text-gray-600 mb-6">
					登録したメールアドレスを入力してください。パスワードリセット用のリンクを発行します。
				</p>

				{#if resetError}
					<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
						<p class="text-sm text-red-800">{resetError}</p>
					</div>
				{/if}

				<form on:submit|preventDefault={handlePasswordReset} class="space-y-4">
					<div>
						<label for="reset-email" class="block text-sm font-medium text-gray-700 mb-2">
							メールアドレス
						</label>
						<input
							id="reset-email"
							type="email"
							bind:value={resetEmail}
							required
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							placeholder="example@email.com"
						/>
					</div>

					<div class="flex space-x-3">
						<button
							type="button"
							on:click={closeResetModal}
							class="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
						>
							キャンセル
						</button>
						<button
							type="submit"
							disabled={resetLoading}
							class="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{resetLoading ? '送信中...' : 'リセットリンクを発行'}
						</button>
					</div>
				</form>
			{:else}
				<div class="space-y-4">
					<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
						<div class="flex items-start">
							<svg class="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
							<p class="text-sm text-green-800">パスワードリセットリンクを発行しました！</p>
						</div>
					</div>

					<p class="text-sm text-gray-600 mb-4">
						以下のリンクをコピーして、新しいタブで開いてください。リンクは1時間有効です。
					</p>

					<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 break-all text-sm">
						{resetLink}
					</div>

					<div class="flex space-x-3">
						<button
							on:click={copyResetLink}
							class="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
						>
							リンクをコピー
						</button>
						<a
							href={resetLink}
							target="_blank"
							class="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center"
						>
							リンクを開く
						</a>
					</div>

					<button
						on:click={closeResetModal}
						class="w-full mt-4 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
					>
						閉じる
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
