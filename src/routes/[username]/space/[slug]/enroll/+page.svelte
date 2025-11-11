<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username
	$: slug = $page.params.slug

	let space: any = null
	let instructor: any = null
	let loading = true
	let enrolling = false
	let error = ''
	let isLoggedIn = false
	let isAlreadyEnrolled = false
	let needsSignUp = false

	// 生徒登録フォーム
	let signUpData = {
		email: '',
		password: '',
		displayName: ''
	}
	let signUpLoading = false
	let signUpError = ''
	let signUpSuccess = false

	// リアクティブにパラメータが設定されたらデータを読み込み
	$: if (username && slug && username !== 'undefined' && slug !== 'undefined') {
		console.log('Loading enroll data for:', { username, slug })
		loadSpaceData().then(() => {
			checkUserStatus()
		})
	} else {
		console.log('Waiting for enroll params:', { username, slug })
	}

	async function loadSpaceData() {
		try {
			// TODO: D1実装が必要 - スペース情報の取得
			throw new Error('この機能は現在実装中です')
		} catch (err: any) {
			error = err.message
			console.error('Load space data error:', err)
		} finally {
			loading = false
		}
	}

	async function checkUserStatus() {
		isLoggedIn = !!data.user

		if (data.user && space) {
			// TODO: D1実装が必要 - 登録状態の確認
			isAlreadyEnrolled = false
		}
	}

	async function handleSignUp() {
		signUpLoading = true
		signUpError = ''

		try {
			if (!signUpData.email || !signUpData.password || !signUpData.displayName) {
				throw new Error('すべての項目を入力してください')
			}

			// TODO: D1実装が必要 - サインアップ処理
			throw new Error('この機能は現在実装中です')
		} catch (err: any) {
			console.error('Signup error:', err)
			signUpError = err.message || '登録に失敗しました。しばらく時間をおいてから再度お試しください。'
		} finally {
			signUpLoading = false
		}
	}

	async function handleEnroll() {
		if (!data.user) {
			needsSignUp = true
			return
		}

		await enrollToSpace(data.user.id)
	}

	async function enrollToSpace(userId: string) {
		enrolling = true
		error = ''

		try {
			// TODO: D1実装が必要 - スペースへの登録
			throw new Error('この機能は現在実装中です')
		} catch (err: any) {
			error = err.message
		} finally {
			enrolling = false
		}
	}
	
	$: theme = space?.landing_page_content?.theme || { primaryColor: '#3B82F6', accentColor: '#F59E0B' }
</script>

<svelte:head>
	<title>{space?.title || 'Loading...'} | 学習を始める</title>
	<meta name="description" content={`${space?.title}での学習を始めましょう`} />
</svelte:head>

{#if loading}
	<div class="min-h-screen flex justify-center items-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else if error && !space}
	<div class="min-h-screen flex justify-center items-center">
		<div class="max-w-md text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.598 0L4.216 15.5C3.445 16.333 4.406 18 5.946 18z"/>
			</svg>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">エラーが発生しました</h1>
			<p class="text-gray-600">{error}</p>
		</div>
	</div>
{:else if space}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<header 
			class="py-12 text-white"
			style="background: linear-gradient(135deg, {theme.primaryColor}, color-mix(in srgb, {theme.primaryColor} 80%, transparent))"
		>
			<div class="container mx-auto px-6 text-center">
				<h1 class="text-4xl font-bold mb-4">{space.title}</h1>
				<p class="text-xl text-white/90">学習を始めるためのセットアップ</p>
			</div>
		</header>
		
		<div class="container mx-auto px-6 py-12">
			<div class="max-w-md mx-auto">
				{#if isAlreadyEnrolled}
					<!-- 既に登録済み -->
					<div class="bg-white rounded-lg shadow-lg p-8 text-center">
						<svg class="mx-auto h-16 w-16 text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						<h2 class="text-2xl font-bold text-gray-900 mb-4">登録済みです</h2>
						<p class="text-gray-600 mb-6">
							既にこのスペースに登録されています。<br>
							ダッシュボードに移動しています...
						</p>
						<a
							href="/{username}/space/{slug}/student"
							class="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
						>
							ダッシュボードへ
							<svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
							</svg>
						</a>
					</div>
				{:else if signUpSuccess}
					<!-- 登録成功メッセージ -->
					<div class="bg-white rounded-lg shadow-lg p-8 text-center">
						<div class="mb-6">
							<svg class="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
							<h2 class="text-2xl font-bold text-gray-900 mb-2">登録完了！</h2>
							<p class="text-gray-600 mb-4">
								メールを送信しました。<br>
								受信したメール内のリンクをクリックして、アカウントを有効化してください。
							</p>
							<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
								<p class="font-medium">📧 次のステップ:</p>
								<ol class="mt-2 list-decimal list-inside space-y-1 text-left">
									<li>メール受信ボックスを確認</li>
									<li>確認メール内のリンクをクリック</li>
									<li>自動的に{space.title}の学習ダッシュボードにアクセス</li>
								</ol>
							</div>
						</div>
						<div class="space-y-3">
							<button
								on:click={() => signUpSuccess = false}
								class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
							>
								別のアカウントで登録する
							</button>
							<a
								href="/{username}/space/{slug}"
								class="block w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
							>
								スペースページに戻る
							</a>
						</div>
					</div>
				{:else if needsSignUp || !isLoggedIn}
					<!-- 生徒登録フォーム -->
					<div class="bg-white rounded-lg shadow-lg p-8">
						<div class="text-center mb-8">
							<h2 class="text-2xl font-bold text-gray-900 mb-2">生徒登録</h2>
							<p class="text-gray-600">{space.title} での学習を始めるためにアカウントを作成してください</p>
						</div>
						
						{#if signUpError}
							<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
								{signUpError}
							</div>
						{/if}
						
						<form on:submit|preventDefault={handleSignUp} class="space-y-6">
							<div>
								<label for="displayName" class="block text-sm font-medium text-gray-700 mb-2">
									お名前 *
								</label>
								<input
									id="displayName"
									type="text"
									bind:value={signUpData.displayName}
									required
									class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="田中太郎"
								/>
							</div>
							
							<div>
								<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
									メールアドレス *
								</label>
								<input
									id="email"
									type="email"
									bind:value={signUpData.email}
									required
									class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="example@email.com"
								/>
							</div>
							
							<div>
								<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
									パスワード *
								</label>
								<input
									id="password"
									type="password"
									bind:value={signUpData.password}
									required
									minlength="6"
									class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="6文字以上"
								/>
							</div>
							
							<button
								type="submit"
								disabled={signUpLoading}
								class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{signUpLoading ? '登録中...' : 'このスペースに登録して学習を始める'}
							</button>
						</form>
						
						<div class="mt-6 text-center">
							<p class="text-sm text-gray-600">
								既にアカウントをお持ちですか？
								<a 
									href="/{username}/space/{slug}/login"
									class="text-blue-600 hover:text-blue-800 font-medium"
								>
									ログイン
								</a>
							</p>
						</div>
						
						{#if !needsSignUp}
							<div class="mt-4 text-center">
								<button
									on:click={() => needsSignUp = false}
									class="text-sm text-gray-500 hover:text-gray-700"
								>
									← 戻る
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<!-- 登録確認 -->
					<div class="bg-white rounded-lg shadow-lg p-8">
						<div class="text-center mb-8">
							<svg class="mx-auto h-16 w-16 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
							</svg>
							<h2 class="text-2xl font-bold text-gray-900 mb-2">学習を始める準備ができました</h2>
							<p class="text-gray-600 mb-6">
								{space.title} での学習を開始します。
							</p>
						</div>
						
						{#if error}
							<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
								{error}
							</div>
						{/if}
						
						<!-- スペース情報 -->
						<div class="bg-gray-50 rounded-lg p-6 mb-6">
							<div class="flex items-center space-x-4">
								{#if instructor?.avatar_url}
									<img
										class="h-12 w-12 rounded-full object-cover"
										src={instructor.avatar_url}
										alt={instructor?.display_name}
									/>
								{:else}
									<div class="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
										<svg class="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
										</svg>
									</div>
								{/if}
								<div>
									<p class="font-medium text-gray-900">講師: {instructor?.display_name || 'Unknown'}</p>
									<p class="text-sm text-gray-600">最大生徒数: {space.max_students}名</p>
								</div>
							</div>
						</div>
						
						<button
							on:click={handleEnroll}
							disabled={enrolling}
							class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{enrolling ? '登録中...' : '学習を始める'}
						</button>
						
						<div class="mt-6 text-center">
							<a
								href="/{username}/space/{slug}"
								class="text-sm text-gray-500 hover:text-gray-700"
							>
								← スペースページに戻る
							</a>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}