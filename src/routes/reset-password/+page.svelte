<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	
	const supabase = createSupabaseBrowserClient();

	let password = '';
	let confirmPassword = '';
	let loading = false;
	let error = '';
	let isValidToken = false;

	onMount(async () => {
		// Check if user has a valid recovery token
		const { data: { session } } = await supabase.auth.getSession();
		if (session) {
			isValidToken = true;
		} else {
			// Check URL for recovery token
			const hashParams = new URLSearchParams(window.location.hash.substring(1));
			const accessToken = hashParams.get('access_token');
			const type = hashParams.get('type');
			
			if (accessToken && type === 'recovery') {
				isValidToken = true;
			}
		}
	});

	async function handlePasswordReset() {
		if (password !== confirmPassword) {
			error = 'パスワードが一致しません';
			return;
		}

		if (password.length < 6) {
			error = 'パスワードは6文字以上で入力してください';
			return;
		}

		loading = true;
		error = '';

		try {
			const { error: updateError } = await supabase.auth.updateUser({
				password: password
			});

			if (updateError) throw updateError;

			// Sign out to clear the recovery session
			await supabase.auth.signOut();
			
			// Redirect to login with success message
			goto('/login?reset=success');
		} catch (err) {
			error = err instanceof Error ? err.message : 'パスワードの更新に失敗しました';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
			新しいパスワードを設定
		</h2>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			{#if !isValidToken}
				<div class="rounded-md bg-yellow-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-yellow-800">
								有効なリセットトークンが見つかりません
							</h3>
							<div class="mt-2 text-sm text-yellow-700">
								<p>パスワードリセットメールから再度アクセスしてください。</p>
							</div>
							<div class="mt-4">
								<a href="/forgot-password" class="text-sm font-medium text-yellow-800 hover:text-yellow-700">
									パスワードリセットをもう一度リクエスト →
								</a>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<form on:submit|preventDefault={handlePasswordReset} class="space-y-6">
					<div>
						<label for="password" class="block text-sm font-medium text-gray-700">
							新しいパスワード
						</label>
						<div class="mt-1">
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="new-password"
								required
								bind:value={password}
								disabled={loading}
								class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
								placeholder="6文字以上"
							/>
						</div>
					</div>

					<div>
						<label for="confirmPassword" class="block text-sm font-medium text-gray-700">
							パスワードを確認
						</label>
						<div class="mt-1">
							<input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								autocomplete="new-password"
								required
								bind:value={confirmPassword}
								disabled={loading}
								class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
								placeholder="もう一度入力"
							/>
						</div>
					</div>

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
							disabled={loading || !password || !confirmPassword}
							class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? '更新中...' : 'パスワードを更新'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>