<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { onMount } from 'svelte'

	$: username = $page.params.username
	$: slug = $page.params.slug
	$: token = $page.url.searchParams.get('token')

	let newPassword = ''
	let confirmPassword = ''
	let loading = false
	let error = ''
	let success = false

	onMount(() => {
		if (!token) {
			error = '無効なリセットリンクです'
		}
	})

	async function handleResetPassword() {
		if (!newPassword || !confirmPassword) {
			error = '全てのフィールドを入力してください'
			return
		}

		if (newPassword.length < 8) {
			error = 'パスワードは8文字以上である必要があります'
			return
		}

		if (newPassword !== confirmPassword) {
			error = 'パスワードが一致しません'
			return
		}

		loading = true
		error = ''

		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token,
					newPassword
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'パスワードリセットに失敗しました')
			}

			success = true
			// 3秒後にログインページにリダイレクト
			setTimeout(() => {
				goto(`/${username}/space/${slug}/login`)
			}, 3000)
		} catch (err: any) {
			error = err.message || 'パスワードリセットに失敗しました'
			console.error('Reset password error:', err)
		} finally {
			loading = false
		}
	}

	function navigateToLogin() {
		goto(`/${username}/space/${slug}/login`)
	}
</script>

<svelte:head>
	<title>パスワードリセット</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-6">
	<div class="max-w-md w-full">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">パスワードリセット</h1>
			<p class="text-gray-600">新しいパスワードを設定してください</p>
		</div>

		<div class="bg-white p-8 rounded-2xl shadow-xl">
			{#if success}
				<div class="text-center">
					<div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
						<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
						</svg>
					</div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">パスワードリセット完了！</h2>
					<p class="text-gray-600 mb-6">
						パスワードが正常にリセットされました。<br>
						3秒後にログインページに移動します...
					</p>
					<button
						on:click={navigateToLogin}
						class="text-blue-600 hover:text-blue-500 font-medium"
					>
						すぐにログインページへ
					</button>
				</div>
			{:else}
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

				<form on:submit|preventDefault={handleResetPassword} class="space-y-6">
					<div>
						<label for="new-password" class="block text-sm font-medium text-gray-700 mb-2">
							新しいパスワード
						</label>
						<input
							id="new-password"
							type="password"
							bind:value={newPassword}
							required
							minlength="8"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							placeholder="8文字以上"
							disabled={!token}
						/>
					</div>

					<div>
						<label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-2">
							パスワード確認
						</label>
						<input
							id="confirm-password"
							type="password"
							bind:value={confirmPassword}
							required
							minlength="8"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							placeholder="もう一度入力"
							disabled={!token}
						/>
					</div>

					<button
						type="submit"
						disabled={loading || !token}
						class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'リセット中...' : 'パスワードをリセット'}
					</button>
				</form>

				<p class="mt-6 text-center text-sm text-gray-600">
					<button
						on:click={navigateToLogin}
						class="font-medium text-blue-600 hover:text-blue-500 transition-colors"
					>
						ログインページに戻る
					</button>
				</p>
			{/if}
		</div>
	</div>
</div>
