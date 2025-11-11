<script lang="ts">
	import { goto } from '$app/navigation'

	let email = ''
	let password = ''
	let displayName = ''
	let username = ''
	let bio = ''
	let loading = false
	let error = ''
	let success = false
	let message = ''

	async function handleRegister() {
		loading = true
		error = ''

		try {
			// 講師として登録
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					password,
					username,
					role: 'instructor'
				})
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || '登録に失敗しました')
			}

			// 登録成功
			success = true
			message = '講師として登録されました。ログインしてください。'

			// 2秒後にログインページへリダイレクト
			setTimeout(() => {
				goto('/login')
			}, 2000)
		} catch (err: any) {
			console.error('Registration error:', err)
			error = err.message || '登録中にエラーが発生しました'
			success = false
		} finally {
			loading = false
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
	<div class="max-w-md mx-auto">
		<div class="bg-white rounded-2xl shadow-xl p-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">講師として登録</h1>
			<p class="text-gray-600 mb-8">オンラインコースを作成して販売を始めましょう</p>
			
			{#if success}
				<div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
					<div class="flex items-start">
						<svg class="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						<div>
							<p class="font-medium">登録完了！</p>
							<p class="text-sm mt-1">{message}</p>
						</div>
					</div>
				</div>
			{:else if error}
				<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
					<div class="flex">
						<svg class="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						<p>{error}</p>
					</div>
				</div>
			{/if}
			
			<form on:submit|preventDefault={handleRegister} class="space-y-6">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
						メールアドレス
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="email@example.com"
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
						required
						minlength="6"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="6文字以上"
					/>
				</div>
				
				<div>
					<label for="displayName" class="block text-sm font-medium text-gray-700 mb-2">
						表示名
					</label>
					<input
						id="displayName"
						type="text"
						bind:value={displayName}
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="講師名"
					/>
				</div>
				
				<div>
					<label for="username" class="block text-sm font-medium text-gray-700 mb-2">
						ユーザーネーム（URL用）
					</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						required
						pattern="[a-zA-Z0-9]+"
						minlength="3"
						maxlength="20"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="例: johnsmith"
					/>
					<p class="text-sm text-gray-500 mt-1">
						英数字のみ、3-20文字。URLに使用されます（例: /johnsmith/dashboard）
					</p>
				</div>
				
				<div>
					<label for="bio" class="block text-sm font-medium text-gray-700 mb-2">
						自己紹介
					</label>
					<textarea
						id="bio"
						bind:value={bio}
						rows="4"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
						placeholder="あなたの経験や専門分野について"
					></textarea>
				</div>
				
				<button
					type="submit"
					disabled={loading || success}
					class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? '登録中...' : success ? '登録完了' : '講師として登録'}
				</button>
			</form>
			
			<p class="mt-6 text-center text-sm text-gray-600">
				既にアカウントをお持ちですか？
				<a href="/login" class="text-blue-600 hover:text-blue-800 font-medium">
					ログイン
				</a>
			</p>
		</div>
	</div>
</div>