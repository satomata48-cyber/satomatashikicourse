<script lang="ts">
	import { onMount } from 'svelte'
	import { createSupabaseBrowserClient } from '$lib/supabase'

	export let data

	const supabase = createSupabaseBrowserClient()

	let course: any = null
	let space: any = null
	let lessons: any[] = []
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
			name: 'コース基本情報',
			icon: '📋',
			description: 'タイトル、説明、サムネイル、価格を表示',
			template: {
				type: 'course-info',
				title: 'コース情報',
				content: 'コースの基本情報が自動的に表示されます',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
		{
			name: 'レッスン一覧',
			icon: '📚',
			description: 'コースのレッスン一覧を自動表示',
			template: {
				type: 'lessons-list',
				title: 'レッスン一覧',
				content: 'レッスン管理ページと連動して自動表示されます',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
		{
			name: '理想構成を挿入',
			icon: '✨',
			description: 'コース詳細ページに最適なセクション構成を一括追加',
			template: {
				type: 'ideal-template',
				title: '理想構成',
				content: '複数のセクションを一括追加',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		},
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
		},
		{
			name: 'スペースフッター',
			icon: '📍',
			description: 'スペースのフッターを自動表示（スペース設定から継承）',
			template: {
				type: 'space-footer',
				title: 'フッター',
				content: 'スペースのフッターが自動的に表示されます',
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

			// レッスン一覧を取得
			await loadLessons()

		} catch (err: any) {
			error = err.message
			console.error('Load error:', err)
		} finally {
			loading = false
		}
	}

	async function loadLessons() {
		try {
			if (!course?.id) return

			const { data: lessonsData, error: lessonsError } = await supabase
				.from('lessons')
				.select('id, title, description, content, video_url, video_type, duration, order_index, is_published')
				.eq('course_id', course.id)
				.order('order_index', { ascending: true })

			if (lessonsError) throw lessonsError
			lessons = lessonsData || []
		} catch (err: any) {
			console.error('Load lessons error:', err)
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
		// 理想構成を挿入する場合
		if (template.type === 'ideal-template') {
			addIdealTemplate()
			return
		}

		const newSection: Section = {
			id: Date.now().toString(),
			...template
		}
		sections = [...sections, newSection]
	}

	function addIdealTemplate() {
		// 理想構成: 7セクション（ヘッダーは除外、フッター含む）
		const idealSections: Section[] = [
			{
				id: Date.now().toString() + '-1',
				type: 'course-info',
				title: 'コース基本情報',
				content: 'コースの基本情報が自動的に表示されます',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			},
			{
				id: Date.now().toString() + '-2',
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
				id: Date.now().toString() + '-3',
				type: 'lessons-list',
				title: 'レッスン一覧',
				content: 'レッスン管理ページと連動して自動表示されます',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			},
			{
				id: Date.now().toString() + '-4',
				type: 'features',
				title: 'このコースの特徴',
				content: '特徴をリスト形式で表示します',
				backgroundColor: '#f9fafb',
				textColor: '#111827',
				features: [
					{ icon: '⏰', title: '自分のペースで学習', description: 'いつでもどこでも好きな時間に学習できます' },
					{ icon: '🎓', title: '実践重視のカリキュラム', description: 'すぐに使える実用的な内容が満載です' },
					{ icon: '👥', title: '充実のサポート', description: '質問対応やフィードバックが充実しています' },
					{ icon: '💼', title: '実務で使えるスキル', description: '現場で即戦力となる知識を習得できます' }
				]
			},
			{
				id: Date.now().toString() + '-5',
				type: 'target-audience',
				title: 'こんな方におすすめ',
				content: '• これから学習を始めたい初心者の方\n• 基礎を体系的に学び直したい方\n• 実践的なスキルを身につけたい方\n• キャリアアップを目指している方',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			},
			{
				id: Date.now().toString() + '-6',
				type: 'faq',
				title: 'よくある質問',
				content: 'Q: 初心者でも受講できますか？\nA: はい、基礎から丁寧に解説しますので初心者の方でも安心して受講いただけます。\n\nQ: どのくらいの期間で完了できますか？\nA: 個人差はありますが、週3-5時間の学習で2-3ヶ月程度で完了できる内容です。\n\nQ: 質問はできますか？\nA: はい、コース内の質問機能からいつでも質問いただけます。',
				backgroundColor: '#f9fafb',
				textColor: '#111827'
			},
			{
				id: Date.now().toString() + '-7',
				type: 'space-footer',
				title: 'フッター',
				content: 'スペースのフッターが自動的に表示されます',
				backgroundColor: '#ffffff',
				textColor: '#111827'
			}
		]

		// 既存のセクションをリセットしてから理想構成を挿入
		sections = [...idealSections]
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
						on:click={addIdealTemplate}
						class="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
						style="background-color: {themeColor}"
						title="理想的なセクション構成を一括追加"
					>
						✨ 理想構成を挿入
					</button>
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
											{#if section.type === 'space-header'}
												<div class="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
													<div class="font-medium mb-1">📌 スペースヘッダー自動表示</div>
													<p class="text-gray-500">
														スペース設定のヘッダー情報が自動的に表示されます。<br>
														編集するには「<a href="/{data.username}/spaces" class="text-blue-600 hover:underline">スペース管理</a>」から設定してください。
													</p>
												</div>
											{:else if section.type === 'course-info'}
												<div class="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
													<div class="font-medium mb-1">📌 コース情報自動表示</div>
													<p class="text-gray-500">
														コースのタイトル、説明、サムネイル、価格が自動的に表示されます。<br>
														編集するには「<a href="/{data.username}/courses/{data.courseId}/edit" class="text-blue-600 hover:underline">コース編集</a>」から設定してください。
													</p>
												</div>
											{:else if section.type === 'lessons-list'}
												<div class="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
													<div class="font-medium mb-1">📌 レッスン一覧自動表示</div>
													<p class="text-gray-500">
														レッスン管理ページで作成したレッスンが自動的に表示されます。<br>
														編集するには「<a href="/{data.username}/courses/{data.courseId}/lessons" class="text-blue-600 hover:underline">レッスン管理</a>」から設定してください。
													</p>
												</div>
											{:else if section.type === 'space-footer'}
												<div class="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
													<div class="font-medium mb-1">📌 スペースフッター自動表示</div>
													<p class="text-gray-500">
														スペース設定のフッター情報が自動的に表示されます。<br>
														編集するには「<a href="/{data.username}/spaces" class="text-blue-600 hover:underline">スペース管理</a>」から設定してください。
													</p>
												</div>
											{:else}
												<input
													type="text"
													bind:value={section.title}
													class="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
													placeholder="タイトル"
												/>
											{/if}
											{#if section.type !== 'features' && section.type !== 'learning-outcomes' && section.type !== 'space-header' && section.type !== 'course-info'}
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
						<p class="text-xs text-gray-500 mt-1">※ 実際のページと同じ表示です</p>
					</div>

					<!-- プレビューコンテンツ -->
					<div class="min-h-screen bg-gray-50">
						<!-- トップナビゲーション（固定） -->
						<nav class="bg-white shadow-sm border-b">
							<div class="max-w-7xl mx-auto px-6 py-4">
								<div class="flex justify-between items-center">
									<!-- 左側：スペース名とコース名 -->
									<div class="flex items-center space-x-2">
										<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background-color: {themeColor}">
											<span class="text-white font-bold text-sm">{space?.title?.charAt(0) || 'S'}</span>
										</div>
										<div class="flex items-center space-x-2 text-sm text-gray-600">
											<span class="hover:text-gray-900 font-medium transition-colors">
												{space?.title || 'スペース名'}
											</span>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
											</svg>
											<span class="text-gray-900 font-medium">{course?.title || 'コース名'}</span>
										</div>
									</div>

									<!-- 右側：生徒向けアクションボタン（プレビュー） -->
									<div class="flex items-center space-x-4">
										<button class="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">
											ログイン
										</button>
										<button
											class="text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
											style="background-color: {themeColor}"
										>
											生徒登録
										</button>
									</div>
								</div>
							</div>
						</nav>

						<!-- ヘッダー（固定） -->
						<header
							class="py-16 text-white relative overflow-hidden"
							style="background: linear-gradient(135deg, {themeColor}, color-mix(in srgb, {themeColor} 80%, transparent))"
						>
							<div class="absolute inset-0 bg-black opacity-10"></div>
							<div class="relative container mx-auto px-6">
								<div class="max-w-4xl mx-auto">
									<div class="flex flex-col lg:flex-row lg:items-start lg:space-x-8">
										<div class="flex-1">
											<h1 class="text-4xl font-bold mb-4">{course?.title || 'コースタイトル'}</h1>
											<p class="text-xl text-white/90 mb-6">{course?.description || 'コースの説明がここに表示されます'}</p>

											<!-- コース統計 -->
											<div class="flex flex-wrap gap-6 text-white/90 mb-6">
												<div class="flex items-center">
													<svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
													</svg>
													{lessons?.length || 0} レッスン
												</div>
												<div class="flex items-center">
													<svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
													</svg>
													{Math.floor((lessons?.reduce((sum, l) => sum + (l.duration || 0), 0) || 0) / 60)}:{String((lessons?.reduce((sum, l) => sum + (l.duration || 0), 0) || 0) % 60).padStart(2, '0')}
												</div>
											</div>
										</div>

										<!-- 価格・アクションエリア -->
										<div class="lg:w-80">
											<div class="bg-white/10 backdrop-blur-sm rounded-lg p-6">
												{#if course?.is_free}
													<div class="text-center mb-4">
														<span class="text-2xl font-bold">無料コース</span>
													</div>
												{:else}
													<div class="text-center mb-4">
														<div class="text-3xl font-bold">¥{(course?.price || 0).toLocaleString()}</div>
													</div>
												{/if}

												<button class="block w-full text-center bg-white text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
													{course?.is_free ? '学習を始める' : '今すぐ購入'}
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						</header>

						<!-- カスタムセクション -->
						{#each sections as section}
							<div class="border-b border-gray-100 last:border-b-0">
								{#if section.type === 'space-header'}
									<!-- スペースヘッダー（スペース設定から自動表示） -->
									{#if space?.landing_page_content?.sections}
										{@const headerSection = space.landing_page_content.sections.find(s => s.type === 'hero' || s.type === 'header')}
										{#if headerSection}
											<section
												class="py-20 relative overflow-hidden"
												style="background-color: {headerSection.backgroundColor || themeColor}"
											>
												<div class="px-6 max-w-5xl mx-auto relative z-10">
													<div class="text-center">
														<h1 class="text-5xl font-bold mb-6" style="color: {headerSection.textColor || '#ffffff'}">
															{headerSection.title || space.title}
														</h1>
														<p class="text-xl mb-8 opacity-90" style="color: {headerSection.textColor || '#ffffff'}">
															{headerSection.content || space.description || ''}
														</p>
													</div>
												</div>
											</section>
										{:else}
											<!-- デフォルトヘッダー -->
											<section
												class="py-20 relative overflow-hidden"
												style="background: linear-gradient(135deg, {themeColor}, color-mix(in srgb, {themeColor} 80%, transparent))"
											>
												<div class="px-6 max-w-5xl mx-auto relative z-10">
													<div class="text-center">
														<h1 class="text-5xl font-bold text-white mb-6">
															{space.title}
														</h1>
														<p class="text-xl text-white/90 mb-8">
															{space.description || 'オンライン学習スペース'}
														</p>
													</div>
												</div>
											</section>
										{/if}
									{:else}
										<!-- デフォルトヘッダー（スペース情報がない場合） -->
										<section
											class="py-20 relative overflow-hidden"
											style="background: linear-gradient(135deg, {themeColor}, color-mix(in srgb, {themeColor} 80%, transparent))"
										>
											<div class="px-6 max-w-5xl mx-auto relative z-10">
												<div class="text-center">
													<h1 class="text-5xl font-bold text-white mb-6">
														{space?.title || 'スペース名'}
													</h1>
													<p class="text-xl text-white/90 mb-8">
														{space?.description || 'オンライン学習スペース'}
													</p>
												</div>
											</div>
										</section>
									{/if}
								{:else if section.type === 'course-info'}
									<!-- コース基本情報 -->
									<section class="py-12" style="background-color: {section.backgroundColor || '#ffffff'}">
										<div class="px-6 max-w-5xl mx-auto">
											<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
												<!-- サムネイル -->
												<div>
													{#if course?.thumbnail_url}
														<img src={course.thumbnail_url} alt={course.title} class="w-full aspect-video object-cover rounded-lg shadow-lg" />
													{:else}
														<div class="w-full aspect-video bg-gray-200 rounded-lg shadow-lg flex items-center justify-center">
															<svg class="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
															</svg>
														</div>
													{/if}
												</div>

												<!-- コース情報 -->
												<div>
													<h1 class="text-4xl font-bold mb-4" style="color: {section.textColor || '#111827'}">{course?.title}</h1>
													<p class="text-lg text-gray-600 mb-6">{course?.description || 'コースの説明がここに表示されます'}</p>

													<div class="space-y-3 mb-6">
														<div class="flex items-center text-gray-700">
															<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
															</svg>
															{#if course?.is_free}
																<span class="font-semibold text-green-600">無料</span>
															{:else if course?.price}
																<span class="font-semibold">¥{course.price.toLocaleString()}</span>
															{:else}
																<span class="text-gray-500">価格未設定</span>
															{/if}
														</div>

														<div class="flex items-center text-gray-700">
															<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
															</svg>
															<span>{course?.is_published ? '公開中' : '非公開'}</span>
														</div>
													</div>

													<button class="w-full py-3 px-6 rounded-lg font-semibold text-white text-lg hover:opacity-90 transition-opacity" style="background-color: {themeColor}">
														{course?.is_free ? 'このコースを受講する' : 'このコースを購入する'}
													</button>
												</div>
											</div>
										</div>
									</section>
								{:else if section.type === 'lessons-list'}
									<!-- レッスン一覧（レッスン管理から自動表示） -->
									<section class="py-12" style="background-color: {section.backgroundColor || '#ffffff'}">
										<div class="px-6 max-w-5xl mx-auto">
											<h2 class="text-3xl font-bold mb-8 text-center" style="color: {section.textColor || '#111827'}">{section.title}</h2>
											{#if lessons.length === 0}
												<div class="text-center py-12">
													<svg class="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
													</svg>
													<p class="text-gray-500 text-lg mb-2">レッスンがまだありません</p>
													<p class="text-gray-400 text-sm mb-6">レッスン管理ページからレッスンを追加してください</p>
													<a
														href="/{data.username}/courses/{data.courseId}/lessons"
														class="inline-block px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
														style="background-color: {themeColor}"
													>
														レッスンを追加
													</a>
												</div>
											{:else}
												<div class="space-y-4">
													{#each lessons as lesson, index}
														<div class="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
															<div class="flex items-start space-x-4">
																<!-- レッスン番号 -->
																<div class="flex-shrink-0">
																	<div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" style="background-color: {themeColor}">
																		{index + 1}
																	</div>
																</div>

																<!-- レッスン内容 -->
																<div class="flex-1 min-w-0">
																	<div class="flex items-center justify-between mb-2">
																		<h3 class="text-xl font-bold text-gray-900">{lesson.title}</h3>
																		<div class="flex items-center space-x-2">
																			{#if lesson.duration}
																				<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
																					<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
																					</svg>
																					{Math.round(lesson.duration / 60)}分
																				</span>
																			{/if}
																			{#if !lesson.is_published}
																				<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
																					非公開
																				</span>
																			{/if}
																		</div>
																	</div>

																	{#if lesson.description}
																		<p class="text-gray-600 mb-3">{lesson.description}</p>
																	{/if}

																	<div class="flex items-center text-sm text-gray-500">
																		{#if lesson.video_type === 'youtube'}
																			<svg class="w-4 h-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 24 24">
																				<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
																			</svg>
																			<span>YouTube動画</span>
																		{:else if lesson.content}
																			<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
																			</svg>
																			<span>テキストコンテンツ</span>
																		{/if}
																	</div>
																</div>
															</div>
														</div>
													{/each}
												</div>

												<!-- レッスン管理へのリンク -->
												<div class="mt-8 text-center">
													<a
														href="/{data.username}/courses/{data.courseId}/lessons"
														class="inline-flex items-center text-sm hover:underline"
														style="color: {themeColor}"
													>
														<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
														</svg>
														レッスンを編集
													</a>
												</div>
											{/if}
										</div>
									</section>
								{:else if section.type === 'overview' || section.type === 'prerequisites' || section.type === 'target-audience' || section.type === 'text'}
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
								{:else if section.type === 'space-footer'}
									<!-- スペースフッター（スペース設定から自動表示） -->
									{#if space?.landing_page_content?.sections}
										{@const footerSection = space.landing_page_content.sections.find(s => s.type === 'footer')}
										{#if footerSection}
											<footer class="py-8" style="background-color: {footerSection.backgroundColor || '#1f2937'}; color: {footerSection.textColor || '#ffffff'}">
												<div class="container mx-auto px-6">
													<div class="max-w-7xl mx-auto">
														<div class="text-center">
															<p class="text-sm opacity-80">{footerSection.content}</p>
														</div>
													</div>
												</div>
											</footer>
										{:else}
											<!-- デフォルトフッター -->
											<footer class="py-8 bg-gray-800 text-white">
												<div class="container mx-auto px-6">
													<div class="max-w-7xl mx-auto">
														<div class="text-center">
															<p class="text-sm opacity-80">© {new Date().getFullYear()} {space?.title || 'スペース名'}. All rights reserved.</p>
														</div>
													</div>
												</div>
											</footer>
										{/if}
									{:else}
										<!-- デフォルトフッター（スペース情報がない場合） -->
										<footer class="py-8 bg-gray-800 text-white">
											<div class="container mx-auto px-6">
												<div class="max-w-7xl mx-auto">
													<div class="text-center">
														<p class="text-sm opacity-80">© {new Date().getFullYear()} {space?.title || 'スペース名'}. All rights reserved.</p>
													</div>
												</div>
											</div>
										</footer>
									{/if}
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
