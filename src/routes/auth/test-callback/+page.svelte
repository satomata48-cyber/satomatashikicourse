<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	const supabase = createSupabaseBrowserClient()
	
	let loading = true
	let error = ''
	let users: any[] = []
	let selectedUserId = ''
	
	onMount(async () => {
		try {
			// テスト用：認証状態を確認
			const { data: { user } } = await supabase.auth.getUser()
			
			if (user) {
				// 既にログイン済み
				goto(`/${user.id}/dashboard`)
				return
			}
			
			loading = false
		} catch (err: any) {
			error = err.message
			loading = false
		}
	})
	
	async function testLogin() {
		if (!selectedUserId) {
			error = 'ユーザーを選択してください'
			return
		}
		
		loading = true
		error = ''
		
		try {
			// テスト用の手動ログイン（実際のプロダクションでは使用しない）
			goto(`/${selectedUserId}/dashboard`)
		} catch (err: any) {
			error = err.message
			loading = false
		}
	}
</script>

<svelte:head>
	<title>テスト用認証</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
	<div class="max-w-md mx-auto">
		<div class="bg-white rounded-2xl shadow-xl p-8">
			<h1 class="text-2xl font-bold text-gray-900 mb-4 text-center">テスト用認証</h1>
			<p class="text-gray-600 mb-6 text-center text-sm">開発環境でのメール認証テスト用</p>
			
			{#if error}
				<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
					{error}
				</div>
			{/if}
			
			<div class="space-y-4">
				<div>
					<label for="userId" class="block text-sm font-medium text-gray-700 mb-2">
						ユーザーID（UUID）
					</label>
					<input
						id="userId"
						type="text"
						bind:value={selectedUserId}
						placeholder="ユーザーのUUIDを入力"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 mt-1">
						講師登録時にコンソールに表示されたユーザーIDを入力してください
					</p>
				</div>
				
				<button
					on:click={testLogin}
					disabled={loading}
					class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
				>
					{loading ? '処理中...' : 'ダッシュボードに移動'}
				</button>
			</div>
			
			<div class="mt-6 pt-6 border-t border-gray-200 text-center">
				<p class="text-xs text-gray-500 mb-2">その他のテスト用リンク</p>
				<div class="space-y-1">
					<a href="/instructor/register" class="block text-blue-600 text-sm">講師登録に戻る</a>
					<a href="/login" class="block text-blue-600 text-sm">ログインページ</a>
				</div>
			</div>
		</div>
	</div>
</div>