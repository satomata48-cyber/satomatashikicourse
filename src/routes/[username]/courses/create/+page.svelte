<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: spaceIdParam = $page.url.searchParams.get('space_id')
	
	let spaces: any[] = []
	let instructorId: string | null = null
	let redirecting = false
	let formData = {
		spaceId: spaceIdParam || '',
		title: '',
		description: '',
		slug: '',
		isFree: true,
		price: 0,
		currency: 'JPY',
		isPublished: false
	}
	let loading = false
	let error = ''
	let slugError = ''
	let themeColor = '#3B82F6' // デフォルト
	
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
					goto(`/${profileData.username}/courses/create`)
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
	
	onMount(async () => {
		if (username !== 'undefined') {
			await loadInstructorData()
			await loadSpaces()
		}
	})
	
	async function loadInstructorData() {
		try {
			// usernameからinstructor_idを取得
			const { data: profileData, error: profileError } = await supabase
				.from('profiles')
				.select('id')
				.eq('username', username)
				.single()
			
			if (profileError || !profileData) {
				throw new Error('講師が見つかりません')
			}
			
			instructorId = profileData.id
		} catch (err: any) {
			error = err.message
			console.error('Load instructor data error:', err)
		}
	}
	
	async function loadSpaces() {
		try {
			if (!instructorId) return
			
			const { data: spacesData, error: spacesError } = await supabase
				.from('spaces')
				.select('id, title, slug, landing_page_content')
				.eq('instructor_id', instructorId)
				.order('title', { ascending: true })

			if (spacesError) throw spacesError
			spaces = spacesData || []
			
			// URLパラメータのspace_idが有効か確認
			if (spaceIdParam && !spaces.some(s => s.id === spaceIdParam)) {
				formData.spaceId = ''
			}
		} catch (err: any) {
			error = err.message
		}
	}
	
	$: {
		// タイトルからスラッグを自動生成
		if (formData.title) {
			const generatedSlug = formData.title
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-')
				.replace(/--+/g, '-')
				.trim()

			if (!formData.slug || formData.slug === generatedSlug) {
				formData.slug = generatedSlug
			}
		}
	}

	// スペースが選択されたらテーマカラーを更新
	$: if (formData.spaceId && spaces.length > 0) {
		const selectedSpace = spaces.find(s => s.id === formData.spaceId)
		if (selectedSpace?.landing_page_content?.theme?.primaryColor) {
			themeColor = selectedSpace.landing_page_content.theme.primaryColor
		} else {
			themeColor = '#3B82F6'
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
		
		if (!formData.spaceId) {
			slugError = ''
			return true
		}
		
		// 同一スペース内での重複チェック
		const { data: existingCourses } = await supabase
			.from('courses')
			.select('id')
			.eq('space_id', formData.spaceId)
			.eq('slug', formData.slug)

		if (existingCourses && existingCourses.length > 0) {
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
			if (!formData.spaceId) {
				throw new Error('スペースを選択してください')
			}

			if (!formData.title.trim()) {
				throw new Error('コース名を入力してください')
			}

			// スラッグバリデーション
			const isValidSlug = await validateSlug()
			if (!isValidSlug) {
				loading = false
				return
			}

			// スラッグを生成（フォームで編集されたものを使用）
			let slug = formData.slug.trim()

			// slugが空の場合は、タイトルから生成
			if (!slug) {
				slug = formData.title
					.toLowerCase()
					.replace(/[^\w\s-]/g, '')
					.replace(/\s+/g, '-')
					.replace(/--+/g, '-')
					.trim()
			}

			// それでも空の場合はUUIDの一部を使用
			if (!slug) {
				slug = `course-${Date.now()}`
			}

			// 理想構成のセクション定義
			const idealSections = [
				{
					id: Date.now().toString() + '-1',
					type: 'space-header',
					title: 'ヘッダー',
					content: 'スペースのヘッダーが自動的に表示されます',
					backgroundColor: '#ffffff',
					textColor: '#111827'
				},
				{
					id: Date.now().toString() + '-2',
					type: 'course-info',
					title: 'コース基本情報',
					content: 'コースの基本情報が自動的に表示されます',
					backgroundColor: '#ffffff',
					textColor: '#111827'
				},
				{
					id: Date.now().toString() + '-3',
					type: 'lessons-list',
					title: 'レッスン一覧',
					content: 'レッスン管理ページと連動して自動表示されます',
					backgroundColor: '#ffffff',
					textColor: '#111827'
				},
				{
					id: Date.now().toString() + '-4',
					type: 'overview',
					title: 'コースの概要',
					content: `${formData.title}では、実践的なスキルを基礎から応用まで体系的に学ぶことができます。\n\n${formData.description || '初心者の方でも安心して受講いただけるよう、丁寧な解説と実践的な演習を用意しています。'}`,
					backgroundColor: '#ffffff',
					textColor: '#111827'
				},
				{
					id: Date.now().toString() + '-5',
					type: 'learning-outcomes',
					title: 'このコースで学べること',
					content: '学習内容をリスト形式で表示します',
					backgroundColor: '#f9fafb',
					textColor: '#111827',
					features: [
						{ icon: '📚', title: '体系的な学習', description: '基礎から応用まで段階的に学習できます' },
						{ icon: '🎯', title: '実践プロジェクト', description: '実際のプロジェクトを通じて経験を積めます' },
						{ icon: '💡', title: '実務スキル', description: '現場で即戦力となるスキルを習得できます' },
						{ icon: '⭐', title: 'ベストプラクティス', description: '業界標準のアプローチを学べます' }
					]
				},
				{
					id: Date.now().toString() + '-6',
					type: 'features',
					title: 'このコースの特徴',
					content: '特徴をリスト形式で表示します',
					backgroundColor: '#ffffff',
					textColor: '#111827',
					features: [
						{ icon: '⏰', title: '自分のペースで学習', description: 'いつでもどこでも好きな時間に学習できます' },
						{ icon: '🎓', title: '実践重視のカリキュラム', description: 'すぐに使える実用的な内容が満載です' },
						{ icon: '👥', title: '充実のサポート', description: '質問対応やフィードバックが充実しています' },
						{ icon: '💼', title: '実務で使えるスキル', description: '現場で即戦力となる知識を習得できます' }
					]
				},
				{
					id: Date.now().toString() + '-7',
					type: 'target-audience',
					title: 'こんな方におすすめ',
					content: '• これから学習を始めたい初心者の方\n• 基礎を体系的に学び直したい方\n• 実践的なスキルを身につけたい方\n• キャリアアップを目指している方',
					backgroundColor: '#f9fafb',
					textColor: '#111827'
				},
				{
					id: Date.now().toString() + '-8',
					type: 'prerequisites',
					title: '前提知識',
					content: 'このコースの受講にあたって、特別な前提知識は必要ありません。\n\n以下があると理解がスムーズです：\n• 基本的なPC操作\n• インターネットの基礎知識',
					backgroundColor: '#ffffff',
					textColor: '#111827'
				},
				{
					id: Date.now().toString() + '-9',
					type: 'faq',
					title: 'よくある質問',
					content: 'Q: 初心者でも受講できますか？\nA: はい、基礎から丁寧に解説しますので初心者の方でも安心して受講いただけます。\n\nQ: どのくらいの期間で完了できますか？\nA: 個人差はありますが、週3-5時間の学習で2-3ヶ月程度で完了できる内容です。\n\nQ: 質問はできますか？\nA: はい、コース内の質問機能からいつでも質問いただけます。',
					backgroundColor: '#ffffff',
					textColor: '#111827'
				},
				{
					id: Date.now().toString() + '-10',
					type: 'cta',
					title: '今すぐ始めましょう',
					content: 'このコースで、あなたのスキルを次のレベルへ引き上げませんか？',
					buttonText: formData.isFree ? '今すぐ受講開始' : '今すぐ購入',
					buttonUrl: '#',
					backgroundColor: '#f9fafb',
					textColor: '#111827'
				}
			]

			const courseData = {
				space_id: formData.spaceId,
				title: formData.title,
				description: formData.description,
				slug: slug,
				is_free: formData.isFree,
				price: formData.isFree ? 0 : formData.price,
				currency: formData.currency,
				is_published: formData.isPublished,
				course_page_content: {
					sections: idealSections,
					metadata: {
						title: formData.title,
						description: formData.description || `${formData.title}で新しいスキルを習得`,
						seoTitle: `${formData.title} | オンラインコース`,
						seoDescription: formData.description || `${formData.title}で新しいスキルを身に付けませんか？`,
						createdWith: 'ideal-template'
					}
				}
			}
			
			// Stripe価格設定（有料の場合は後で実装）
			if (!formData.isFree) {
				// TODO: Stripe Price作成ロジック
			}
			
			console.log('Course data to insert:', courseData)
			
			const { data: course, error: createError } = await supabase
				.from('courses')
				.insert(courseData)
				.select()
				.single()
			
			console.log('Insert result:', { course, createError })
			
			if (createError) {
				console.error('Supabase insert error:', createError)
				throw createError
			}
			
			goto(`/${username}/courses`)
		} catch (err: any) {
			error = err.message || 'コース作成に失敗しました'
			console.error('Course creation error:', err)
			console.error('Error details:', JSON.stringify(err, null, 2))
		} finally {
			loading = false
		}
	}
</script>

<div>
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900 mb-2">新規コース作成</h2>
		<p class="text-gray-600">スペース内で販売するコースを作成します</p>
	</div>

	<!-- 2カラムレイアウト -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- 左側：フォーム -->
		<div>
		<div class="bg-white rounded-lg shadow p-6">
			{#if error}
				<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
					{error}
				</div>
			{/if}
			
			{#if spaces.length === 0}
				<div class="text-center py-8">
					<p class="text-gray-600 mb-4">コースを作成するには、まずスペースが必要です。</p>
					<a
						href="/{username}/spaces/create"
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
					>
						スペースを作成
					</a>
				</div>
			{:else}
				<form on:submit|preventDefault={handleSubmit} class="space-y-6">
					<div>
						<label for="spaceId" class="block text-sm font-medium text-gray-700 mb-2">
							所属スペース *
						</label>
						<select
							id="spaceId"
							bind:value={formData.spaceId}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							<option value="">スペースを選択してください</option>
							{#each spaces as space}
								<option value={space.id}>{space.title}</option>
							{/each}
						</select>
					</div>
					
					<div>
						<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
							コース名 *
						</label>
						<input
							id="title"
							type="text"
							bind:value={formData.title}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="例: JavaScript基礎講座"
						/>
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
							placeholder="コースの内容や学習目標について説明してください"
						></textarea>
					</div>
					
					<div>
						<label for="slug" class="block text-sm font-medium text-gray-700 mb-2">
							スラッグ (URL用) *
						</label>
						{#key formData.spaceId}
							{@const selectedSpace = spaces.find(s => s.id === formData.spaceId)}
							<div class="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
								<!-- スペースのslugプレフィックス -->
								<div class="px-3 py-2 bg-gray-100 text-gray-600 text-sm border-r border-gray-300 whitespace-nowrap">
									{#if selectedSpace}
										/{username}/space/{selectedSpace.slug}/course/
									{:else}
										/[username]/space/[space-slug]/course/
									{/if}
								</div>
								<!-- スラッグ入力 -->
								<input
									id="slug"
									type="text"
									bind:value={formData.slug}
									on:blur={validateSlug}
									required
									class="flex-1 px-3 py-2 border-0 focus:ring-0 focus:outline-none"
									placeholder="your-course-slug"
								/>
							</div>
							{#if slugError}
								<p class="mt-1 text-sm text-red-600">{slugError}</p>
							{:else}
								<p class="mt-1 text-sm text-gray-500">
									英数字、アンダースコア、ハイフンのみ使用可能です
								</p>
							{/if}
							{#if formData.spaceId && formData.slug && selectedSpace}
								<div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
									<p class="text-xs text-blue-700 font-medium mb-1">完全なURL:</p>
									<p class="text-sm text-blue-900 break-all font-mono">
										{window.location.origin}/{username}/space/{selectedSpace.slug}/course/{formData.slug}
									</p>
								</div>
							{/if}
						{/key}
					</div>

					<!-- 推定学習時間フィールドは削除（データベースにカラムが存在しないため） -->

					<!-- 価格設定 -->
					<div class="border-t border-gray-200 pt-6">
						<h3 class="text-lg font-medium text-gray-900 mb-4">価格設定</h3>
						
						<div class="space-y-4">
							<div class="flex items-center">
								<input
									id="isFree"
									type="checkbox"
									bind:checked={formData.isFree}
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label for="isFree" class="ml-2 block text-sm text-gray-900">
									無料コース
								</label>
							</div>
							
							{#if !formData.isFree}
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="price" class="block text-sm font-medium text-gray-700 mb-2">
											価格
										</label>
										<input
											id="price"
											type="number"
											bind:value={formData.price}
											min="0"
											step="100"
											required={!formData.isFree}
											class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
									<div>
										<label for="currency" class="block text-sm font-medium text-gray-700 mb-2">
											通貨
										</label>
										<select
											id="currency"
											bind:value={formData.currency}
											class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										>
											<option value="JPY">日本円 (JPY)</option>
											<option value="USD">米ドル (USD)</option>
										</select>
									</div>
								</div>
							{/if}
						</div>
					</div>
					
					<!-- 公開設定 -->
					<div class="border-t border-gray-200 pt-6">
						<div class="flex items-center">
							<input
								id="isPublished"
								type="checkbox"
								bind:checked={formData.isPublished}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isPublished" class="ml-2 block text-sm text-gray-900">
								すぐに公開する
							</label>
						</div>
						<p class="mt-1 text-sm text-gray-500">
							チェックを外した場合、後から公開設定を変更できます
						</p>
					</div>
					
					<div class="flex space-x-4 pt-4">
						<button
							type="button"
							on:click={() => goto(`/${username}/courses`)}
							class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							キャンセル
						</button>
						<button
							type="submit"
							disabled={loading || !!slugError}
							class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? '作成中...' : 'コースを作成'}
						</button>
					</div>
				</form>
			{/if}
		</div>
		</div>

		<!-- 右側：プレビュー -->
		<div class="lg:sticky lg:top-24 lg:self-start">
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">プレビュー</h3>

				<!-- コースカード -->
				<div class="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
					<!-- サムネイル -->
					<div class="aspect-video bg-gray-100 flex items-center justify-center">
						<svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
						</svg>
					</div>

					<!-- コンテンツ -->
					<div class="p-6">
						<div class="flex items-center justify-between mb-3">
							<h4 class="text-xl font-bold text-gray-900">
								{formData.title || 'コースタイトル'}
							</h4>
							{#if formData.isPublished}
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
									公開
								</span>
							{:else}
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
									非公開
								</span>
							{/if}
						</div>

						<p class="text-gray-600 mb-4 line-clamp-3">
							{formData.description || 'コースの説明がここに表示されます'}
						</p>

						<!-- 価格表示 -->
						<div class="mb-4">
							{#if formData.isFree}
								<div class="inline-flex items-center px-4 py-2 rounded-lg bg-green-50 border border-green-200">
									<svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
									</svg>
									<span class="text-lg font-bold text-green-700">無料</span>
								</div>
							{:else}
								<div class="flex items-baseline">
									<span class="text-3xl font-bold text-gray-900">
										{new Intl.NumberFormat('ja-JP', {
											style: 'currency',
											currency: formData.currency
										}).format(formData.price)}
									</span>
								</div>
							{/if}
						</div>

						<!-- CTAボタン -->
						<button
							disabled
							class="w-full py-3 px-6 rounded-lg font-semibold text-white text-center disabled:opacity-60 transition-opacity"
							style="background-color: {themeColor || '#3B82F6'}"
						>
							{formData.isFree ? 'このコースを受講する' : 'このコースを購入する'}
						</button>

						<!-- 追加情報 -->
						<div class="mt-4 pt-4 border-t border-gray-200">
							<div class="flex items-center text-sm text-gray-500">
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
								</svg>
								<span>0 レッスン</span>
							</div>
						</div>
					</div>
				</div>

				<!-- 理想構成について -->
				<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<div class="flex items-start">
						<svg class="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						<div class="flex-1">
							<h4 class="text-sm font-semibold text-blue-900 mb-1">自動で理想構成を適用</h4>
							<p class="text-xs text-blue-700">
								コース作成後、理想的なページ構成（10セクション）が自動的に適用されます。ページエディターでカスタマイズできます。
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>