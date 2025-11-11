<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	
	let username = ''
	let displayName = ''
	let loading = false
	let error = ''
	let user: any = null
	
	onMount(async () => {
		// TODO: D1実装が必要 - ユーザー認証とプロフィール確認
		error = 'この機能は現在実装中です。D1データベースへの移行が必要です。'
	})
	
	async function handleSubmit() {
		if (!username || !displayName) {
			error = 'すべての項目を入力してください'
			return
		}

		loading = true
		error = 'この機能は現在実装中です。D1データベースへの移行が必要です。'
		loading = false
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
	<div class="max-w-md mx-auto">
		<div class="bg-white rounded-2xl shadow-xl p-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">プロフィール設定</h1>
			<p class="text-gray-600 mb-8">アカウントを完成させるために、ユーザーネームを設定してください</p>
			
			{#if error}
				<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
					<div class="flex">
						<svg class="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						<p>{error}</p>
					</div>
				</div>
			{/if}
			
			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<div>
					<label for="displayName" class="block text-sm font-medium text-gray-700 mb-2">
						表示名
					</label>
					<input
						id="displayName"
						type="text"
						bind:value={displayName}
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="あなたの名前"
					/>
				</div>
				
				<div>
					<label for="username" class="block text-sm font-medium text-gray-700 mb-2">
						ユーザーネーム（URL用）
					</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						required
						pattern="[a-zA-Z0-9]+"
						minlength="3"
						maxlength="20"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="例: johnsmith"
					/>
					<p class="text-sm text-gray-500 mt-1">
						英数字のみ、3-20文字。URLに使用されます（例: /{username}/dashboard）
					</p>
				</div>
				
				<button
					type="submit"
					disabled={loading}
					class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? '設定中...' : 'プロフィールを完成'}
				</button>
			</form>
		</div>
	</div>
</div>