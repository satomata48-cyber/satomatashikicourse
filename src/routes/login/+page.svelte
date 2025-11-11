<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  let successMessage = '';

  $: redirect = $page.url.searchParams.get('redirect');
  $: urlError = $page.url.searchParams.get('error');
  $: resetSuccess = $page.url.searchParams.get('reset');

  // URLパラメータからエラーメッセージを取得
  $: if (urlError) {
    error = urlError;
  }

  // パスワードリセット成功メッセージを表示
  $: if (resetSuccess === 'success') {
    successMessage = 'パスワードが正常に更新されました。新しいパスワードでログインしてください。';
  }

  async function handleLogin() {
    if (!email || !password) {
      error = 'メールアドレスとパスワードを入力してください。';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ログインに失敗しました');
      }

      // ログイン成功
      if (data.user) {
        if (!data.user.username) {
          goto('/profile/setup');
          return;
        }

        if (redirect) {
          goto(redirect);
        } else {
          goto(`/${data.user.username}/dashboard`);
        }
      }
    } catch (err: any) {
      error = err.message || 'ログインに失敗しました。メールアドレスとパスワードを確認してください。';
      console.error('Login error:', err);
    } finally {
      loading = false;
    }
  }

  function navigateToSignup() {
    goto('/instructor/register');
  }

  function navigateHome() {
    goto('/');
  }
</script>

<svelte:head>
  <title>ログイン - MemberSite</title>
  <meta name="description" content="アカウントにログインして限定コンテンツにアクセスしましょう。" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-6">
  <div class="max-w-md w-full">
    <!-- Back to Home -->
    <button 
      on:click={navigateHome}
      class="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
    >
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
      </svg>
      ホームに戻る
    </button>

    <!-- Logo and Title -->
    <div class="text-center mb-8">
      <div class="flex items-center justify-center space-x-2 mb-4">
        <div class="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
          <span class="text-white font-bold text-lg">M</span>
        </div>
        <span class="text-2xl font-bold text-gray-900">MemberSite</span>
      </div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">おかえりなさい</h1>
      <p class="text-gray-600">アカウントにログインして続行してください</p>
    </div>

    <!-- Login Form -->
    <div class="card">
      <form on:submit|preventDefault={handleLogin} class="space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            class="input-field"
            required
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="••••••••"
            class="input-field"
            required
          />
        </div>

        {#if successMessage}
          <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="flex">
              <svg class="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-sm text-green-800">{successMessage}</p>
            </div>
          </div>
        {/if}

        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="flex">
              <svg class="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-sm text-red-800">{error}</p>
            </div>
          </div>
        {/if}

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label for="remember-me" class="ml-2 block text-sm text-gray-700">
              ログイン状態を保持
            </label>
          </div>

          <a href="/forgot-password" class="text-sm text-primary-600 hover:text-primary-500">
            パスワードをお忘れですか？
          </a>
        </div>

        <button
          type="submit"
          class="btn-primary w-full text-center py-3"
          disabled={loading}
        >
          {#if loading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ログイン中...
          {:else}
            ログイン
          {/if}
        </button>
      </form>
    </div>

    <!-- Sign Up Link -->
    <p class="mt-8 text-center text-sm text-gray-600">
      アカウントをお持ちでないですか？
      <button 
        on:click={navigateToSignup}
        class="font-medium text-primary-600 hover:text-primary-500 transition-colors"
      >
        新規登録
      </button>
    </p>
  </div>
</div>