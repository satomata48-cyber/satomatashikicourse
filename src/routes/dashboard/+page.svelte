<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  let loading = true
  
  onMount(async () => {
    try {
      // TODO: D1実装が必要 - ユーザー認証とリダイレクト
      goto('/login')
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