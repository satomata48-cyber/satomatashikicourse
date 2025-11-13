<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	$: username = $page.params.username
	$: slug = $page.params.slug

	let email = ''
	let password = ''
	let loading = false
	let error = ''
	let space: any = null

	onMount(async () => {
		// スペース情報を取得
		await loadSpace()

		// TODO: D1実装が必要 - ログイン状態のチェック
	})

	async function loadSpace() {
		try {
			// TODO: D1実装が必要 - スペース情報の取得
			throw new Error('この機能は現在実装中です')
		} catch (err: any) {
			error = err.message
			console.error('Load space error:', err)
		}
	}

	async function handleLogin() {
		loading = true
		error = ''

		try {
			// TODO: D1実装が必要 - ログイン処理
			throw new Error('この機能は現在実装中です')
		} catch (err: any) {
			error = err.message || 'ログインに失敗しました'
			console.error('Login error:', err)
		} finally {
			loading = false
		}
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
			{space ? space.title : ''} - 生徒ログイン
		</h2>
		<p class="mt-2 text-center text-sm text-gray-600">
			まだ登録していませんか？
			<a href="/{username}/space/{slug}/register" class="font-medium text-blue-600 hover:text-blue-500">
				生徒登録はこちら
			</a>
		</p>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			{#if error}
				<div class="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
					{error}
				</div>
			{/if}

			<form on:submit|preventDefault={handleLogin} class="space-y-6">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">
						メールアドレス
					</label>
					<div class="mt-1">
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							bind:value={email}
							class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">
						パスワード
					</label>
					<div class="mt-1">
						<input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
							bind:value={password}
							class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						/>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<div class="text-sm">
						<a href="/forgot-password" class="font-medium text-blue-600 hover:text-blue-500">
							パスワードをお忘れですか？
						</a>
					</div>
				</div>

				<div>
					<button
						type="submit"
						disabled={loading}
						class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'ログイン中...' : 'ログイン'}
					</button>
				</div>
			</form>

			<div class="mt-6">
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-gray-300"></div>
					</div>
					<div class="relative flex justify-center text-sm">
						<span class="px-2 bg-white text-gray-500">または</span>
					</div>
				</div>

				<div class="mt-6">
					<a
						href="/{username}/space/{slug}"
						class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
					>
						スペースページに戻る
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
