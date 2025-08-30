<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'

	const supabase = createSupabaseBrowserClient()

	$: username = $page.params.username
	$: slug = $page.params.slug

	let email = ''
	let password = ''
	let loading = false
	let error = ''
	let space: any = null
	let spaceLoading = true

	// リアクティブにパラメータが設定されたらデータを読み込み
	$: if (username && slug && username !== 'undefined' && slug !== 'undefined') {
		console.log('Loading space info for:', { username, slug })
		loadSpaceInfo()
	} else {
		console.log('Waiting for params:', { username, slug })
	}

	// スペース情報を取得
	async function loadSpaceInfo() {
		try {
			// usernameから講師IDを取得
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('id')
				.eq('username', username)
				.single()

			if (profileError || !profileData) {
				throw new Error('講師が見つかりません')
			}

			// スペース情報を取得
			const { data: spaceData, error: spaceError } = await supabase
				.from('spaces')
				.select('id, title, description')
				.eq('slug', slug)
				.eq('instructor_id', profileData.id)
				.single()

			if (spaceError || !spaceData) {
				throw new Error('スペースが見つかりません')
			}

			space = spaceData
		} catch (err: any) {
			console.error('Space load error:', err)
			error = err.message
		} finally {
			spaceLoading = false
		}
	}

	// リアクティブ文でデータ読み込みを行うため、ここでの実行は不要

	async function handleLogin() {
		if (!email || !password) {
			error = 'メールアドレスとパスワードを入力してください。'
			return
		}

		loading = true
		error = ''

		try {
			const { data, error: authError } = await supabase.auth.signInWithPassword({
				email,
				password
			})

			if (authError) throw authError

			if (data.user) {
				// 認証成功後、このスペースの生徒として登録されているかチェック
				try {
					const { data: studentData, error: studentError } = await supabase
						.from('space_students')
						.select('status')
						.eq('student_id', data.user.id)
						.eq('space_id', space.id)
						.single()

					if (studentError || !studentData) {
						// 生徒として登録されていない場合は登録ページにリダイレクト
						goto(`/${username}/space/${slug}/enroll?message=このスペースへの参加登録が必要です`)
						return
					}

					if (studentData.status !== 'active') {
						error = 'アカウントの状態を確認してください。講師にお問い合わせください。'
						loading = false
						return
					}

					// 生徒として登録済みかつアクティブの場合、ダッシュボードへ
					goto(`/${username}/space/${slug}/student`)
				} catch (studentCheckError) {
					console.error('Student check error:', studentCheckError)
					// エラーの場合も登録ページに誘導
					goto(`/${username}/space/${slug}/enroll?message=このスペースへの参加登録が必要です`)
					return
				}
			}
		} catch (err: any) {
			error = err.message || 'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
			console.error('Login error:', err)
		} finally {
			loading = false
		}
	}

	function navigateToEnroll() {
		goto(`/${username}/space/${slug}/enroll`)
	}

	function navigateToSpace() {
		goto(`/${username}/space/${slug}`)
	}
</script>

<svelte:head>
	<title>ログイン - {space?.title || 'スペース'}</title>
	<meta name="description" content="{space?.title || 'スペース'}にログインして学習を続けましょう。" />
</svelte:head>

{#if spaceLoading}
	<div class="min-h-screen flex justify-center items-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else if !space}
	<div class="min-h-screen flex justify-center items-center">
		<div class="max-w-md text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.598 0L4.216 15.5C3.445 16.333 4.406 18 5.946 18z"/>
			</svg>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">スペースが見つかりません</h1>
			<p class="text-gray-600">{error}</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-6">
		<div class="max-w-md w-full">
			<!-- Back to Space -->
			<button 
				on:click={navigateToSpace}
				class="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
				</svg>
				スペースに戻る
			</button>

			<!-- Space Logo and Title -->
			<div class="text-center mb-8">
				<div class="flex items-center justify-center space-x-2 mb-4">
					<div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
						<span class="text-white font-bold text-lg">{space.title.charAt(0)}</span>
					</div>
					<span class="text-2xl font-bold text-gray-900">{space.title}</span>
				</div>
				<h1 class="text-3xl font-bold text-gray-900 mb-2">ログイン</h1>
				<p class="text-gray-600">アカウントにログインして学習を続けてください</p>
			</div>

			<!-- Login Form -->
			<div class="bg-white p-8 rounded-2xl shadow-xl">
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
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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

					<button
						type="submit"
						class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

			<!-- Enrollment Link -->
			<p class="mt-8 text-center text-sm text-gray-600">
				まだこのスペースに参加していませんか？
				<button 
					on:click={navigateToEnroll}
					class="font-medium text-blue-600 hover:text-blue-500 transition-colors"
				>
					生徒登録
				</button>
			</p>
		</div>
	</div>
{/if}