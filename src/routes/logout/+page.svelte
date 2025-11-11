<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'

	onMount(async () => {
		// ログアウト処理
		try {
			await fetch('/api/auth/logout', {
				method: 'POST'
			})
		} catch (error) {
			console.error('Logout error:', error)
		}

		// ログインページにリダイレクト
		goto('/login')
	})
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
	<div class="text-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
		<p class="text-gray-600">ログアウト中...</p>
	</div>
</div>