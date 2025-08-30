<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { createSupabaseBrowserClient } from '$lib/supabase';
  
  const supabase = createSupabaseBrowserClient();
  
  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  
  $: redirect = $page.url.searchParams.get('redirect');
  $: urlError = $page.url.searchParams.get('error');
  
  // URLパラメータからエラーメッセージを取得
  $: if (urlError) {
    error = urlError;
  }

  async function handleLogin() {
    if (!email || !password) {
      error = 'メールアドレスとパスワードを入力してください。';
      return;
    }

    loading = true;
    error = '';
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) throw authError;
      
      if (data.user) {
        // 認証成功後、ユーザーのusernameを取得してダッシュボードに移動
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', data.user.id)
            .single();
          
          if (profileError || !profileData?.username) {
            // usernameがない場合はプロフィール設定ページにリダイレクト
            goto('/profile/setup');
            return;
          }
          
          if (redirect) {
            goto(redirect);
          } else {
            goto(`/${profileData.username}/dashboard`);
          }
        } catch (err) {
          console.error('Profile lookup error:', err);
          goto('/profile/setup');
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
    goto('/signup');
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

      <!-- Divider -->
      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">または</span>
          </div>
        </div>
      </div>

      <!-- Social Login -->
      <div class="mt-6 space-y-3">
        <button class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors">
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでログイン
        </button>
        
        <button class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
          </svg>
          Twitterでログイン
        </button>
      </div>
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