<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	
	let space: any = null
	let loading = true
	let saving = false
	let error = ''
	let saveMessage = ''
	let editingSection = null
	let showSectionModal = false
	
	// ページ設定
	let pageSettings = {
		title: '',
		description: '',
		theme: {
			primaryColor: '#3B82F6',
			accentColor: '#F59E0B',
			backgroundColor: '#F9FAFB',
			textColor: '#111827'
		},
		hero: {
			enabled: true,
			title: '',
			subtitle: '',
			ctaText: 'スペースを見る',
			ctaUrl: ''
		},
		sections: []
	}
	
	onMount(async () => {
		await loadSpaceData()
	})
	
	async function loadSpaceData() {
		try {
			const { data: spaceData, error: spaceError } = await supabase
				.from('spaces')
				.select('*')
				.eq('slug', slug)
				.eq('instructor_id', username)
				.single()
			
			if (spaceError) throw spaceError
			space = spaceData
			
			// 既存のランディングページ設定を読み込む
			if (space.landing_page_content) {
				pageSettings = {
					...pageSettings,
					...space.landing_page_content
				}
			} else {
				// デフォルト設定
				pageSettings.title = space.title
				pageSettings.description = space.description
				pageSettings.hero.title = space.title
				pageSettings.hero.subtitle = space.description
				pageSettings.hero.ctaUrl = `/${username}/space/${space.slug}`
			}
			
		} catch (err: any) {
			error = err.message
			console.error('Load space data error:', err)
		} finally {
			loading = false
		}
	}
	
	async function savePageSettings() {
		if (!space) return
		
		saving = true
		saveMessage = ''
		error = ''
		
		try {
			const { error: updateError } = await supabase
				.from('spaces')
				.update({
					landing_page_content: pageSettings
				})
				.eq('slug', slug)
				.eq('instructor_id', username)
			
			if (updateError) throw updateError
			
			saveMessage = '保存しました'
			setTimeout(() => {
				saveMessage = ''
			}, 3000)
			
		} catch (err: any) {
			error = err.message
			console.error('Save page settings error:', err)
		} finally {
			saving = false
		}
	}
	
	function addSection() {
		const newSection = {
			id: Date.now().toString(),
			type: 'text',
			title: '新しいセクション',
			content: 'ここにコンテンツを入力してください。',
			settings: {
				backgroundColor: '#FFFFFF',
				padding: 'normal'
			}
		}
		pageSettings.sections = [...pageSettings.sections, newSection]
		editSection(pageSettings.sections.length - 1)
	}
	
	function editSection(index) {
		editingSection = { ...pageSettings.sections[index], index }
		showSectionModal = true
	}
	
	function saveSectionEdit() {
		if (editingSection) {
			const { index, ...sectionData } = editingSection
			pageSettings.sections[index] = sectionData
			pageSettings = { ...pageSettings }
		}
		closeSectionModal()
	}
	
	function closeSectionModal() {
		editingSection = null
		showSectionModal = false
	}
	
	function removeSection(index: number) {
		pageSettings.sections = pageSettings.sections.filter((_, i) => i !== index)
	}
	
	function moveSection(index: number, direction: 'up' | 'down') {
		const newSections = [...pageSettings.sections]
		const targetIndex = direction === 'up' ? index - 1 : index + 1
		
		if (targetIndex >= 0 && targetIndex < newSections.length) {
			[newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]]
			pageSettings.sections = newSections
		}
	}
	
	function previewPage() {
		window.open(`/${username}/space/${space.slug}`, '_blank')
	}
</script>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-6xl mx-auto">
		<!-- ヘッダー -->
		<div class="bg-white border-b px-6 py-4">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">ページエディター</h1>
					<nav class="text-sm text-gray-600 mt-1">
						<a href="/{username}/dashboard" class="hover:text-blue-600">ダッシュボード</a>
						<span class="mx-2">/</span>
						<a href="/{username}/spaces" class="hover:text-blue-600">スペース</a>
						<span class="mx-2">/</span>
						<span>{space?.title || 'Loading...'}</span>
						<span class="mx-2">/</span>
						<span>エディター</span>
					</nav>
				</div>
				<div class="flex items-center space-x-3">
					{#if space}
						<button
							on:click={previewPage}
							class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
						>
							プレビュー
						</button>
					{/if}
					<button
						on:click={savePageSettings}
						disabled={saving || !space}
						class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
					>
						{saving ? '保存中...' : '保存'}
					</button>
				</div>
			</div>
		</div>
		
		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		{:else if error}
			<div class="p-6">
				<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
					{error}
				</div>
			</div>
		{:else if space}
			<!-- メイン編集エリア -->
			<div class="flex">
				<!-- 設定パネル -->
				<div class="w-80 bg-white border-r h-screen overflow-y-auto">
					<div class="p-6">
						{#if saveMessage}
							<div class="mb-4 bg-green-50 border border-green-200 text-green-600 px-3 py-2 rounded text-sm">
								{saveMessage}
							</div>
						{/if}
						
						<!-- 基本設定 -->
						<div class="mb-8">
							<h3 class="text-lg font-medium text-gray-900 mb-4">基本設定</h3>
							<div class="space-y-4">
								<div>
									<label for="page-title" class="block text-sm font-medium text-gray-700 mb-2">
										ページタイトル
									</label>
									<input
										id="page-title"
										type="text"
										bind:value={pageSettings.title}
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label for="page-description" class="block text-sm font-medium text-gray-700 mb-2">
										ページ説明
									</label>
									<textarea
										id="page-description"
										bind:value={pageSettings.description}
										rows="3"
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
									></textarea>
								</div>
							</div>
						</div>
						
						<!-- テーマ設定 -->
						<div class="mb-8">
							<h3 class="text-lg font-medium text-gray-900 mb-4">テーマ設定</h3>
							<div class="space-y-4">
								<div>
									<label for="primary-color" class="block text-sm font-medium text-gray-700 mb-2">
										プライマリカラー
									</label>
									<input
										id="primary-color"
										type="color"
										bind:value={pageSettings.theme.primaryColor}
										class="w-full h-10 border border-gray-300 rounded-lg"
									/>
								</div>
								<div>
									<label for="accent-color" class="block text-sm font-medium text-gray-700 mb-2">
										アクセントカラー
									</label>
									<input
										id="accent-color"
										type="color"
										bind:value={pageSettings.theme.accentColor}
										class="w-full h-10 border border-gray-300 rounded-lg"
									/>
								</div>
							</div>
						</div>
						
						<!-- ヒーロー設定 -->
						<div class="mb-8">
							<h3 class="text-lg font-medium text-gray-900 mb-4">ヒーローセクション</h3>
							<div class="space-y-4">
								<div class="flex items-center">
									<input
										id="hero-enabled"
										type="checkbox"
										bind:checked={pageSettings.hero.enabled}
										class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
									/>
									<label for="hero-enabled" class="ml-2 text-sm text-gray-700">
										ヒーローセクションを表示
									</label>
								</div>
								{#if pageSettings.hero.enabled}
									<div>
										<label for="hero-title" class="block text-sm font-medium text-gray-700 mb-2">
											タイトル
										</label>
										<input
											id="hero-title"
											type="text"
											bind:value={pageSettings.hero.title}
											class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>
									<div>
										<label for="hero-subtitle" class="block text-sm font-medium text-gray-700 mb-2">
											サブタイトル
										</label>
										<textarea
											id="hero-subtitle"
											bind:value={pageSettings.hero.subtitle}
											rows="3"
											class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
										></textarea>
									</div>
									<div>
										<label for="hero-cta-text" class="block text-sm font-medium text-gray-700 mb-2">
											CTAボタンテキスト
										</label>
										<input
											id="hero-cta-text"
											type="text"
											bind:value={pageSettings.hero.ctaText}
											class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
				
				<!-- プレビューエリア -->
				<div class="flex-1 p-6">
					<div class="mb-4">
						<h3 class="text-lg font-medium text-gray-900 mb-2">プレビュー</h3>
						<p class="text-sm text-gray-600">実際のページの見た目をプレビューできます</p>
					</div>
					
					<div class="bg-white border rounded-lg overflow-hidden shadow-sm" style="min-height: 600px;">
						<!-- ヒーローセクションプレビュー -->
						{#if pageSettings.hero.enabled}
							<div 
								class="py-16 px-8 text-white text-center"
								style="background: linear-gradient(135deg, {pageSettings.theme.primaryColor}, color-mix(in srgb, {pageSettings.theme.primaryColor} 80%, transparent))"
							>
								<h1 class="text-4xl font-bold mb-4">{pageSettings.hero.title}</h1>
								<p class="text-xl text-white/90 mb-8 max-w-2xl mx-auto">{pageSettings.hero.subtitle}</p>
								<a
									href={pageSettings.hero.ctaUrl}
									class="inline-block px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
									style="color: {pageSettings.theme.primaryColor}"
								>
									{pageSettings.hero.ctaText}
								</a>
							</div>
						{/if}
						
						<!-- セクション一覧 -->
						<div class="divide-y divide-gray-200">
							{#each pageSettings.sections as section, index}
								<div class="relative group">
									<div 
										class="p-8"
										style="background-color: {section.settings.backgroundColor}"
									>
										<h3 class="text-2xl font-bold mb-4" style="color: {pageSettings.theme.textColor}">
											{section.title}
										</h3>
										<div class="prose" style="color: {pageSettings.theme.textColor}">
											{@html section.content.replace(/\n/g, '<br>')}
										</div>
									</div>
									
									<!-- セクション編集ツール -->
									<div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
										<div class="flex items-center space-x-1 bg-white border rounded-lg shadow-sm p-1">
											<button
												on:click={() => editSection(index)}
												class="p-1 text-blue-600 hover:text-blue-900"
												title="編集"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
												</svg>
											</button>
											<button
												on:click={() => moveSection(index, 'up')}
												disabled={index === 0}
												class="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
												title="上に移動"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
												</svg>
											</button>
											<button
												on:click={() => moveSection(index, 'down')}
												disabled={index === pageSettings.sections.length - 1}
												class="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
												title="下に移動"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
												</svg>
											</button>
											<button
												on:click={() => removeSection(index)}
												class="p-1 text-red-600 hover:text-red-900"
												title="削除"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
												</svg>
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
						
						<!-- セクション追加ボタン -->
						<div class="p-8 border-t border-dashed border-gray-300">
							<button
								on:click={addSection}
								class="w-full py-4 border border-gray-300 border-dashed rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
							>
								<svg class="h-6 w-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
								</svg>
								セクションを追加
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- セクション編集モーダル -->
{#if showSectionModal && editingSection}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={closeSectionModal}>
		<div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" on:click|stopPropagation>
			<div class="px-6 py-4 border-b">
				<h3 class="text-lg font-medium text-gray-900">セクション編集</h3>
			</div>
			
			<div class="px-6 py-4 space-y-4">
				<div>
					<label for="section-title" class="block text-sm font-medium text-gray-700 mb-2">
						セクションタイトル
					</label>
					<input
						id="section-title"
						type="text"
						bind:value={editingSection.title}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				
				<div>
					<label for="section-content" class="block text-sm font-medium text-gray-700 mb-2">
						コンテンツ
					</label>
					<textarea
						id="section-content"
						bind:value={editingSection.content}
						rows="8"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
						placeholder="セクションの内容を入力してください..."
					></textarea>
				</div>
				
				<div>
					<label for="section-bg-color" class="block text-sm font-medium text-gray-700 mb-2">
						背景色
					</label>
					<input
						id="section-bg-color"
						type="color"
						bind:value={editingSection.settings.backgroundColor}
						class="w-full h-10 border border-gray-300 rounded-lg"
					/>
				</div>
			</div>
			
			<div class="px-6 py-4 border-t flex justify-end space-x-3">
				<button
					on:click={closeSectionModal}
					class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
				>
					キャンセル
				</button>
				<button
					on:click={saveSectionEdit}
					class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
				>
					保存
				</button>
			</div>
		</div>
	</div>
{/if}