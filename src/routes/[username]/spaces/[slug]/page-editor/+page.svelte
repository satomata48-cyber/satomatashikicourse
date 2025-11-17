<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username
	$: slug = $page.params.slug

	let space: any = null
	let loading = true
	let saving = false
	let error = ''
	let saveMessage = ''

	// セクションの型定義
	interface Section {
		id: string
		type: string
		title: string
		content: string
		imageUrl?: string
		buttonText?: string
		buttonUrl?: string
		backgroundColor?: string
		textColor?: string
		instructorProfileId?: string  // 講師プロフィールID
		instructorName?: string  // 講師名（セクション固有）
		videoUrl?: string  // 動画URL
		videoType?: string  // 動画タイプ（youtube / external）
		linkUrl?: string  // 添付ファイルURL
		linkTitle?: string  // 添付ファイルタイトル
		features?: Array<{
			icon: string
			title: string
			description: string
		}>
	}

	// ページ設定
	let title = ''
	let description = ''
	let sections: Section[] = []
	let themeColor = '#2563eb' // デフォルト: マテリアルブルー
	let instructorProfiles: any[] = [] // 講師プロフィール一覧

	// 削除確認モーダル
	let showDeleteModal = false
	let deleteTargetIndex: number | null = null

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

	// テーマカラー設定モーダル
	let showThemeModal = false

	// 絵文字ピッカーの状態管理
	let showEmojiPicker = false
	let emojiPickerTarget: { sectionIndex: number, featureIndex: number } | null = null

	// セクション開閉状態（デフォルトで全て閉じている）
	let expandedSections: Set<string> = new Set()

	const commonEmojis = [
		'⚙️', '👥', '⏰', '✓', '✨', '🎯', '📚', '💡',
		'🚀', '💪', '🎓', '📝', '🔥', '⭐', '🏆', '💼',
		'📊', '🎨', '🔧', '📱', '💻', '🌟', '✅', '🎉'
	]

	function openEmojiPicker(sectionIdx: number, featureIdx: number) {
		emojiPickerTarget = { sectionIndex: sectionIdx, featureIndex: featureIdx }
		showEmojiPicker = true
	}

	function selectEmoji(emoji: string) {
		if (emojiPickerTarget) {
			const section = sections[emojiPickerTarget.sectionIndex]
			if (section.features) {
				section.features[emojiPickerTarget.featureIndex].icon = emoji
				sections = [...sections]
			}
		}
		showEmojiPicker = false
		emojiPickerTarget = null
	}

	function deleteFeature(sectionIdx: number, featureIdx: number) {
		const section = sections[sectionIdx]
		if (section.features) {
			section.features = section.features.filter((_, idx) => idx !== featureIdx)
			sections = [...sections]
		}
	}

	function toggleSection(sectionId: string) {
		if (expandedSections.has(sectionId)) {
			expandedSections.delete(sectionId)
		} else {
			expandedSections.add(sectionId)
		}
		expandedSections = new Set(expandedSections)
	}

	// ドラッグ&ドロップ
	let draggedIndex: number | null = null

	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move'
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault()
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move'
		}
	}

	function handleDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault()
		if (draggedIndex !== null && draggedIndex !== targetIndex) {
			const newSections = [...sections]
			const [draggedItem] = newSections.splice(draggedIndex, 1)
			newSections.splice(targetIndex, 0, draggedItem)
			sections = newSections
		}
		draggedIndex = null
	}

	function handleDragEnd() {
		draggedIndex = null
	}

	// セクションテンプレート
	const templates = [
		{
			name: 'テキストコンテンツ',
			icon: '📝',
			description: 'テキストや説明を追加',
			template: {
				type: 'text',
				title: 'テキストセクション',
				content: 'ここにテキストや説明を入力します。',
				imageUrl: '',
				buttonText: '',
				buttonUrl: '',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
		{
			name: '動画',
			icon: '🎥',
			description: 'YouTube動画を追加',
			template: {
				type: 'video',
				title: '動画セクション',
				content: '',
				videoUrl: '',
				videoType: 'youtube',
				imageUrl: '',
				buttonText: '',
				buttonUrl: '',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
		{
			name: '添付ファイル',
			icon: '📎',
			description: '外部リンクを添付',
			template: {
				type: 'attachment',
				title: '添付ファイルセクション',
				content: '',
				linkUrl: '',
				linkTitle: '',
				imageUrl: '',
				buttonText: '',
				buttonUrl: '',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		}
	]

	onMount(async () => {
		await loadSpace()
	})

	async function loadSpace() {
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

			space = result.space

			// 既存のコンテンツを読み込む
			if (space.landing_page_content && space.landing_page_content.sections && space.landing_page_content.sections.length > 0) {
				title = space.landing_page_content.title || space.title
				description = space.landing_page_content.description || space.description
				sections = space.landing_page_content.sections
				const primaryColor = space.landing_page_content.theme?.primaryColor
				themeColor = (primaryColor && primaryColor.trim() !== '') ? primaryColor : '#2563eb'
			} else {
				// デフォルトセクションを作成(理想的なLP構成)
				title = space.title
				description = space.description
				sections = [
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
						title: space.title,
						content: space.description || '最高の学習体験をお届けします。プロフェッショナルな指導で、あなたのスキルを次のレベルへ。',
						buttonText: '今すぐ無料で始める',
						buttonUrl: `/${data.username}/space/${data.slug}/register`,
						imageUrl: '',
						backgroundColor: '#2563eb',
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
						buttonUrl: `/${data.username}/space/${data.slug}/register`,
						imageUrl: '',
						backgroundColor: '#ffffff',
						textColor: '#111827'
					},
					{
						id: '8',
						type: 'footer',
						title: 'フッター',
						content: '© 2025 Your Company. All rights reserved.',
						imageUrl: '',
						buttonText: '',
						buttonUrl: '',
						backgroundColor: '#ffffff',
						textColor: '#111827'
					}
				]
			}

			// 講師プロフィール一覧を取得
			try {
				const profilesResponse = await fetch('/api/instructor-profiles')
				const profilesResult = await profilesResponse.json()

				if (profilesResponse.ok) {
					instructorProfiles = profilesResult.profiles || []
				} else {
					console.warn('Failed to load instructor profiles:', profilesResult.error)
					instructorProfiles = []
				}
			} catch (profileErr) {
				console.warn('Error loading instructor profiles:', profileErr)
				instructorProfiles = []
			}

		} catch (err: any) {
			error = err.message
			console.error('Load error:', err)
		} finally {
			loading = false
		}
	}

	async function savePage() {
		if (!space) return

		saving = true
		saveMessage = ''
		error = ''

		try {
			// APIでスペース更新
			const response = await fetch(`/api/spaces`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: space.id,
					landing_page_content: {
						title,
						description,
						theme: {
							primaryColor: themeColor,
							accentColor: themeColor
						},
						sections
					}
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '保存に失敗しました')
			}

			saveMessage = '保存しました'
			setTimeout(() => {
				saveMessage = ''
			}, 3000)

		} catch (err: any) {
			error = err.message
			console.error('Save error:', err)
		} finally {
			saving = false
		}
	}

	function addSection(template: any) {
		const newSection: Section = {
			id: Date.now().toString(),
			...template
		}
		sections = [...sections, newSection]
	}

	function moveSection(index: number, direction: 'up' | 'down') {
		const newSections = [...sections]
		const targetIndex = direction === 'up' ? index - 1 : index + 1

		if (targetIndex >= 0 && targetIndex < newSections.length) {
			[newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]]
			sections = newSections
		}
	}

	function openDeleteModal(index: number) {
		deleteTargetIndex = index
		showDeleteModal = true
	}

	function confirmDelete() {
		if (deleteTargetIndex !== null) {
			sections = sections.filter((_, i) => i !== deleteTargetIndex)
			deleteTargetIndex = null
		}
		showDeleteModal = false
	}

	function cancelDelete() {
		deleteTargetIndex = null
		showDeleteModal = false
	}

	function previewPage() {
		window.open(`/${data.username}/space/${data.slug}`, '_blank')
	}

	function getSectionIcon(type: string): string {
		const template = templates.find(t => t.template.type === type)
		return template?.icon || '📄'
	}

	function getYouTubeId(url: string): string {
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
		return match ? match[1] : ''
	}

	function resetToIdealLayout() {
		if (!confirm('現在のセクションをすべて削除して、理想的なLP構成にリセットしますか？')) {
			return
		}

		sections = [
			{
				id: Date.now().toString() + '-1',
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
				id: Date.now().toString() + '-2',
				type: 'hero',
				title: title || space.title,
				content: description || space.description || '最高の学習体験をお届けします。プロフェッショナルな指導で、あなたのスキルを次のレベルへ。',
				buttonText: '今すぐ無料で始める',
				buttonUrl: `/${data.username}/space/${data.slug}/register`,
				imageUrl: '',
				backgroundColor: '#2563eb',
				textColor: '#ffffff'
			},
			{
				id: Date.now().toString() + '-3',
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
				id: Date.now().toString() + '-4',
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
				id: Date.now().toString() + '-5',
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
				id: Date.now().toString() + '-6',
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
				id: Date.now().toString() + '-7',
				type: 'cta',
				title: '今すぐ学習を始めませんか？',
				content: '無料登録で、すぐにコースをご覧いただけます。あなたの成長をサポートします。',
				buttonText: '無料で始める',
				buttonUrl: `/${data.username}/space/${data.slug}/register`,
				imageUrl: '',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			},
			{
				id: Date.now().toString() + '-8',
				type: 'footer',
				title: 'フッター',
				content: `© ${new Date().getFullYear()} ${space.title}. All rights reserved.`,
				imageUrl: '',
				buttonText: '',
				buttonUrl: '',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		]
	}
</script>

<!-- ヘッダー -->
<div class="bg-white border-b border-gray-200 sticky top-0 z-10">
	<div class="px-6 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-bold text-gray-900">ページエディター</h1>
				<p class="text-sm text-gray-600 mt-1">
					<a href="/{data.username}/spaces" class="hover:text-blue-600">スペース一覧</a>
					<span class="mx-2">/</span>
					<span>{space?.title || 'Loading...'}</span>
				</p>
			</div>
			<div class="flex items-center space-x-3">
				<!-- 理想的なLP構成にリセット -->
				<button
					on:click={resetToIdealLayout}
					class="px-3 py-2 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-sm font-medium"
					title="理想的なLP構成にリセット"
				>
					✨ 理想構成
				</button>
				<!-- テーマカラー選択ボタン -->
				<button
					on:click={() => showThemeModal = true}
					class="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
				>
					<span class="text-sm text-gray-600">テーマカラー:</span>
					<div class="w-6 h-6 rounded border-2 border-white shadow-sm" style="background-color: {themeColor}"></div>
				</button>
				{#if space}
					<button
						on:click={previewPage}
						class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
					>
						プレビュー
					</button>
				{/if}
				<button
					on:click={savePage}
					disabled={saving || !space}
					class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
				>
					{saving ? '保存中...' : '保存'}
				</button>
			</div>
		</div>

		{#if saveMessage}
			<div class="mt-3 bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded text-sm">
				{saveMessage}
			</div>
		{/if}

		{#if error}
			<div class="mt-3 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-sm">
				{error}
			</div>
		{/if}
	</div>
</div>

{#if loading}
	<div class="flex justify-center items-center h-64">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else if space}
	<div class="flex h-[calc(100vh-120px)]">
		<!-- 左: セクション一覧 + テンプレートパレット -->
		<div class="w-1/2 bg-white border-r border-gray-200 overflow-y-auto">
			<div class="p-4">
				<!-- セクション一覧 -->
				<div class="mb-6">
					<h2 class="text-sm font-semibold text-gray-900 mb-3">セクション一覧</h2>
					{#if sections.length === 0}
						<div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
							<p class="text-xs text-gray-500">
								下のテンプレートから<br>セクションを追加してください
							</p>
						</div>
					{:else}
						<div class="space-y-2">
							{#each sections as section, index}
								<div
									class="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
									class:opacity-50={draggedIndex === index}
									class:border-blue-500={draggedIndex !== null && draggedIndex !== index}
									draggable="true"
									on:dragstart={(e) => handleDragStart(e, index)}
									on:dragover={handleDragOver}
									on:drop={(e) => handleDrop(e, index)}
									on:dragend={handleDragEnd}
								>
									<!-- ヘッダー部分（常に表示・クリックで開閉） -->
									<div class="p-3 flex items-center justify-between">
										<button
											type="button"
											on:click={() => toggleSection(section.id)}
											class="flex items-center space-x-2 flex-1 text-left hover:bg-gray-50 transition-colors -m-3 p-3 rounded-l-lg"
										>
											<span class="text-base">{getSectionIcon(section.type)}</span>
											<span class="text-xs font-medium text-gray-900">{section.title}</span>
											<!-- 開閉アイコン -->
											<svg class="w-4 h-4 text-gray-400 transition-transform ml-auto" class:rotate-180={expandedSections.has(section.id)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
											</svg>
										</button>
										<div class="flex items-center space-x-1">
											<div class="p-1 text-gray-400 cursor-move" title="ドラッグして移動">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
												</svg>
											</div>
											<button
												type="button"
												on:click|stopPropagation={() => moveSection(index, 'up')}
												disabled={index === 0}
												class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
												title="上に移動"
											>
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
												</svg>
											</button>
											<button
												type="button"
												on:click|stopPropagation={() => moveSection(index, 'down')}
												disabled={index === sections.length - 1}
												class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
												title="下に移動"
											>
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
												</svg>
											</button>
											<button
												type="button"
												on:click|stopPropagation={() => openDeleteModal(index)}
												class="p-1 text-red-400 hover:text-red-600"
												title="削除"
											>
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
												</svg>
											</button>
										</div>
									</div>

									<!-- 詳細編集部分（開閉） -->
									{#if expandedSections.has(section.id)}
										<div class="p-3 pt-0 border-t border-gray-100">
											<input
												type="text"
												bind:value={section.title}
												class="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
												placeholder="タイトル"
											/>
											{#if section.type === 'instructor'}
												<!-- 講師プロフィール選択 -->
												<select
													bind:value={section.instructorProfileId}
													class="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
												>
													<option value="">講師プロフィールを選択...</option>
													{#each instructorProfiles as profile}
														<option value={profile.id}>{profile.display_name}</option>
													{/each}
												</select>
												<!-- 講師名（カスタマイズ可能） -->
												<input
													type="text"
													bind:value={section.instructorName}
													class="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
													placeholder="講師名（省略時はプロフィールの名前を使用）"
												/>
											{/if}
											{#if section.type === 'text'}
												<textarea
													bind:value={section.content}
													rows="2"
													class="w-full text-xs border border-gray-300 rounded px-2 py-1"
													placeholder="コンテンツ"
												></textarea>
											{:else if section.type === 'video'}
												<!-- 動画セクション -->
												<select
													bind:value={section.videoType}
													class="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
												>
													<option value="youtube">YouTube</option>
													<option value="external">外部リンク</option>
												</select>
												<input
													type="url"
													bind:value={section.videoUrl}
													class="w-full text-xs border border-gray-300 rounded px-2 py-1"
													placeholder={section.videoType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://video-storage-url...'}
												/>
											{:else if section.type === 'attachment'}
												<!-- 添付ファイルセクション -->
												<input
													type="text"
													bind:value={section.linkTitle}
													class="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
													placeholder="リンクのタイトル（オプション）"
												/>
												<input
													type="url"
													bind:value={section.linkUrl}
													class="w-full text-xs border border-gray-300 rounded px-2 py-1"
													placeholder="https://..."
												/>
											{:else if section.type === 'instructor'}
												<textarea
													bind:value={section.content}
													rows="2"
													class="w-full text-xs border border-gray-300 rounded px-2 py-1"
													placeholder="自己紹介・経歴など（省略時はプロフィールの自己紹介を使用）"
												></textarea>
											{:else if section.type !== 'features'}
												<textarea
													bind:value={section.content}
													rows="2"
													class="w-full text-xs border border-gray-300 rounded px-2 py-1"
													placeholder="コンテンツ"
												></textarea>
											{/if}
											{#if section.type === 'image-text' || section.type === 'hero'}
												<input
													type="text"
													bind:value={section.imageUrl}
													class="w-full text-xs border border-gray-300 rounded px-2 py-1 mt-2"
													placeholder="画像URL"
												/>
											{/if}
											{#if section.type === 'hero' || section.type === 'cta'}
												<div class="grid grid-cols-2 gap-2 mt-2">
													<input
														type="text"
														bind:value={section.buttonText}
														class="text-xs border border-gray-300 rounded px-2 py-1"
														placeholder="ボタン"
													/>
													<input
														type="text"
														bind:value={section.buttonUrl}
														class="text-xs border border-gray-300 rounded px-2 py-1"
														placeholder="URL"
													/>
												</div>
											{/if}
											{#if section.type === 'features'}
												<div class="mt-2 pt-2 border-t border-gray-200">
													<p class="text-xs text-gray-600 mb-2">特徴項目（アイコン・タイトル・説明）</p>
													{#if !section.features}
														{@const parsedFeatures = section.content.split('\n').filter(line => line.trim().startsWith('•')).map((line, idx) => {
															const text = line.replace('•', '').trim()
															const [title, ...descParts] = text.split(':')
															return {
																icon: idx === 0 ? '⚙️' : idx === 1 ? '👥' : idx === 2 ? '⏰' : '✓',
																title: title.trim(),
																description: descParts.join(':').trim()
															}
														})}
														{@const _ = (section.features = parsedFeatures, null)}
													{/if}
													{#each section.features || [] as feature, featureIdx}
														<div class="bg-gray-50 rounded px-2 py-2 mb-2 relative">
															<button
																on:click={() => deleteFeature(index, featureIdx)}
																class="absolute top-1 right-1 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
																title="削除"
															>
																<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
																</svg>
															</button>
															<div class="grid grid-cols-12 gap-1 mb-1">
																<button
																	type="button"
																	on:click={() => openEmojiPicker(index, featureIdx)}
																	class="col-span-2 text-base border border-gray-300 rounded px-1 py-1 text-center hover:bg-gray-100 cursor-pointer"
																	title="アイコンを選択"
																>
																	{feature.icon}
																</button>
																<input
																	type="text"
																	bind:value={feature.title}
																	class="col-span-10 text-xs border border-gray-300 rounded px-2 py-1"
																	placeholder="タイトル"
																/>
															</div>
															<input
																type="text"
																bind:value={feature.description}
																class="w-full text-xs border border-gray-300 rounded px-2 py-1"
																placeholder="説明"
															/>
														</div>
													{/each}
													<button
														on:click={() => {
															if (!section.features) section.features = []
															section.features = [...section.features, { icon: '✨', title: '新しい特徴', description: '説明を入力' }]
														}}
														class="w-full text-xs text-blue-600 hover:text-blue-700 py-1"
													>
														+ 項目を追加
													</button>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- テンプレートパレット -->
				<div class="border-t pt-4">
					<h2 class="text-sm font-semibold text-gray-900 mb-3">テンプレート</h2>
					<div class="space-y-2">
						{#each templates as template}
							<button
								on:click={() => addSection(template.template)}
								class="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
							>
								<div class="flex items-start">
									<span class="text-xl mr-2">{template.icon}</span>
									<div class="flex-1 min-w-0">
										<div class="font-medium text-gray-900 text-xs group-hover:text-blue-600">
											{template.name}
										</div>
										<div class="text-xs text-gray-500 mt-1">
											{template.description}
										</div>
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- 右: プレビュー -->
		<div class="w-1/2 bg-gray-50 overflow-y-auto">
			<div class="p-6">
				<div class="bg-white rounded-lg shadow-lg overflow-hidden max-w-5xl mx-auto">
					<!-- プレビューヘッダー -->
					<div class="bg-gray-50 border-b border-gray-200 px-4 py-3">
						<h2 class="text-sm font-semibold text-gray-900">プレビュー</h2>
					</div>

					<!-- プレビューコンテンツ -->
					<div class="min-h-screen bg-white">
						{#each sections as section}
							<div class="border-b border-gray-100 last:border-b-0">
								{#if section.type === 'header'}
									<!-- ヘッダー -->
									<nav class="shadow-sm border-b" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
										<div class="px-6 py-4">
											<div class="flex justify-between items-center">
												<div class="flex items-center space-x-2">
													<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background-color: {themeColor}">
														<span class="text-white font-bold text-sm">{space.title.charAt(0)}</span>
													</div>
													<span class="font-medium" style="color: {section.textColor || '#111827'}">{space.title}</span>
												</div>
												<div class="flex items-center space-x-4">
													<button class="font-medium text-sm" style="color: {section.textColor || '#111827'}">
														ログイン
													</button>
													<button class="text-white px-4 py-2 rounded-lg font-medium text-sm" style="background-color: {themeColor}">
														登録
													</button>
												</div>
											</div>
										</div>
									</nav>
								{:else if section.type === 'hero'}
									<!-- ヒーロー -->
									<section class="py-16 text-white" style="background-color: {themeColor}">
										<div class="px-6 text-center">
											<h1 class="text-4xl font-bold mb-4">{section.title}</h1>
											<p class="text-xl mb-6 opacity-90">{section.content}</p>
											{#if section.buttonText}
												<button class="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold">
													{section.buttonText}
												</button>
											{/if}
										</div>
									</section>
								{:else if section.type === 'courses'}
									<!-- コース一覧 -->
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6">
											<div class="text-center mb-8">
												<h2 class="text-3xl font-bold mb-2">{section.title}</h2>
												<p class="text-lg opacity-80">{section.content}</p>
											</div>
											<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
												<div class="bg-white rounded-lg shadow p-4">
													<h3 class="text-lg font-semibold text-gray-900 mb-2">コース例</h3>
													<p class="text-sm text-gray-600 mb-3">コースの説明文が入ります</p>
													<div class="text-sm text-gray-500 mb-3">8 レッスン</div>
													<button class="w-full text-white py-2 rounded-lg text-sm font-medium" style="background-color: {themeColor}">
														詳細を見る
													</button>
												</div>
											</div>
										</div>
									</section>
								{:else if section.type === 'instructor'}
									<!-- 講師紹介 -->
									{@const selectedProfile = instructorProfiles.find(p => p.id === section.instructorProfileId)}
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6">
											<div class="max-w-4xl mx-auto text-center">
												<h2 class="text-3xl font-bold mb-6">{section.title}</h2>
												<div class="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
													{#if selectedProfile}
														{#if selectedProfile.avatar_url}
															<img src={selectedProfile.avatar_url} alt={section.instructorName || selectedProfile.display_name} class="h-24 w-24 rounded-full object-cover" />
														{:else}
															<div class="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center">
																<svg class="h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
																</svg>
															</div>
														{/if}
														<div class="flex-1 text-left">
															<h3 class="text-xl font-semibold mb-2">{section.instructorName || selectedProfile.display_name}</h3>
															<p class="opacity-80">{section.content || selectedProfile.bio}</p>
														</div>
													{:else}
														<div class="h-24 w-24 rounded-full bg-gray-300"></div>
														<div class="flex-1 text-left">
															<h3 class="text-xl font-semibold mb-2">{section.instructorName || '講師名'}</h3>
															<p class="opacity-80">{section.content || '講師プロフィールを選択するか、講師名と自己紹介を入力してください'}</p>
														</div>
													{/if}
												</div>
											</div>
										</div>
									</section>
								{:else if section.type === 'cta'}
									<!-- CTA -->
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6 text-center">
											<h2 class="text-3xl font-bold mb-3">{section.title}</h2>
											<p class="text-lg mb-6 opacity-90">{section.content}</p>
											{#if section.buttonText}
												<button class="px-6 py-3 rounded-lg font-semibold text-white" style="background-color: {themeColor}">
													{section.buttonText}
												</button>
											{/if}
										</div>
									</section>
								{:else if section.type === 'features'}
									<!-- 特徴リスト -->
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6">
											<h2 class="text-3xl font-bold text-center mb-8">{section.title}</h2>
											<div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
												{#each (section.features || section.content.split('\n').filter(line => line.trim().startsWith('•')).map((line, idx) => {
													const text = line.replace('•', '').trim()
													const [title, ...descParts] = text.split(':')
													return {
														icon: idx === 0 ? '⚙️' : idx === 1 ? '👥' : idx === 2 ? '⏰' : '✓',
														title: title.trim(),
														description: descParts.join(':').trim()
													}
												})) as feature}
													<div class="flex items-start space-x-4 bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
														<div class="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center text-2xl" style="background-color: {themeColor}20">
															<span>{feature.icon}</span>
														</div>
														<div class="flex-1 min-w-0">
															<h3 class="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
															<p class="text-sm text-gray-600">{feature.description}</p>
														</div>
													</div>
												{/each}
											</div>
										</div>
									</section>
								{:else if section.type === 'image-text'}
									<!-- 画像+テキスト -->
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6">
											<h3 class="text-2xl font-bold mb-4">{section.title}</h3>
											{#if section.imageUrl}
												<img src={section.imageUrl} alt={section.title} class="w-full h-48 object-cover rounded-lg mb-4" />
											{/if}
											<p class="whitespace-pre-line opacity-80">{section.content}</p>
										</div>
									</section>
								{:else if section.type === 'faq'}
									<!-- FAQ -->
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6">
											<h3 class="text-2xl font-bold mb-6">{section.title}</h3>
											<div class="space-y-3 max-w-2xl mx-auto">
												{#each section.content.split('\n\n') as qa}
													<div class="p-4 rounded-lg bg-gray-50">
														<p class="text-sm whitespace-pre-line">{qa}</p>
													</div>
												{/each}
											</div>
										</div>
									</section>
								{:else if section.type === 'footer'}
									<!-- フッター -->
									<footer class="py-8 bg-white text-gray-900">
										<div class="px-6">
											<div class="max-w-7xl mx-auto">
												<div class="text-center">
													<p class="text-sm opacity-80">{section.content}</p>
												</div>
											</div>
										</div>
									</footer>
								{:else if section.type === 'video'}
									<!-- 動画セクション -->
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6">
											<h3 class="text-2xl font-bold mb-4">{section.title}</h3>
											{#if section.videoUrl}
												{@const youtubeId = getYouTubeId(section.videoUrl)}
												{#if section.videoType === 'youtube' && youtubeId}
													<div class="max-w-4xl mx-auto">
														<div class="border border-gray-200 rounded-lg overflow-hidden shadow-lg">
															<div class="aspect-video bg-black">
																<iframe
																	src="https://www.youtube.com/embed/{youtubeId}"
																	title={section.title}
																	frameborder="0"
																	allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
																	allowfullscreen
																	class="w-full h-full"
																></iframe>
															</div>
														</div>
													</div>
												{:else}
													<div class="max-w-4xl mx-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
														<p class="text-sm text-gray-600 flex items-center">
															<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
															</svg>
															動画URL: {section.videoUrl}
														</p>
													</div>
												{/if}
											{:else}
												<div class="max-w-4xl mx-auto border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
													<p class="text-sm text-gray-400">動画URLを入力してください</p>
												</div>
											{/if}
										</div>
									</section>
								{:else if section.type === 'attachment'}
									<!-- 添付ファイルセクション -->
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6">
											<h3 class="text-2xl font-bold mb-4">{section.title}</h3>
											{#if section.linkUrl}
												<div class="max-w-4xl mx-auto">
													<a
														href={section.linkUrl}
														target="_blank"
														rel="noopener noreferrer"
														class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
													>
														<div class="flex items-center space-x-3 flex-1 min-w-0">
															<div class="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center group-hover:bg-blue-200 transition-colors" style="background-color: {themeColor}20">
																<svg class="h-6 w-6" style="color: {themeColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
																</svg>
															</div>
															<div class="flex-1 min-w-0">
																<p class="text-base font-medium text-gray-900 truncate group-hover:text-blue-700">
																	{section.linkTitle || new URL(section.linkUrl).hostname || 'リンク'}
																</p>
																<p class="text-sm text-gray-500 truncate mt-0.5">{section.linkUrl}</p>
															</div>
														</div>
														<svg class="h-5 w-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
														</svg>
													</a>
												</div>
											{:else}
												<div class="max-w-4xl mx-auto border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
													<p class="text-sm text-gray-400">リンクURLを入力してください</p>
												</div>
											{/if}
										</div>
									</section>
								{:else if section.type === 'text'}
									<!-- テキストセクション -->
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6">
											<h3 class="text-2xl font-bold mb-4">{section.title}</h3>
											<p class="whitespace-pre-line opacity-80">{section.content}</p>
										</div>
									</section>
								{:else}
									<!-- デフォルト(その他) -->
									<section class="py-12 bg-white text-gray-900">
										<div class="px-6">
											<h3 class="text-2xl font-bold mb-4">{section.title}</h3>
											<p class="whitespace-pre-line opacity-80">{section.content}</p>
										</div>
									</section>
								{/if}
							</div>
						{/each}

						{#if sections.length === 0}
							<div class="flex items-center justify-center h-64">
								<p class="text-gray-400 text-center">
									セクションを追加すると<br>ここにプレビューが表示されます
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- 削除確認モーダル -->
{#if showDeleteModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
			<div class="p-6">
				<div class="flex items-center mb-4">
					<div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
						<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
						</svg>
					</div>
					<div class="ml-4 flex-1">
						<h3 class="text-lg font-semibold text-gray-900">セクションを削除</h3>
					</div>
				</div>
				<p class="text-gray-600 mb-6">
					このセクションを削除してもよろしいですか？<br>
					<span class="text-sm text-gray-500">この操作は取り消せません。</span>
				</p>
				<div class="flex justify-end space-x-3">
					<button
						on:click={cancelDelete}
						class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
					>
						キャンセル
					</button>
					<button
						on:click={confirmDelete}
						class="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
					>
						削除する
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- テーマカラー選択モーダル -->
{#if showThemeModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
			<div class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900">テーマカラーを選択</h3>
					<button
						on:click={() => showThemeModal = false}
						class="text-gray-400 hover:text-gray-600"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				</div>

				<p class="text-sm text-gray-600 mb-4">
					スペース全体のアクセントカラーを設定します
				</p>

				<!-- カラープリセット -->
				<div class="grid grid-cols-5 gap-2 mb-4">
					{#each colorPresets as preset}
						<button
							type="button"
							on:click={() => themeColor = preset.color}
							class="relative h-12 rounded-lg border-2 transition-all hover:scale-105"
							class:border-gray-900={themeColor === preset.color}
							class:border-gray-300={themeColor !== preset.color}
							style="background-color: {preset.color}"
							title={preset.name}
						>
							{#if themeColor === preset.color}
								<div class="absolute inset-0 flex items-center justify-center">
									<svg class="w-6 h-6 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
									</svg>
								</div>
							{/if}
						</button>
					{/each}
				</div>

				<!-- カスタムカラー -->
				<div class="mb-6">
					<label class="block text-sm font-medium text-gray-700 mb-2">カスタムカラー</label>
					<div class="flex items-center space-x-2">
						<input
							type="color"
							bind:value={themeColor}
							class="h-12 w-24 rounded border border-gray-300 cursor-pointer"
						/>
						<span class="text-sm text-gray-600">{themeColor}</span>
					</div>
				</div>

				<div class="flex justify-end">
					<button
						on:click={() => showThemeModal = false}
						class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
					>
						完了
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- 絵文字ピッカーモーダル -->
{#if showEmojiPicker}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
			<div class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900">アイコンを選択</h3>
					<button
						on:click={() => {
							showEmojiPicker = false
							emojiPickerTarget = null
						}}
						class="text-gray-400 hover:text-gray-600"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				</div>

				<div class="grid grid-cols-6 gap-2 mb-4">
					{#each commonEmojis as emoji}
						<button
							type="button"
							on:click={() => selectEmoji(emoji)}
							class="h-12 text-2xl rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
						>
							{emoji}
						</button>
					{/each}
				</div>

				<div class="text-xs text-gray-500 text-center">
					クリックしてアイコンを選択
				</div>
			</div>
		</div>
	</div>
{/if}
