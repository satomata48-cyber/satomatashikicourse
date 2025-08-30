<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	let loading = true
	let error = ''
	let status = 'メール認証を処理しています...'
	let debugInfo = ''
	
	onMount(async () => {
		try {
			// URLパラメータからトークンを確認
			const urlParams = new URLSearchParams(window.location.search)
			const hashParams = new URLSearchParams(window.location.hash.substring(1))
			
			console.log('URL params:', Object.fromEntries(urlParams))
			console.log('Hash params:', Object.fromEntries(hashParams))
			
			// まずSupabaseの現在のユーザーを確認
			const { data: userData, error: authError } = await supabase.auth.getUser()
			
			if (authError) {
				console.error('User error:', authError)
			}
			
			if (userData?.user) {
				console.log('Found existing user:', userData.user.id)
				await handleEmailConfirmed(userData.user)
				return
			}
			
			// URLからトークンを手動で処理
			let accessToken = hashParams.get('access_token') || urlParams.get('access_token')
			let refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token')
			const tokenType = hashParams.get('token_type') || urlParams.get('token_type')
			
			// Supabaseのメール確認リンクからのトークンを確認
			const confirmationToken = urlParams.get('token')
			const tokenHash = urlParams.get('token_hash')
			const type = urlParams.get('type')
			
			console.log('Tokens found:', { accessToken: !!accessToken, refreshToken: !!refreshToken, confirmationToken: !!confirmationToken, tokenHash: !!tokenHash, type })
			
			if (type === 'signup' && (confirmationToken || tokenHash)) {
				// メール確認トークンでセッションを確立
				status = 'メール確認を処理しています...'
				const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
					token_hash: tokenHash || confirmationToken,
					type: 'email'
				})
				
				if (verifyError) {
					console.error('OTP verification error:', verifyError)
					throw verifyError
				}
				
				if (verifyData.session?.user) {
					console.log('Email confirmed successfully:', verifyData.session.user.id)
					await handleEmailConfirmed(verifyData.session.user)
				} else {
					throw new Error('メール確認が完了しましたがユーザー情報を取得できません')
				}
			} else if (accessToken) {
				// アックセストークンでセッションを確立
				status = 'セッションを確立しています...'
				const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken || ''
				})
				
				if (sessionError) {
					console.error('Session setup error:', sessionError)
					throw sessionError
				}
				
				if (sessionData.session?.user) {
					console.log('Session established:', sessionData.session.user.id)
					await handleEmailConfirmed(sessionData.session.user)
				} else {
					throw new Error('セッションの確立に失敗しました')
				}
			} else {
				// デバッグ情報を表示
				console.log('No tokens found. Current URL:', window.location.href)
				console.log('Search params:', window.location.search)
				console.log('Hash:', window.location.hash)
				throw new Error('認証トークンが見つかりません。URLを確認してください。')
			}
		} catch (err: any) {
			console.error('Auth callback error:', err)
			error = err.message || 'メール認証に失敗しました'
			debugInfo = `URL: ${window.location.href}\nSearch: ${window.location.search}\nHash: ${window.location.hash}\nError: ${err.message}`
			loading = false
		}
	})
	
	async function handleEmailConfirmed(user: any) {
		try {
			status = 'プロフィールを作成しています...'
			
			// ユーザーのメタデータを取得
			const userData = user.user_metadata || {}
			const role = userData.role || 'instructor'
			const displayName = userData.display_name || user.email
			const username = userData.username || '' // 新システムではusernameを使用
			const bio = userData.bio || ''
			const spaceInfo = userData.space_info // 生徒登録時のスペース情報
			
			// プロフィールを作成/更新
			console.log('Creating profile with data:', {
				id: user.id,
				email: user.email,
				display_name: displayName,
				username: username,
				role: role,
				bio: bio
			})
			
			const { error: profileError } = await supabase
				.from('profiles')
				.upsert({
					id: user.id,
					email: user.email,
					display_name: displayName,
					username: username || null,
					role: role,
					bio: bio || null
				})
			
			if (profileError) {
				console.error('Profile creation error:', profileError)
				throw profileError
			}
			
			// 生徒登録の場合は、space_studentsテーブルに追加
			if (role === 'student' && spaceInfo) {
				status = 'スペースに登録しています...'
				
				// 既に登録済みかチェック
				const { data: existingEnrollment } = await supabase
					.from('space_students')
					.select('id')
					.eq('student_id', user.id)
					.eq('space_id', spaceInfo.space_id)
					.single()
				
				if (!existingEnrollment) {
					const { error: studentError } = await supabase
						.from('space_students')
						.insert({
							student_id: user.id,
							space_id: spaceInfo.space_id,
							status: 'active',
							enrolled_at: new Date().toISOString()
						})
					
					if (studentError) {
						console.error('Student enrollment error:', studentError)
						throw studentError
					}
				} else {
					console.log('User already enrolled in this space')
				}
				
				status = 'スペースダッシュボードにリダイレクトしています...'
				
				// 生徒の場合はスペースダッシュボードへ
				setTimeout(() => {
					goto(`/${spaceInfo.username}/space/${spaceInfo.slug}/student`)
				}, 1000)
			} else {
				// 講師の場合は従来通り
				status = 'ダッシュボードにリダイレクトしています...'
				
				setTimeout(() => {
					if (username) {
						goto(`/${username}/dashboard`)
					} else {
						goto('/profile/setup')
					}
				}, 1000)
			}
			
		} catch (err: any) {
			console.error('Profile setup error:', err)
			error = `プロフィール設定でエラーが発生しました: ${err.message}`
			loading = false
		}
	}
</script>

<svelte:head>
	<title>メール認証確認中...</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
	<div class="max-w-md mx-auto">
		<div class="bg-white rounded-2xl shadow-xl p-8 text-center">
			{#if loading}
				<div class="mb-6">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<h1 class="text-2xl font-bold text-gray-900 mb-2">認証処理中</h1>
					<p class="text-gray-600">{status}</p>
				</div>
			{:else if error}
				<div class="mb-6">
					<svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
					<h1 class="text-2xl font-bold text-gray-900 mb-2">認証エラー</h1>
					<p class="text-red-600 mb-4">{error}</p>
					{#if debugInfo}
						<details class="mb-4 p-3 bg-gray-100 rounded text-xs">
							<summary class="cursor-pointer font-medium">デバッグ情報</summary>
							<pre class="mt-2 whitespace-pre-wrap">{debugInfo}</pre>
						</details>
					{/if}
					<div class="space-y-2">
						<a 
							href="/instructor/register"
							class="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
						>
							再度登録する
						</a>
						<a 
							href="/login"
							class="block w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
						>
							ログインページへ
						</a>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>