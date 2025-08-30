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
		estimatedDurationHours: 1,
		isPublished: false
	}
	let loading = false
	let error = ''
	let slugError = ''
	
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
				.select('id, title, slug')
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
		const { data: existingCourse } = await supabase
			.from('courses')
			.select('id')
			.eq('space_id', formData.spaceId)
			.eq('slug', formData.slug)
			.single()
		
		if (existingCourse) {
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
			
			// 現在のスキーマではslugカラムがないため、バリデーションをスキップ
			// const isValidSlug = await validateSlug()
			// if (!isValidSlug) {
			// 	loading = false
			// 	return
			// }
			
			// スラッグを生成
			const slug = formData.title
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-')
				.replace(/--+/g, '-')
				.trim()

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
					sections: [
						{
							id: 'hero',
							type: 'hero',
							content: {
								title: formData.title,
								subtitle: formData.description || 'このコースで新しいスキルを習得しましょう',
								backgroundImage: null
							}
						},
						{
							id: 'features',
							type: 'features',
							content: {
								title: 'コース特徴',
								features: [
									{
										title: '実践的な内容',
										description: '現場で使える実践的なスキルを身に付けます',
										icon: 'academic-cap'
									},
									{
										title: 'わかりやすい解説',
										description: '初心者にもわかりやすい丁寧な解説',
										icon: 'user-group'
									},
									{
										title: 'サポート充実',
										description: '学習をしっかりとサポートします',
										icon: 'shield-check'
									}
								]
							}
						}
					],
					metadata: {
						title: formData.title,
						description: formData.description || `${formData.title}で新しいスキルを習得`,
						seoTitle: `${formData.title} | オンラインコース`,
						seoDescription: formData.description || `${formData.title}で新しいスキルを身に付けませんか？`
					},
					theme: {
						primaryColor: '#3B82F6',
						accentColor: '#F59E0B',
						backgroundColor: '#F9FAFB',
						textColor: '#111827'
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
	
	<div class="max-w-2xl">
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
						<input
							id="slug"
							type="text"
							bind:value={formData.slug}
							on:blur={validateSlug}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="javascript-basics"
						/>
						{#if slugError}
							<p class="mt-1 text-sm text-red-600">{slugError}</p>
						{:else}
							<p class="mt-1 text-sm text-gray-500">
								英数字、アンダースコア、ハイフンのみ使用可能です
							</p>
						{/if}
					</div>
					
					<div>
						<label for="estimatedDurationHours" class="block text-sm font-medium text-gray-700 mb-2">
							推定学習時間（時間）
						</label>
						<input
							id="estimatedDurationHours"
							type="number"
							bind:value={formData.estimatedDurationHours}
							min="1"
							max="1000"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					
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
</div>