<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	const supabase = createSupabaseBrowserClient()
	
	onMount(async () => {
		// ログアウト処理
		const { error } = await supabase.auth.signOut()
		
		if (error) {
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