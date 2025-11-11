<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let email = '';
	let loading = false;
	let message = '';
	let error = '';

	async function handleResetRequest() {
		loading = true;
		message = '';
		error = '';

		try {
			// TODO: D1実装が必要 - パスワードリセット機能
			error = 'この機能は現在実装中です。D1データベースへの移行が必要です。';
		} catch (err) {
			error = err instanceof Error ? err.message : 'エラーが発生しました';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
			パスワードをリセット
		</h2>
		<p class="mt-2 text-center text-sm text-gray-600">
			登録済みのメールアドレスを入力してください
		</p>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			<form on:submit|preventDefault={handleResetRequest} class="space-y-6">
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
							disabled={loading}
							class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							placeholder="you@example.com"
						/>
					</div>
				</div>

				{#if message}
					<div class="rounded-md bg-green-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm font-medium text-green-800">
									{message}
								</p>
							</div>
						</div>
					</div>
				{/if}

				{#if error}
					<div class="rounded-md bg-red-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm font-medium text-red-800">
									{error}
								</p>
							</div>
						</div>
					</div>
				{/if}

				<div>
					<button
						type="submit"
						disabled={loading || !email}
						class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? '送信中...' : 'リセットメールを送信'}
					</button>
				</div>

				<div class="flex items-center justify-between">
					<a href="/login" class="text-sm text-indigo-600 hover:text-indigo-500">
						ログインに戻る
					</a>
				</div>
			</form>
		</div>
	</div>
</div>