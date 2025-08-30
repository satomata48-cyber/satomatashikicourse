<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { createSupabaseBrowserClient } from '$lib/supabase'
  
  const supabase = createSupabaseBrowserClient()
  let loading = true
  
  onMount(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        goto('/login')
        return
      }
      
      // ログイン済みユーザーは適切なダッシュボードにリダイレクト
      goto(`/${user.id}/dashboard`)
    } catch (error) {
      console.error('認証エラー:', error)
      goto('/login')
    } finally {
      loading = false
    }
  })
</script>

<svelte:head>
  <title>ダッシュボードリダイレクト</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">適切なダッシュボードにリダイレクトしています...</p>
    </div>
  </div>
{/if}