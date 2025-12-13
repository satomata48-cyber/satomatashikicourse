<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	export let data
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	
	let space: any = null
	let courses: any[] = []
	let instructor: any = null
	let loading = true
	let error = ''
	let isEnrolled = false
	let enrollmentStatus: string | null = null
	let student: any = null
	let checkingEnrollment = true  // 登録状況チェック中フラグ
	let instructorProfilesCache: Record<string, any> = {}
	
	// リダイレクト済みフラグ
	let hasRedirected = false
	let mounted = false
	
	onMount(() => {
		mounted = true
	})
	
	// リアクティブにパラメータが設定されたらデータを読み込み
	$: if (mounted && username && slug && username !== 'undefined' && slug !== 'undefined' && !hasRedirected) {
		loadSpaceData().then(() => {
			if (data?.user && !hasRedirected) {
				checkEnrollmentStatus()
			} else {
				// ログインしていない場合もcheckingEnrollmentをfalseに設定
				checkingEnrollment = false
			}
		})
	}
	
	async function loadSpaceData() {
		try {
			if (!username || !slug) {
				throw new Error('ユーザー名またはスラッグが無効です')
			}

			// APIからスペース情報を取得
			const response = await fetch(`/api/spaces?username=${username}&slug=${slug}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'スペースの取得に失敗しました')
			}

			if (!result.space) {
				throw new Error('スペースが見つかりません')
			}

			if (!result.space.is_active) {
				throw new Error('このスペースは現在利用できません')
			}

			space = result.space

			// 講師情報を取得（簡易的にスペースから取得）
			instructor = {
				id: space.instructor_id,
				display_name: username,
				avatar_url: null,
				bio: space.description
			}

			// コース一覧を取得
			const coursesResponse = await fetch(`/api/courses?username=${username}`)
			const coursesResult = await coursesResponse.json()

			if (coursesResponse.ok && coursesResult.courses) {
				// このスペースの公開コースのみフィルター
				courses = coursesResult.courses.filter((course: any) =>
					course.space_id === space.id && course.is_published
				)
			}

			// TODO: instructor_profiles機能は未実装
			instructorProfilesCache = {}

		} catch (err: any) {
			error = err.message
			console.error('Load space data error:', err)
		} finally {
			loading = false
		}
	}
	
	async function checkEnrollmentStatus() {
		try {
			if (!data?.user || !space) {
				// ログインしていない、またはスペース情報がない場合
				isEnrolled = false
				enrollmentStatus = null
				student = null
				return
			}

			// 登録状況チェック
			const response = await fetch(`/api/students?spaceId=${space.id}`)
			if (response.ok) {
				const result = await response.json()
				// このユーザーが登録されているか確認
				const enrollment = result.students?.find((s: any) => s.student_id === data.user.id)
				if (enrollment) {
					isEnrolled = true
					enrollmentStatus = enrollment.status
					student = data.user
				}
			}
		} catch (err) {
			console.log('Check enrollment error:', err)
		} finally {
			checkingEnrollment = false
		}
	}
	
	function formatCurrency(price: number, currency: string): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: currency
		}).format(price)
	}
	
	function formatDuration(hours: number | null): string {
		if (!hours) return ''
		if (hours < 1) return '1時間未満'
		return `約${hours}時間`
	}
	
	// ランディングページコンテンツの処理
	$: landingPageContent = space?.landing_page_content || {
		sections: [],
		metadata: {},
		theme: { primaryColor: '#3B82F6', accentColor: '#F59E0B' }
	}
	
	$: theme = landingPageContent.theme || { primaryColor: '#3B82F6', accentColor: '#F59E0B' }
</script>

<svelte:head>
	<title>{space?.title || 'Loading...'} | オンライン学習スペース</title>
	<meta name="description" content={space?.description || ''} />
	{#if theme}
		<style>
			:root {
				--primary-color: {theme.primaryColor};
				--accent-color: {theme.accentColor};
			}
		</style>
	{/if}
</svelte:head>

{#if loading}
	<div class="min-h-screen flex justify-center items-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else if error}
	<div class="min-h-screen flex justify-center items-center">
		<div class="max-w-md text-center">
			<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.598 0L4.216 15.5C3.445 16.333 4.406 18 5.946 18z"/>
			</svg>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">スペースが見つかりません</h1>
			<p class="text-gray-600">{error}</p>
		</div>
	</div>
{:else if space}
	<div class="min-h-screen bg-gray-50">
		<!-- セクションを動的に表示 -->
		{#if landingPageContent.sections && landingPageContent.sections.length > 0}
			{#each landingPageContent.sections as section}
				{#if section.type === 'header'}
					<!-- ヘッダー -->
					<nav class="shadow-sm border-b" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
						<div class="max-w-7xl mx-auto px-6 py-4">
							<div class="flex justify-between items-center">
								<div class="flex items-center space-x-2">
									<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background-color: {theme.primaryColor}">
										<span class="text-white font-bold text-sm">{space.title.charAt(0)}</span>
									</div>
									<span class="font-medium" style="color: {section.textColor || '#111827'}">{space.title}</span>
								</div>
								<div class="flex items-center space-x-4">
									{#if !checkingEnrollment}
										{#if isEnrolled && student}
											<span class="text-sm opacity-70">こんにちは、{student.display_name}さん</span>
											<a href="/{username}/space/{slug}/student" class="font-medium transition-colors hover:opacity-70" style="color: {section.textColor || '#111827'}">
												マイページ
											</a>
										{:else}
											<a href="/{username}/space/{slug}/login" class="font-medium transition-colors hover:opacity-70" style="color: {section.textColor || '#111827'}">
												ログイン
											</a>
											<a href="/{username}/space/{slug}/register" class="text-white px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90" style="background-color: {theme.primaryColor}">
												登録
											</a>
										{/if}
									{/if}
								</div>
							</div>
						</div>
					</nav>
				{:else if section.type === 'hero'}
					<!-- ヒーローセクション -->
					<section class="py-20 relative overflow-hidden text-white" style="background-color: {theme.primaryColor}">
						<div class="absolute inset-0 bg-black opacity-10"></div>
						<div class="relative container mx-auto px-6 text-center">
							<div class="max-w-4xl mx-auto">
								<h1 class="text-5xl font-bold mb-6 mt-8">{section.title}</h1>
								<p class="text-xl mb-8 opacity-90">{section.content}</p>
								{#if section.buttonText}
									<a href={section.buttonUrl || '#'} class="inline-flex items-center bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:scale-105 transition-transform duration-200">
										{section.buttonText}
										<svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
										</svg>
									</a>
								{/if}
							</div>
						</div>
					</section>
				{:else if section.type === 'courses'}
					<!-- コース一覧 -->
					{#if courses.length > 0}
						<section class="py-16" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
							<div class="container mx-auto px-6">
								<div class="text-center mb-12">
									<h2 class="text-3xl font-bold mb-4" style="color: {section.textColor || '#111827'}">{section.title}</h2>
									<p class="text-xl opacity-80">{section.content}</p>
								</div>
								<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
									{#each courses as course}
										<div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
											<div class="p-6">
												<div class="flex items-start justify-between mb-4">
													<h3 class="text-xl font-semibold text-gray-900 mb-2">{course.title}</h3>
													<div class="text-right">
														{#if course.is_free}
															<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">無料</span>
														{:else}
															<span class="text-lg font-bold text-gray-900">{formatCurrency(course.price, course.currency)}</span>
														{/if}
													</div>
												</div>
												<p class="text-gray-600 mb-4 line-clamp-3">{course.description || 'このコースについての詳細な説明をご覧いただけます。'}</p>
												<div class="flex items-center justify-between text-sm text-gray-500 mb-4">
													<div class="flex items-center space-x-4">
														<span class="flex items-center">
															<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
															</svg>
															{course.lessons?.[0]?.count || 0} レッスン
														</span>
														{#if course.estimated_duration_hours}
															<span class="flex items-center">
																<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
																</svg>
																{formatDuration(course.estimated_duration_hours)}
															</span>
														{/if}
													</div>
												</div>
												<a href="/{username}/space/{slug}/course/{course.slug || course.id}" class="block w-full text-center text-white py-3 rounded-lg font-medium transition-opacity hover:opacity-90 duration-200" style="background-color: {theme.primaryColor}">
													詳細を見る
												</a>
											</div>
										</div>
									{/each}
								</div>
							</div>
						</section>
					{/if}
				{:else if section.type === 'instructor'}
					<!-- 講師紹介 -->
					{@const selectedProfile = section.instructorProfileId ? instructorProfilesCache[section.instructorProfileId] : null}
					{@const displayProfile = selectedProfile || instructor}
					{#if displayProfile}
						<section class="py-16" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
							<div class="container mx-auto px-6">
								<div class="max-w-4xl mx-auto text-center">
									<h2 class="text-3xl font-bold mb-8" style="color: {section.textColor || '#111827'}">{section.title}</h2>
									<div class="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
										<div class="flex-shrink-0">
											{#if displayProfile.avatar_url}
												<img class="h-32 w-32 rounded-full object-cover" src={displayProfile.avatar_url} alt={displayProfile.display_name} />
											{:else}
												<div class="h-32 w-32 rounded-full bg-gray-300 flex items-center justify-center">
													<svg class="h-16 w-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
													</svg>
												</div>
											{/if}
										</div>
										<div class="flex-1 text-center md:text-left">
											<h3 class="text-2xl font-semibold mb-4" style="color: {section.textColor || '#111827'}">{displayProfile.display_name || 'Unknown Instructor'}</h3>
											{#if selectedProfile}
												<!-- 講師プロフィールが選択されている場合、そのbioを表示 -->
												<p class="leading-relaxed opacity-80">{selectedProfile.bio || section.content}</p>
												{#if section.content && selectedProfile.bio}
													<!-- bioがあって、さらにcontentがある場合は追加で表示 -->
													<p class="mt-4 leading-relaxed opacity-80">{section.content}</p>
												{/if}
											{:else}
												<!-- 講師プロフィールが選択されていない場合は従来通り -->
												<p class="leading-relaxed opacity-80">{section.content}</p>
											{/if}
										</div>
									</div>
								</div>
							</div>
						</section>
					{/if}
				{:else if section.type === 'cta'}
					<!-- CTA -->
					<section class="py-16" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
						<div class="container mx-auto px-6 text-center">
							<h2 class="text-3xl font-bold mb-4">{section.title}</h2>
							<p class="text-xl mb-8 opacity-90">{section.content}</p>
							{#if section.buttonText && !isEnrolled}
								<a href={section.buttonUrl || '#'} class="inline-flex items-center bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:scale-105 transition-transform duration-200">
									{section.buttonText}
									<svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
									</svg>
								</a>
							{/if}
						</div>
					</section>
				{:else if section.type === 'features'}
					<!-- 特徴リスト -->
					<section class="py-16" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
						<div class="container mx-auto px-6">
							<h2 class="text-3xl font-bold text-center mb-12" style="color: {section.textColor || '#111827'}">{section.title}</h2>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
								{#each section.content.split('\n').filter(line => line.trim().startsWith('•')) as feature, index}
									{@const parts = feature.replace('•', '').trim().split(':')}
									{@const featureTitle = parts[0]?.trim() || ''}
									{@const featureDesc = parts[1]?.trim() || ''}
									<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
										<div class="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style="background-color: {theme.primaryColor}">
											{#if index === 0}
												<!-- 設定アイコン -->
												<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
												</svg>
											{:else if index === 1}
												<!-- ユーザーグループアイコン -->
												<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
												</svg>
											{:else if index === 2}
												<!-- 時計アイコン -->
												<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
												</svg>
											{:else}
												<!-- チェックマーク/バッジアイコン -->
												<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
												</svg>
											{/if}
										</div>
										<h3 class="text-lg font-semibold text-gray-900 mb-2">{featureTitle}</h3>
										<p class="text-sm text-gray-600">{featureDesc}</p>
									</div>
								{/each}
							</div>
						</div>
					</section>
				{:else if section.type === 'image-text'}
					<!-- 画像+テキスト -->
					<section class="py-16" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
						<div class="container mx-auto px-6">
							<h3 class="text-3xl font-bold mb-6" style="color: {section.textColor || '#111827'}">{section.title}</h3>
							{#if section.imageUrl}
								<img src={section.imageUrl} alt={section.title} class="w-full max-w-3xl mx-auto h-64 object-cover rounded-lg mb-6" />
							{/if}
							<p class="text-lg whitespace-pre-line max-w-3xl mx-auto opacity-80">{section.content}</p>
						</div>
					</section>
				{:else if section.type === 'faq'}
					<!-- FAQ -->
					<section class="py-16" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
						<div class="container mx-auto px-6">
							<h3 class="text-3xl font-bold mb-8 text-center" style="color: {section.textColor || '#111827'}">{section.title}</h3>
							<div class="space-y-4 max-w-3xl mx-auto">
								{#each section.content.split('\n\n') as qa}
									<div class="p-6 rounded-lg" style="background-color: color-mix(in srgb, {section.backgroundColor || '#ffffff'} 95%, black)">
										<p class="whitespace-pre-line">{qa}</p>
									</div>
								{/each}
							</div>
						</div>
					</section>
				{:else if section.type === 'footer'}
					<!-- フッター -->
					<footer class="py-8" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
						<div class="container mx-auto px-6">
							<div class="max-w-7xl mx-auto">
								<div class="text-center">
									<p class="text-sm opacity-80">{section.content}</p>
								</div>
							</div>
						</div>
					</footer>
				{:else}
					<!-- デフォルト(テキスト) -->
					<section class="py-16" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
						<div class="container mx-auto px-6">
							<h3 class="text-3xl font-bold mb-6" style="color: {section.textColor || '#111827'}">{section.title}</h3>
							<p class="text-lg whitespace-pre-line max-w-3xl mx-auto opacity-80">{section.content}</p>
						</div>
					</section>
				{/if}
			{/each}
		{:else}
			<!-- デフォルト表示(セクションが未設定の場合) -->
			<nav class="bg-white shadow-sm border-b">
				<div class="max-w-7xl mx-auto px-6 py-4">
					<div class="flex justify-between items-center">
						<div class="flex items-center space-x-2">
							<div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
								<span class="text-white font-bold text-sm">{space.title.charAt(0)}</span>
							</div>
							<span class="text-gray-900 font-medium">{space.title}</span>
						</div>
						<div class="flex items-center space-x-4">
							{#if !checkingEnrollment}
								{#if isEnrolled && student}
									<span class="text-sm text-gray-600">こんにちは、{student.display_name}さん</span>
									<a href="/{username}/space/{slug}/student" class="text-gray-900 font-medium hover:text-blue-600 transition-colors">
										マイページ
									</a>
								{:else}
									<a href="/{username}/space/{slug}/login" class="text-gray-900 font-medium hover:text-blue-600 transition-colors">
										ログイン
									</a>
									<a href="/{username}/space/{slug}/register" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
										登録
									</a>
								{/if}
							{/if}
						</div>
					</div>
				</div>
			</nav>

			<section class="py-20 text-white relative overflow-hidden" style="background: linear-gradient(135deg, {theme.primaryColor}, color-mix(in srgb, {theme.primaryColor} 80%, transparent))">
				<div class="absolute inset-0 bg-black opacity-10"></div>
				<div class="relative container mx-auto px-6 text-center">
					<div class="max-w-4xl mx-auto">
						<h1 class="text-5xl font-bold mb-6 mt-8">{space.title}</h1>
						<p class="text-xl mb-8 text-white/90">{space.description}</p>
					</div>
				</div>
			</section>

			<!-- デフォルトのコース一覧 -->
			{#if courses.length > 0}
				<section class="py-16 bg-white">
					<div class="container mx-auto px-6">
						<div class="text-center mb-12">
							<h2 class="text-3xl font-bold text-gray-900 mb-4">コース一覧</h2>
							<p class="text-xl text-gray-600">提供中のコースをご覧ください</p>
						</div>
						<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
							{#each courses as course}
								<div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100">
									<div class="p-6">
										<div class="flex items-start justify-between mb-4">
											<h3 class="text-xl font-semibold text-gray-900 mb-2">{course.title}</h3>
											<div class="text-right">
												{#if course.is_free}
													<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">無料</span>
												{:else}
													<span class="text-lg font-bold text-gray-900">{formatCurrency(course.price, course.currency)}</span>
												{/if}
											</div>
										</div>
										<p class="text-gray-600 mb-4 line-clamp-3">{course.description || 'このコースについての詳細な説明をご覧いただけます。'}</p>
										<div class="flex items-center justify-between text-sm text-gray-500 mb-4">
											<div class="flex items-center space-x-4">
												<span class="flex items-center">
													<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
													</svg>
													{course.lessons?.[0]?.count || 0} レッスン
												</span>
											</div>
										</div>
										<a href="/{username}/space/{slug}/course/{course.slug || course.id}" class="block w-full text-center text-white py-3 rounded-lg font-medium transition-opacity hover:opacity-90 duration-200" style="background-color: {theme.primaryColor}">
											詳細を見る
										</a>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</section>
			{:else}
				<section class="py-16 bg-white">
					<div class="container mx-auto px-6 text-center">
						<p class="text-gray-500">現在公開中のコースはありません</p>
					</div>
				</section>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>