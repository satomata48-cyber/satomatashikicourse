<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	import { onMount } from 'svelte'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	let userId: string | null = null
	let redirecting = false
	
	// リアクティブ文でリダイレクト処理
	$: if (username === 'undefined' && !redirecting) {
		redirecting = true
		handleUndefinedUsername()
	}
	
	async function handleUndefinedUsername() {
		try {
			const { data: { user } } = await supabase.auth.getUser()
			if (user) {
				const { data: profileData } = await supabase
					.from('profiles')
					.select('username')
					.eq('id', user.id)
					.single()
				
				if (profileData?.username) {
					goto(`/${profileData.username}/spaces/create`)
					return
				} else {
					goto('/profile/setup')
					return
				}
			} else {
				goto('/login')
				return
			}
		} catch (err) {
			console.error('Redirect error:', err)
			goto('/login')
		}
	}
	
	let formData = {
		title: '',
		description: '',
		slug: '',
		maxStudents: 1000,
		themeColor: '#2563eb' // デフォルト: マテリアルブルー
	}
	let loading = false
	let error = ''
	let slugError = ''

	// テーマカラーのプリセット
	const colorPresets = [
		{ name: 'ブルー', color: '#2563eb' },
		{ name: 'インディゴ', color: '#4f46e5' },
		{ name: 'パープル', color: '#7c3aed' },
		{ name: 'ピンク', color: '#db2777' },
		{ name: 'レッド', color: '#dc2626' },
		{ name: 'オレンジ', color: '#ea580c' },
		{ name: 'イエロー', color: '#ca8a04' },
		{ name: 'グリーン', color: '#16a34a' },
		{ name: 'ティール', color: '#0d9488' },
		{ name: 'シアン', color: '#0891b2' }
	]
	
	$: {
		// タイトルからスラッグを自動生成
		if (formData.title) {
			const generatedSlug = formData.title
				.toLowerCase()
				.replace(/[^\w\s-]/g, '') // 特殊文字を除去
				.replace(/\s+/g, '-') // スペースをハイフンに
				.replace(/--+/g, '-') // 連続ハイフンを1つに
				.trim()
			
			if (!formData.slug || formData.slug === generatedSlug) {
				formData.slug = generatedSlug
			}
		}
	}
	
	async function validateSlug() {
		if (!formData.slug) {
			slugError = 'スラッグは必須です'
			return false
		}
		
		if (!/^[a-zA-Z0-9_-]+$/.test(formData.slug)) {
			slugError = 'スラッグは英数字、アンダースコア、ハイフンのみ使用可能です'
			return false
		}
		
		// ユーザーIDを取得
		if (!userId) {
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('id')
				.eq('username', username)
				.single()
			
			if (profileError || !profileData) {
				slugError = 'ユーザーが見つかりません'
				return false
			}
			userId = profileData.id
		}
		
		// 重複チェック
		const { data: existingSpace } = await supabase
			.from('spaces')
			.select('id')
			.eq('instructor_id', userId)
			.eq('slug', formData.slug)
			.single()
		
		if (existingSpace) {
			slugError = 'このスラッグは既に使用されています'
			return false
		}
		
		slugError = ''
		return true
	}
	
	async function handleSubmit() {
		loading = true
		error = ''
		
		try {
			const isValidSlug = await validateSlug()
			if (!isValidSlug) {
				loading = false
				return
			}
			
			const { data: space, error: createError } = await supabase
				.from('spaces')
				.insert({
					instructor_id: userId,
					title: formData.title,
					description: formData.description,
					slug: formData.slug,
					max_students: formData.maxStudents,
					is_public: true,  // デフォルトで公開
					is_active: true,    // デフォルトでアクティブ
					landing_page_content: {
						title: formData.title,
						description: formData.description,
						theme: {
							primaryColor: formData.themeColor,
							accentColor: formData.themeColor
						},
						sections: [
							{
								id: '1',
								type: 'header',
								title: 'ヘッダー',
								content: 'スペース名とナビゲーションを表示',
								imageUrl: '',
								buttonText: '',
								buttonUrl: '',
								backgroundColor: '#ffffff',
								textColor: '#111827'
							},
							{
								id: '2',
								type: 'hero',
								title: formData.title,
								content: formData.description || '最高の学習体験をお届けします。プロフェッショナルな指導で、あなたのスキルを次のレベルへ。',
								buttonText: '今すぐ無料で始める',
								buttonUrl: `/${username}/space/${formData.slug}/enroll`,
								imageUrl: '',
								backgroundColor: formData.themeColor,
								textColor: '#ffffff'
							},
							{
								id: '3',
								type: 'features',
								title: 'このコースで得られること',
								content: '• 実践的なスキル: すぐに使える知識とテクニック\n• プロフェッショナルな指導: 業界経験豊富な講師による丁寧なサポート\n• 柔軟な学習: 自分のペースで、いつでもどこでも学習可能\n• 実績あるカリキュラム: 多くの受講生が成果を実感',
								imageUrl: '',
								buttonText: '',
								buttonUrl: '',
								backgroundColor: '#ffffff',
								textColor: '#111827'
							},
							{
								id: '4',
								type: 'courses',
								title: '提供コース',
								content: '初心者から上級者まで、レベルに合わせた質の高いコンテンツをご用意しています',
								imageUrl: '',
								buttonText: '',
								buttonUrl: '',
								backgroundColor: '#ffffff',
								textColor: '#111827'
							},
							{
								id: '5',
								type: 'instructor',
								title: '講師紹介',
								content: '10年以上の実務経験を持つプロフェッショナル。これまで1000名以上の受講生を指導し、多くの成功事例を生み出してきました。実践的な知識と分かりやすい指導で、あなたの学習をサポートします。',
								imageUrl: '',
								buttonText: '',
								buttonUrl: '',
								backgroundColor: '#ffffff',
								textColor: '#111827'
							},
							{
								id: '6',
								type: 'faq',
								title: 'よくある質問',
								content: 'Q: 初心者でも大丈夫ですか？\nA: はい、基礎から丁寧に解説しますので初心者の方でも安心して学習できます。\n\nQ: どのくらいの期間で習得できますか？\nA: 個人差はありますが、多くの方が3〜6ヶ月で基礎を習得されています。\n\nQ: サポートはありますか？\nA: はい、質問対応やフィードバックなど充実したサポート体制を整えています。',
								imageUrl: '',
								buttonText: '',
								buttonUrl: '',
								backgroundColor: '#ffffff',
								textColor: '#111827'
							},
							{
								id: '7',
								type: 'cta',
								title: '今すぐ学習を始めませんか？',
								content: '無料登録で、すぐにコースをご覧いただけます。あなたの成長をサポートします。',
								buttonText: '無料で始める',
								buttonUrl: `/${username}/space/${formData.slug}/enroll`,
								imageUrl: '',
								backgroundColor: '#ffffff',
								textColor: '#111827'
							},
							{
								id: '8',
								type: 'footer',
								title: 'フッター',
								content: `© ${new Date().getFullYear()} ${formData.title}. All rights reserved.`,
								imageUrl: '',
								buttonText: '',
								buttonUrl: '',
								backgroundColor: '#ffffff',
								textColor: '#111827'
							}
						]
					}
				})
				.select()
				.single()
			
			if (createError) throw createError
			
			goto(`/${username}/spaces/${space.slug}`)
		} catch (err: any) {
			error = err.message
			console.error('Space creation error:', err)
		} finally {
			loading = false
		}
	}
</script>

<div>
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900 mb-2">新規スペース作成</h2>
		<p class="text-gray-600">生徒が学習するためのスペースを作成します</p>
	</div>

	<div class="flex gap-6">
		<!-- 左: フォーム -->
		<div class="w-1/2">
		<div class="bg-white rounded-lg shadow p-6">
			{#if error}
				<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
					{error}
				</div>
			{/if}
			
			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<div>
					<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
						スペース名 *
					</label>
					<input
						id="title"
						type="text"
						bind:value={formData.title}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="例: プログラミング基礎講座"
					/>
					<p class="mt-1 text-sm text-gray-500">
						生徒に表示されるスペースの名前です
					</p>
				</div>
				
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
						説明
					</label>
					<textarea
						id="description"
						bind:value={formData.description}
						rows="4"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
						placeholder="スペースの内容や目標について説明してください"
					></textarea>
				</div>
				
				<div>
					<label for="slug" class="block text-sm font-medium text-gray-700 mb-2">
						スラッグ (URL用) *
					</label>
					<div class="flex">
						<span class="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-lg">
							/{username}/space/
						</span>
						<input
							id="slug"
							type="text"
							bind:value={formData.slug}
							on:blur={validateSlug}
							required
							class="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="programming-basics"
						/>
					</div>
					{#if slugError}
						<p class="mt-1 text-sm text-red-600">{slugError}</p>
					{:else}
						<p class="mt-1 text-sm text-gray-500">
							英数字、アンダースコア、ハイフンのみ使用可能です
						</p>
					{/if}
				</div>
				
				<div>
					<label for="maxStudents" class="block text-sm font-medium text-gray-700 mb-2">
						最大生徒数
					</label>
					<input
						id="maxStudents"
						type="number"
						bind:value={formData.maxStudents}
						min="1"
						max="10000"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<p class="mt-1 text-sm text-gray-500">
						このスペースに参加できる最大生徒数を設定します
					</p>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						テーマカラー
					</label>
					<div class="grid grid-cols-5 gap-2 mb-3">
						{#each colorPresets as preset}
							<button
								type="button"
								on:click={() => formData.themeColor = preset.color}
								class="relative h-10 rounded-lg border-2 transition-all hover:scale-105"
								class:border-gray-900={formData.themeColor === preset.color}
								class:border-gray-300={formData.themeColor !== preset.color}
								style="background-color: {preset.color}"
								title={preset.name}
							>
								{#if formData.themeColor === preset.color}
									<div class="absolute inset-0 flex items-center justify-center">
										<svg class="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
										</svg>
									</div>
								{/if}
							</button>
						{/each}
					</div>
					<div class="flex items-center space-x-2">
						<label for="customColor" class="text-sm text-gray-600">カスタム:</label>
						<input
							id="customColor"
							type="color"
							bind:value={formData.themeColor}
							class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
						/>
						<span class="text-sm text-gray-500">{formData.themeColor}</span>
					</div>
					<p class="mt-2 text-sm text-gray-500">
						ヒーローセクションの背景色として使用されます
					</p>
				</div>

				<div class="flex space-x-4 pt-4">
					<button
						type="button"
						on:click={() => goto(`/${username}/spaces`)}
						class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
					>
						キャンセル
					</button>
					<button
						type="submit"
						disabled={loading || !!slugError}
						class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? '作成中...' : 'スペースを作成'}
					</button>
				</div>
			</form>
		</div>
		</div>

		<!-- 右: プレビュー -->
		<div class="w-1/2">
			<div class="bg-white rounded-lg shadow overflow-hidden sticky top-6">
				<div class="bg-gray-50 border-b border-gray-200 px-4 py-3">
					<h3 class="text-sm font-semibold text-gray-900">プレビュー</h3>
				</div>
				<div class="overflow-y-auto max-h-[calc(100vh-200px)]">
					<!-- ヘッダー -->
					<nav class="bg-white shadow-sm border-b">
						<div class="px-6 py-4">
							<div class="flex justify-between items-center">
								<div class="flex items-center space-x-2">
									<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background-color: {formData.themeColor}">
										<span class="text-white font-bold text-sm">{formData.title ? formData.title.charAt(0) : 'S'}</span>
									</div>
									<span class="text-gray-900 font-medium">{formData.title || 'スペース名'}</span>
								</div>
								<div class="flex items-center space-x-4">
									<button class="text-gray-600 font-medium text-sm">ログイン</button>
									<button class="text-white px-4 py-2 rounded-lg font-medium text-sm" style="background-color: {formData.themeColor}">生徒登録</button>
								</div>
							</div>
						</div>
					</nav>

					<!-- ヒーロー -->
					<section class="text-white py-12" style="background-color: {formData.themeColor}">
						<div class="px-6 text-center">
							<h1 class="text-3xl font-bold mb-3">{formData.title || 'あなたのコースタイトル'}</h1>
							<p class="text-lg opacity-90 mb-4">{formData.description || 'このコースで学べることの魅力的な説明を書きましょう'}</p>
							<button class="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold">
								今すぐ無料で始める
							</button>
						</div>
					</section>

					<!-- 特徴リスト -->
					<section class="py-8 bg-white">
						<div class="px-6">
							<h2 class="text-2xl font-bold text-gray-900 text-center mb-6">このコースで得られること</h2>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
								<!-- Feature 1 -->
								<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
									<div class="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style="background-color: {formData.themeColor}">
										<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
										</svg>
									</div>
									<h3 class="text-base font-semibold text-gray-900 mb-1">実践的なスキル</h3>
									<p class="text-xs text-gray-600">すぐに使える知識とテクニック</p>
								</div>
								<!-- Feature 2 -->
								<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
									<div class="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style="background-color: {formData.themeColor}">
										<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
										</svg>
									</div>
									<h3 class="text-base font-semibold text-gray-900 mb-1">プロフェッショナルな指導</h3>
									<p class="text-xs text-gray-600">業界経験豊富な講師による丁寧なサポート</p>
								</div>
								<!-- Feature 3 -->
								<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
									<div class="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style="background-color: {formData.themeColor}">
										<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
										</svg>
									</div>
									<h3 class="text-base font-semibold text-gray-900 mb-1">柔軟な学習</h3>
									<p class="text-xs text-gray-600">自分のペースで、いつでもどこでも学習可能</p>
								</div>
								<!-- Feature 4 -->
								<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
									<div class="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style="background-color: {formData.themeColor}">
										<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
										</svg>
									</div>
									<h3 class="text-base font-semibold text-gray-900 mb-1">実績あるカリキュラム</h3>
									<p class="text-xs text-gray-600">多くの受講生が成果を実感</p>
								</div>
							</div>
						</div>
					</section>

					<!-- コース一覧 -->
					<section class="py-8 bg-white">
						<div class="px-6">
							<div class="text-center mb-6">
								<h2 class="text-2xl font-bold text-gray-900 mb-2">提供コース</h2>
								<p class="text-gray-600">質の高い学習コンテンツをご用意しています</p>
							</div>
							<div class="bg-gray-100 rounded-lg p-4">
								<p class="text-sm text-gray-500 text-center">コースは作成後に追加できます</p>
							</div>
						</div>
					</section>

					<!-- 講師紹介 -->
					<section class="py-8 bg-white">
						<div class="px-6">
							<div class="text-center">
								<h2 class="text-2xl font-bold text-gray-900 mb-4">講師紹介</h2>
								<div class="flex flex-col items-center">
									<div class="h-20 w-20 rounded-full bg-gray-300 mb-3"></div>
									<h3 class="text-lg font-semibold text-gray-900 mb-2">講師名</h3>
									<p class="text-sm text-gray-600 max-w-md">10年以上の実務経験を持つプロフェッショナル。これまで1000名以上の受講生を指導し、多くの成功事例を生み出してきました。</p>
								</div>
							</div>
						</div>
					</section>

					<!-- FAQ -->
					<section class="py-8 bg-white">
						<div class="px-6">
							<h2 class="text-2xl font-bold text-gray-900 text-center mb-6">よくある質問</h2>
							<div class="max-w-2xl mx-auto space-y-3">
								<div class="p-4 bg-gray-50 rounded-lg">
									<p class="text-sm font-semibold text-gray-900 mb-1">Q: 初心者でも大丈夫ですか？</p>
									<p class="text-sm text-gray-600">A: はい、基礎から丁寧に解説しますので初心者の方でも安心して学習できます。</p>
								</div>
								<div class="p-4 bg-gray-50 rounded-lg">
									<p class="text-sm font-semibold text-gray-900 mb-1">Q: どのくらいの期間で習得できますか？</p>
									<p class="text-sm text-gray-600">A: 個人差はありますが、多くの方が3〜6ヶ月で基礎を習得されています。</p>
								</div>
								<div class="p-4 bg-gray-50 rounded-lg">
									<p class="text-sm font-semibold text-gray-900 mb-1">Q: サポートはありますか？</p>
									<p class="text-sm text-gray-600">A: はい、質問対応やフィードバックなど充実したサポート体制を整えています。</p>
								</div>
							</div>
						</div>
					</section>

					<!-- CTA -->
					<section class="py-8 bg-white">
						<div class="px-6 text-center">
							<h2 class="text-2xl font-bold text-gray-900 mb-2">今すぐ学習を始めませんか？</h2>
							<p class="text-gray-600 mb-4">無料登録で、すぐにコースをご覧いただけます。あなたの成長をサポートします。</p>
							<button class="text-white px-6 py-3 rounded-lg font-semibold" style="background-color: {formData.themeColor}">
								無料で始める
							</button>
						</div>
					</section>

					<!-- フッター -->
					<footer class="py-6 bg-white border-t border-gray-200">
						<div class="px-6">
							<p class="text-sm text-gray-600 text-center">© {new Date().getFullYear()} {formData.title || 'Your Company'}. All rights reserved.</p>
						</div>
					</footer>
				</div>
			</div>
		</div>
	</div>
</div>