<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'

	export let data

	const supabase = createSupabaseBrowserClient()

	$: username = $page.params.username

	let loading = true
	let saving = false
	let error = ''
	let successMessage = ''
	let uploadingAvatar = false

	// プロフィール情報
	let profile: any = null
	let displayName = ''
	let bio = ''
	let avatarUrl = ''
	let socialLinks = {
		twitter: '',
		facebook: '',
		instagram: '',
		linkedin: '',
		youtube: '',
		website: ''
	}

	// アバター画像プレビュー
	let avatarPreview = ''

	onMount(async () => {
		await loadProfile()
	})

	async function loadProfile() {
		try {
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', data.user.id)
				.single()

			if (profileError) throw profileError

			profile = profileData
			displayName = profileData.display_name || ''
			bio = profileData.bio || ''
			avatarUrl = profileData.avatar_url || ''
			avatarPreview = avatarUrl

			// social_linksがJSONBなのでパース
			if (profileData.social_links) {
				socialLinks = {
					twitter: profileData.social_links.twitter || '',
					facebook: profileData.social_links.facebook || '',
					instagram: profileData.social_links.instagram || '',
					linkedin: profileData.social_links.linkedin || '',
					youtube: profileData.social_links.youtube || '',
					website: profileData.social_links.website || ''
				}
			}

		} catch (err: any) {
			error = err.message
			console.error('Load profile error:', err)
		} finally {
			loading = false
		}
	}

	async function handleAvatarUpload(event: Event) {
		const target = event.target as HTMLInputElement
		const file = target.files?.[0]

		if (!file) return

		// ファイルサイズチェック（5MB以下）
		if (file.size > 5 * 1024 * 1024) {
			error = 'ファイルサイズは5MB以下にしてください'
			return
		}

		// 画像ファイルチェック
		if (!file.type.startsWith('image/')) {
			error = '画像ファイルを選択してください'
			return
		}

		try {
			uploadingAvatar = true
			error = ''

			// プレビュー表示
			const reader = new FileReader()
			reader.onload = (e) => {
				avatarPreview = e.target?.result as string
			}
			reader.readAsDataURL(file)

			// Supabase Storageにアップロード
			const fileExt = file.name.split('.').pop()
			const fileName = `${data.user.id}-${Date.now()}.${fileExt}`
			const filePath = fileName

			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(filePath, file, {
					cacheControl: '3600',
					upsert: false
				})

			if (uploadError) throw uploadError

			// 公開URLを取得
			const { data: urlData } = supabase.storage
				.from('avatars')
				.getPublicUrl(filePath)

			avatarUrl = urlData.publicUrl

		} catch (err: any) {
			error = `アップロードエラー: ${err.message}`
			console.error('Avatar upload error:', err)
		} finally {
			uploadingAvatar = false
		}
	}

	async function handleSave() {
		try {
			saving = true
			error = ''
			successMessage = ''

			// バリデーション
			if (!displayName.trim()) {
				error = '表示名を入力してください'
				return
			}

			// プロフィール更新
			const { error: updateError } = await supabase
				.from('profiles')
				.update({
					display_name: displayName.trim(),
					bio: bio.trim(),
					avatar_url: avatarUrl,
					social_links: socialLinks,
					updated_at: new Date().toISOString()
				})
				.eq('id', data.user.id)

			if (updateError) throw updateError

			successMessage = 'プロフィールを更新しました'

			// 成功メッセージを3秒後に消す
			setTimeout(() => {
				successMessage = ''
			}, 3000)

		} catch (err: any) {
			error = `保存エラー: ${err.message}`
			console.error('Save profile error:', err)
		} finally {
			saving = false
		}
	}
</script>

<svelte:head>
	<title>講師プロフィール編集 | 講師ダッシュボード</title>
</svelte:head>

{#if loading}
	<div class="flex justify-center items-center min-h-screen">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else}
	<div class="max-w-4xl mx-auto">
		<div class="bg-white rounded-lg shadow-sm">
			<!-- Header -->
			<div class="border-b border-gray-200 px-6 py-4">
				<h2 class="text-2xl font-bold text-gray-900">講師プロフィール</h2>
				<p class="text-sm text-gray-500 mt-1">あなたの講師情報を編集します。この情報はスペースやコースページに表示されます。</p>
			</div>

			<!-- Content -->
			<div class="px-6 py-6 space-y-6">
				<!-- エラーメッセージ -->
				{#if error}
					<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
						{error}
					</div>
				{/if}

				<!-- 成功メッセージ -->
				{#if successMessage}
					<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
						{successMessage}
					</div>
				{/if}

				<!-- アバター画像 -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						プロフィール画像
					</label>
					<div class="flex items-center space-x-6">
						<div class="flex-shrink-0">
							{#if avatarPreview}
								<img src={avatarPreview} alt="Avatar" class="h-24 w-24 rounded-full object-cover border-2 border-gray-300" />
							{:else}
								<div class="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
									<svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
									</svg>
								</div>
							{/if}
						</div>
						<div class="flex-1">
							<label class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
								{#if uploadingAvatar}
									<svg class="animate-spin h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
									</svg>
									アップロード中...
								{:else}
									<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
									</svg>
									画像をアップロード
								{/if}
								<input type="file" accept="image/*" on:change={handleAvatarUpload} class="hidden" disabled={uploadingAvatar} />
							</label>
							<p class="text-xs text-gray-500 mt-2">JPG、PNG、GIF（最大5MB）</p>
						</div>
					</div>
				</div>

				<!-- 表示名 -->
				<div>
					<label for="displayName" class="block text-sm font-medium text-gray-700 mb-2">
						表示名 <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="displayName"
						bind:value={displayName}
						placeholder="山田 太郎"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						required
					/>
					<p class="text-xs text-gray-500 mt-1">コースやスペースに表示される名前です</p>
				</div>

				<!-- 自己紹介 -->
				<div>
					<label for="bio" class="block text-sm font-medium text-gray-700 mb-2">
						自己紹介
					</label>
					<textarea
						id="bio"
						bind:value={bio}
						rows="5"
						placeholder="あなたの経歴、専門分野、教育理念などを記入してください..."
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
					></textarea>
					<p class="text-xs text-gray-500 mt-1">講師紹介セクションに表示されます</p>
				</div>

				<!-- SNSリンク -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">SNS・Webサイト</h3>
					<div class="space-y-4">
						<!-- Twitter -->
						<div>
							<label for="twitter" class="block text-sm font-medium text-gray-700 mb-2">
								<svg class="inline-block h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
									<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
								</svg>
								Twitter
							</label>
							<input
								type="url"
								id="twitter"
								bind:value={socialLinks.twitter}
								placeholder="https://twitter.com/username"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						<!-- Facebook -->
						<div>
							<label for="facebook" class="block text-sm font-medium text-gray-700 mb-2">
								<svg class="inline-block h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
									<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
								</svg>
								Facebook
							</label>
							<input
								type="url"
								id="facebook"
								bind:value={socialLinks.facebook}
								placeholder="https://facebook.com/username"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						<!-- Instagram -->
						<div>
							<label for="instagram" class="block text-sm font-medium text-gray-700 mb-2">
								<svg class="inline-block h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
								</svg>
								Instagram
							</label>
							<input
								type="url"
								id="instagram"
								bind:value={socialLinks.instagram}
								placeholder="https://instagram.com/username"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						<!-- LinkedIn -->
						<div>
							<label for="linkedin" class="block text-sm font-medium text-gray-700 mb-2">
								<svg class="inline-block h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
									<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
								</svg>
								LinkedIn
							</label>
							<input
								type="url"
								id="linkedin"
								bind:value={socialLinks.linkedin}
								placeholder="https://linkedin.com/in/username"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						<!-- YouTube -->
						<div>
							<label for="youtube" class="block text-sm font-medium text-gray-700 mb-2">
								<svg class="inline-block h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
									<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
								</svg>
								YouTube
							</label>
							<input
								type="url"
								id="youtube"
								bind:value={socialLinks.youtube}
								placeholder="https://youtube.com/@username"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						<!-- Website -->
						<div>
							<label for="website" class="block text-sm font-medium text-gray-700 mb-2">
								<svg class="inline-block h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
								</svg>
								Webサイト
							</label>
							<input
								type="url"
								id="website"
								bind:value={socialLinks.website}
								placeholder="https://example.com"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 px-6 py-4 flex justify-end">
				<button
					on:click={handleSave}
					disabled={saving}
					class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if saving}
						<svg class="inline-block animate-spin h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
						</svg>
						保存中...
					{:else}
						保存
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
