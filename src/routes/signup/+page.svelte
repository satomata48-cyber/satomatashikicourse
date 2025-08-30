<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  
  let loading = true
  
  onMount(async () => {
    // サインアップページは講師登録ページにリダイレクト
    goto('/instructor/register')
  })
</script>

<svelte:head>
  <title>講師登録リダイレクト</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">講師登録ページにリダイレクトしています...</p>
    </div>
  </div>
{/if}