<script lang="ts">
  import { goto } from '$app/navigation';
  
  function navigateToLogin() {
    goto('/login');
  }
  
  function navigateToSignup() {
    goto('/signup');
  }
</script>

<svelte:head>
  <title>会員制サイト - あなたの特別な体験を始めましょう</title>
  <meta name="description" content="限定コンテンツとプレミアムサービスを提供する会員制サイトです。" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-primary-50 to-white">
  <!-- Navigation -->
  <nav class="relative px-6 py-4">
    <div class="max-w-7xl mx-auto flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">M</span>
        </div>
        <span class="text-xl font-bold text-gray-900">MemberSite</span>
      </div>
      
      <div class="hidden md:flex items-center space-x-8">
        <a href="#features" class="text-gray-600 hover:text-gray-900 transition-colors">機能</a>
        <a href="#pricing" class="text-gray-600 hover:text-gray-900 transition-colors">料金</a>
        <a href="#about" class="text-gray-600 hover:text-gray-900 transition-colors">について</a>
      </div>
      
      <div class="flex items-center space-x-4">
        <button 
          on:click={navigateToLogin}
          class="text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          ログイン
        </button>
        <button 
          on:click={navigateToSignup}
          class="btn-primary"
        >
          無料で始める
        </button>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="px-6 py-16 md:py-24">
    <div class="max-w-7xl mx-auto text-center">
      <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
        あなただけの
        <span class="bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
          特別な体験
        </span>
        を始めませんか？
      </h1>
      <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
        限定コンテンツ、プレミアムサービス、そして特別なコミュニティへのアクセスを提供します。
        今すぐ参加して、新しい世界を発見しましょう。
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button 
          on:click={navigateToSignup}
          class="btn-primary text-lg px-8 py-3"
        >
          今すぐ無料で始める
        </button>
        <button class="btn-secondary text-lg px-8 py-3">
          詳細を見る
        </button>
      </div>
      <p class="text-sm text-gray-500 mt-4">
        クレジットカード不要 • 30日間無料トライアル
      </p>
    </div>
  </section>

  <!-- Features Section -->
  <section id="features" class="px-6 py-16 bg-white">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          なぜ選ばれるのか
        </h2>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          私たちのプラットフォームが提供する特別な価値をご紹介します
        </p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-8">
        <div class="card text-center">
          <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">限定コンテンツ</h3>
          <p class="text-gray-600">
            会員限定の高品質なコンテンツや情報にアクセスできます。常に最新の価値ある情報をお届けします。
          </p>
        </div>
        
        <div class="card text-center">
          <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">専用コミュニティ</h3>
          <p class="text-gray-600">
            同じ興味を持つメンバーとのつながりを築き、有意義な交流を通じて新しい発見を得ることができます。
          </p>
        </div>
        
        <div class="card text-center">
          <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">優先サポート</h3>
          <p class="text-gray-600">
            専任のサポートチームが迅速かつ丁寧にお客様の質問やお困りごとにお答えします。
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section id="pricing" class="px-6 py-16 bg-gray-50">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          シンプルな料金体系
        </h2>
        <p class="text-xl text-gray-600">
          あなたのニーズに合わせてプランをお選びください
        </p>
      </div>
      
      <div class="grid md:grid-cols-2 gap-8">
        <div class="card">
          <div class="text-center mb-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">ベーシック</h3>
            <div class="text-4xl font-bold text-gray-900 mb-2">
              ¥980
              <span class="text-lg font-normal text-gray-600">/月</span>
            </div>
            <p class="text-gray-600">基本的な機能をお試しください</p>
          </div>
          <ul class="space-y-4 mb-8">
            <li class="flex items-center">
              <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              基本コンテンツへのアクセス
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              コミュニティ参加
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              メールサポート
            </li>
          </ul>
          <button 
            on:click={navigateToSignup}
            class="btn-secondary w-full"
          >
            始める
          </button>
        </div>
        
        <div class="card border-2 border-primary-500 relative">
          <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span class="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
              人気
            </span>
          </div>
          <div class="text-center mb-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">プレミアム</h3>
            <div class="text-4xl font-bold text-gray-900 mb-2">
              ¥2,980
              <span class="text-lg font-normal text-gray-600">/月</span>
            </div>
            <p class="text-gray-600">全ての機能を体験してください</p>
          </div>
          <ul class="space-y-4 mb-8">
            <li class="flex items-center">
              <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              全てのプレミアムコンテンツ
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              優先サポート
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              専用セミナー参加権
            </li>
            <li class="flex items-center">
              <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              個別コンサルテーション
            </li>
          </ul>
          <button 
            on:click={navigateToSignup}
            class="btn-primary w-full"
          >
            今すぐ始める
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="px-6 py-16 bg-primary-600">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
        今すぐ参加して、特別な体験を始めませんか？
      </h2>
      <p class="text-xl text-primary-100 mb-8">
        30日間の無料トライアルで、全ての機能をお試しいただけます
      </p>
      <button 
        on:click={navigateToSignup}
        class="bg-white text-primary-600 hover:bg-gray-50 font-semibold py-3 px-8 rounded-lg text-lg transition-colors duration-200"
      >
        無料トライアルを開始
      </button>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-white px-6 py-12">
    <div class="max-w-7xl mx-auto">
      <div class="grid md:grid-cols-4 gap-8 mb-8">
        <div>
          <div class="flex items-center space-x-2 mb-4">
            <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">M</span>
            </div>
            <span class="text-xl font-bold">MemberSite</span>
          </div>
          <p class="text-gray-400">
            あなたの特別な体験を提供する会員制サイトです。
          </p>
        </div>
        
        <div>
          <h4 class="font-semibold mb-4">プロダクト</h4>
          <ul class="space-y-2 text-gray-400">
            <li><a href="#" class="hover:text-white transition-colors">機能</a></li>
            <li><a href="#" class="hover:text-white transition-colors">料金</a></li>
            <li><a href="#" class="hover:text-white transition-colors">セキュリティ</a></li>
          </ul>
        </div>
        
        <div>
          <h4 class="font-semibold mb-4">サポート</h4>
          <ul class="space-y-2 text-gray-400">
            <li><a href="#" class="hover:text-white transition-colors">ヘルプセンター</a></li>
            <li><a href="#" class="hover:text-white transition-colors">お問い合わせ</a></li>
            <li><a href="#" class="hover:text-white transition-colors">コミュニティ</a></li>
          </ul>
        </div>
        
        <div>
          <h4 class="font-semibold mb-4">会社情報</h4>
          <ul class="space-y-2 text-gray-400">
            <li><a href="#" class="hover:text-white transition-colors">会社概要</a></li>
            <li><a href="#" class="hover:text-white transition-colors">プライバシー</a></li>
            <li><a href="#" class="hover:text-white transition-colors">利用規約</a></li>
          </ul>
        </div>
      </div>
      
      <div class="border-t border-gray-800 pt-8 text-center text-gray-400">
        <p>&copy; 2024 MemberSite. All rights reserved.</p>
      </div>
    </div>
  </footer>
</div>