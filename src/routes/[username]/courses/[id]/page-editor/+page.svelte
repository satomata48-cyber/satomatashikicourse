<script lang="ts">
	import { onMount } from 'svelte'
	import { createSupabaseBrowserClient } from '$lib/supabase'

	export let data

	const supabase = createSupabaseBrowserClient()

	let course: any = null
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
		features?: Array<{
			icon: string
			title: string
			description: string
		}>
	}

	// ページ設定
	let sections: Section[] = []
	let themeColor = '#3B82F6' // スペースから継承

	// 削除確認モーダル
	let showDeleteModal = false
	let deleteTargetIndex: number | null = null

	// 絵文字ピッカーの状態管理
	let showEmojiPicker = false
	let emojiPickerTarget: { sectionIndex: number, featureIndex: number } | null = null

	// セクション開閉状態（デフォルトで全て閉じている）
	let expandedSections: Set<string> = new Set()

	const commonEmojis = [
		'📚', '🎯', '✅', '💡', '🚀', '⭐', '🔥', '💪',
		'🎓', '📝', '⏰', '👥', '🏆', '📊', '✨', '🎉',
		'💼', '🔧', '📱', '💻', '🌟', '🎨', '⚙️', '📈'
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

	// コース詳細ページ向けのセクションテンプレート
	const templates = [
		{
			name: 'コース概要',
			icon: '📚',
			description: 'コースの全体像を説明',
			template: {
				type: 'overview',
				title: 'コースの概要',
				content: 'このコースでは、○○について基礎から実践まで体系的に学習します。初心者の方でも安心して受講いただけるよう、丁寧な解説と実践的な演習を用意しています。',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
		{
			name: '学習内容',
			icon: '🎯',
			description: '具体的に学べることをリスト化',
			template: {
				type: 'learning-outcomes',
				title: 'このコースで学べること',
				content: '• 基礎概念の理解: ○○の基本原理と仕組み\n• 実践的なスキル: すぐに使える実用的なテクニック\n• プロジェクト経験: 実際のプロジェクトを通じた学習\n• ベストプラクティス: 業界標準のアプローチ',
				backgroundColor: '#ffffff',
				textColor: '#111827',
				features: [
					{ icon: '📚', title: '基礎概念の理解', description: '○○の基本原理と仕組みを学習' },
					{ icon: '💡', title: '実践的なスキル', description: 'すぐに使える実用的なテクニック' },
					{ icon: '🎯', title: 'プロジェクト経験', description: '実際のプロジェクトを通じた学習' },
					{ icon: '⭐', title: 'ベストプラクティス', description: '業界標準のアプローチを習得' }
				]
			}
		},
		{
			name: '対象者',
			icon: '👥',
			description: 'どんな人に向いているか',
			template: {
				type: 'target-audience',
				title: 'こんな方におすすめ',
				content: '• これから○○を始めたい初心者の方\n• 基礎を体系的に学び直したい方\n• 実践的なスキルを身につけたい方\n• キャリアアップを目指している方',
				backgroundColor: '#f9fafb',
				textColor: '#111827'
			}
		},
		{
			name: '前提知識',
			icon: '📝',
			description: '受講に必要な前提条件',
			template: {
				type: 'prerequisites',
				title: '前提知識',
				content: 'このコースの受講にあたって、特別な前提知識は必要ありません。\n\n以下があると理解がスムーズです：\n• 基本的なPC操作\n• インターネットの基礎知識',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
		{
			name: '特徴・メリット',
			icon: '✨',
			description: 'コースの強み',
			template: {
				type: 'features',
				title: 'このコースの特徴',
				content: '特徴をリスト形式で表示します',
				backgroundColor: '#ffffff',
				textColor: '#111827',
				features: [
					{ icon: '⏰', title: '自分のペースで学習', description: 'いつでもどこでも好きな時間に学習できます' },
					{ icon: '🎓', title: '実践重視のカリキュラム', description: 'すぐに使える実用的な内容' },
					{ icon: '👥', title: '充実のサポート', description: '質問対応やフィードバックが充実' },
					{ icon: '💼', title: '実務で使えるスキル', description: '現場で即戦力となる知識を習得' }
				]
			}
		},
		{
			name: '画像+説明',
			icon: '🖼️',
			description: '画像とテキストを組み合わせ',
			template: {
				type: 'image-text',
				title: '実践的な学習環境',
				content: '実際の開発環境を使って、hands-onで学習します。理論だけでなく、実践を通じてスキルを定着させることができます。',
				imageUrl: 'https://via.placeholder.com/600x400',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
		{
			name: 'FAQ',
			icon: '❓',
			description: 'よくある質問',
			template: {
				type: 'faq',
				title: 'よくある質問',
				content: 'Q: 初心者でも受講できますか？\nA: はい、基礎から丁寧に解説しますので初心者の方でも安心して受講いただけます。\n\nQ: どのくらいの期間で完了できますか？\nA: 個人差はありますが、週3-5時間の学習で2-3ヶ月程度で完了できる内容です。\n\nQ: 質問はできますか？\nA: はい、コース内の質問機能からいつでも質問いただけます。',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
		{
			name: 'CTA (購入促進)',
			icon: '🚀',
			description: '購入や登録を促す',
			template: {
				type: 'cta',
				title: '今すぐ始めましょう',
				content: 'このコースで、あなたのスキルを次のレベルへ引き上げませんか？',
				buttonText: '今すぐ購入',
				buttonUrl: '#',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
		{
			name: 'テキストセクション',
			icon: '📄',
			description: 'シンプルなテキスト',
			template: {
				type: 'text',
				title: 'セクションタイトル',
				content: 'ここに詳細な説明を書きます。複数段落にわたる長い文章も書けます。',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		}
	]

	onMount(async () => {
		await loadCourse()
	})

	async function loadCourse() {
		try {
			// courseIdがUUIDかslugかを判定
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.courseId)

			let courseQuery = supabase
				.from('courses')
				.select(`
					*,
					space:spaces!inner(
						id,
						title,
						slug,
						instructor_id,
						landing_page_content
					)
				`)

			if (isUUID) {
				courseQuery = courseQuery.eq('id', data.courseId)
			} else {
				courseQuery = courseQuery.eq('slug', data.courseId)
			}

			const { data: courseData, error: courseError } = await courseQuery.single()

			if (courseError) throw courseError
			if (!courseData) throw new Error('コースが見つかりません')

			// 権限チェック: コースのスペースの所有者であるか確認
			if (courseData.space.instructor_id !== data.user.id) {
				throw new Error('このコースを編集する権限がありません')
			}

			course = courseData
			space = courseData.space

			// スペースのテーマカラーを取得
			if (space.landing_page_content?.theme?.primaryColor) {
				themeColor = space.landing_page_content.theme.primaryColor
			}

			// 既存のコンテンツを読み込む
			if (course.course_page_content && course.course_page_content.sections && course.course_page_content.sections.length > 0) {
				sections = course.course_page_content.sections
			} else {
				// デフォルトセクションを作成
				sections = [
					{
						id: '1',
						type: 'overview',
						title: 'コースの概要',
						content: `${course.title}では、実践的なスキルを基礎から学ぶことができます。${course.description || ''}`,
						backgroundColor: '#ffffff',
						textColor: '#111827'
					},
					{
						id: '2',
						type: 'learning-outcomes',
						title: 'このコースで学べること',
						content: '• 基礎から応用まで体系的に学習\n• 実践的なプロジェクトを通じた経験\n• 現場で使えるスキルの習得\n• ベストプラクティスの理解',
						backgroundColor: '#ffffff',
						textColor: '#111827',
						features: [
							{ icon: '📚', title: '体系的な学習', description: '基礎から応用まで段階的に学習' },
							{ icon: '🎯', title: '実践プロジェクト', description: '実際のプロジェクトを通じた経験' },
							{ icon: '💡', title: '実務スキル', description: '現場で即戦力となるスキル' },
							{ icon: '⭐', title: 'ベストプラクティス', description: '業界標準のアプローチ' }
						]
					},
					{
						id: '3',
						type: 'target-audience',
						title: 'こんな方におすすめ',
						content: '• これから学習を始めたい初心者の方\n• 基礎を体系的に学び直したい方\n• 実践的なスキルを身につけたい方\n• キャリアアップを目指している方',
						backgroundColor: '#f9fafb',
						textColor: '#111827'
					},
					{
						id: '4',
						type: 'faq',
						title: 'よくある質問',
						content: 'Q: 初心者でも受講できますか？\nA: はい、基礎から丁寧に解説しますので初心者の方でも安心して受講いただけます。\n\nQ: 質問はできますか？\nA: はい、コース内の質問機能からいつでも質問いただけます。',
						backgroundColor: '#ffffff',
						textColor: '#111827'
					}
				]
			}

		} catch (err: any) {
			error = err.message
			console.error('Load error:', err)
		} finally {
			loading = false
		}
	}

	async function savePage() {
		if (!course) return

		saving = true
		saveMessage = ''
		error = ''

		try {
			// course_page_contentを更新
			const updatedContent = {
				...course.course_page_content,
				sections,
				metadata: {
					...course.course_page_content?.metadata,
					lastEdited: new Date().toISOString()
				}
			}

			const { error: updateError } = await supabase
				.from('courses')
				.update({
					course_page_content: updatedContent,
					updated_at: new Date().toISOString()
				})
				.eq('id', course.id)

			if (updateError) throw updateError

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
		if (space && course) {
			window.open(`/${data.username}/space/${space.slug}/course/${course.slug || course.id}`, '_blank')
		}
	}

	function getSectionIcon(type: string): string {
		const template = templates.find(t => t.template.type === type)
		return template?.icon || '📄'
	}
</script>

<!-- ヘッダー -->
<div class="bg-white border-b border-gray-200 sticky top-0 z-10">
	<div class="px-6 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-bold text-gray-900">コースページエディター</h1>
				<p class="text-sm text-gray-600 mt-1">
					<a href="/{data.username}/courses" class="hover:text-blue-600">コース一覧</a>
					<span class="mx-2">/</span>
					<a href="/{data.username}/courses/{data.courseId}/edit" class="hover:text-blue-600">
						{course?.title || 'Loading...'}
					</a>
					<span class="mx-2">/</span>
					<span>ページ編集</span>
				</p>
			</div>
			<div class="flex items-center space-x-3">
				<!-- テーマカラー表示（読み取り専用） -->
				<div class="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
					<span class="text-sm text-gray-600">テーマカラー:</span>
					<div class="w-6 h-6 rounded border-2 border-white shadow-sm" style="background-color: {themeColor}"></div>
					<span class="text-xs text-gray-500">(スペースから継承)</span>
				</div>
				{#if course}
					<button
						on:click={previewPage}
						class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
					>
						プレビュー
					</button>
				{/if}
				<button
					on:click={savePage}
					disabled={saving || !course}
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
{:else if course}
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
											{#if section.type !== 'features' && section.type !== 'learning-outcomes'}
												<textarea
													bind:value={section.content}
													rows="3"
													class="w-full text-xs border border-gray-300 rounded px-2 py-1"
													placeholder="コンテンツ"
												></textarea>
											{/if}
											{#if section.type === 'image-text'}
												<input
													type="text"
													bind:value={section.imageUrl}
													class="w-full text-xs border border-gray-300 rounded px-2 py-1 mt-2"
													placeholder="画像URL"
												/>
											{/if}
											{#if section.type === 'cta'}
												<div class="grid grid-cols-2 gap-2 mt-2">
													<input
														type="text"
														bind:value={section.buttonText}
														class="text-xs border border-gray-300 rounded px-2 py-1"
														placeholder="ボタンテキスト"
													/>
													<input
														type="text"
														bind:value={section.buttonUrl}
														class="text-xs border border-gray-300 rounded px-2 py-1"
														placeholder="リンクURL"
													/>
												</div>
											{/if}
											{#if section.type === 'features' || section.type === 'learning-outcomes'}
												<div class="mt-2 pt-2 border-t border-gray-200">
													<p class="text-xs text-gray-600 mb-2">特徴項目（アイコン・タイトル・説明）</p>
													{#if !section.features}
														{@const parsedFeatures = (section.content || '').split('\n').filter(line => line.trim().startsWith('•')).map((line, idx) => {
															const text = line.replace('•', '').trim()
															const [title, ...descParts] = text.split(':')
															return {
																icon: idx === 0 ? '📚' : idx === 1 ? '💡' : idx === 2 ? '🎯' : '⭐',
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
															section.features = [...section.features, { icon: '✨', title: '新しい項目', description: '説明を入力' }]
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
						<p class="text-xs text-gray-500 mt-1">※ 実際のページではヘッダー、レッスン一覧、フッターが追加されます</p>
					</div>

					<!-- プレビューコンテンツ -->
					<div class="min-h-screen bg-white">
						{#each sections as section}
							<div class="border-b border-gray-100 last:border-b-0">
								{#if section.type === 'overview' || section.type === 'prerequisites' || section.type === 'target-audience' || section.type === 'text'}
									<!-- テキストセクション -->
									<section class="py-12" style="background-color: {section.backgroundColor || '#ffffff'}; color: {section.textColor || '#111827'}">
										<div class="px-6 max-w-4xl mx-auto">
											<h2 class="text-3xl font-bold mb-6">{section.title}</h2>
											<div class="text-lg opacity-90 whitespace-pre-line">{section.content}</div>
										</div>
									</section>
								{:else if section.type === 'learning-outcomes' || section.type === 'features'}
									<!-- 特徴リスト -->
									<section class="py-12" style="background-color: {section.backgroundColor || '#ffffff'}">
										<div class="px-6 max-w-5xl mx-auto">
											<h2 class="text-3xl font-bold text-center mb-10" style="color: {section.textColor || '#111827'}">{section.title}</h2>
											<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
												{#each section.features || [] as feature}
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
									<section class="py-12" style="background-color: {section.backgroundColor || '#ffffff'}">
										<div class="px-6 max-w-4xl mx-auto">
											<h2 class="text-3xl font-bold mb-6" style="color: {section.textColor || '#111827'}">{section.title}</h2>
											{#if section.imageUrl}
												<img src={section.imageUrl} alt={section.title} class="w-full h-64 object-cover rounded-lg mb-6" />
											{/if}
											<p class="text-lg opacity-90 whitespace-pre-line" style="color: {section.textColor || '#111827'}">{section.content}</p>
										</div>
									</section>
								{:else if section.type === 'faq'}
									<!-- FAQ -->
									<section class="py-12" style="background-color: {section.backgroundColor || '#ffffff'}">
										<div class="px-6 max-w-3xl mx-auto">
											<h2 class="text-3xl font-bold mb-8 text-center" style="color: {section.textColor || '#111827'}">{section.title}</h2>
											<div class="space-y-4">
												{#each section.content.split('\n\n') as qa}
													<div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
														<p class="text-sm whitespace-pre-line" style="color: {section.textColor || '#111827'}">{qa}</p>
													</div>
												{/each}
											</div>
										</div>
									</section>
								{:else if section.type === 'cta'}
									<!-- CTA -->
									<section class="py-16" style="background-color: {section.backgroundColor || '#ffffff'}">
										<div class="px-6 text-center max-w-3xl mx-auto">
											<h2 class="text-4xl font-bold mb-4" style="color: {section.textColor || '#111827'}">{section.title}</h2>
											<p class="text-xl mb-8 opacity-90" style="color: {section.textColor || '#111827'}">{section.content}</p>
											{#if section.buttonText}
												<button class="px-8 py-4 rounded-lg font-semibold text-white text-lg hover:opacity-90 transition-opacity" style="background-color: {themeColor}">
													{section.buttonText}
												</button>
											{/if}
										</div>
									</section>
								{:else}
									<!-- デフォルト -->
									<section class="py-12" style="background-color: {section.backgroundColor || '#ffffff'}">
										<div class="px-6 max-w-4xl mx-auto">
											<h2 class="text-3xl font-bold mb-6" style="color: {section.textColor || '#111827'}">{section.title}</h2>
											<p class="text-lg opacity-90 whitespace-pre-line" style="color: {section.textColor || '#111827'}">{section.content}</p>
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
