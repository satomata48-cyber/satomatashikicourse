<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: uuid = $page.params.uuid
	
	let formData = {
		title: '',
		description: '',
		slug: '',
		maxStudents: 1000
	}
	let loading = false
	let error = ''
	let slugError = ''
	
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
		
		// 重複チェック
		const { data: existingSpace } = await supabase
			.from('spaces')
			.select('id')
			.eq('instructor_id', data.user.id)
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
					instructor_id: data.user.id,
					title: formData.title,
					description: formData.description,
					slug: formData.slug,
					max_students: formData.maxStudents,
					landing_page_content: {
						sections: [],
						metadata: {
							title: formData.title,
							description: formData.description
						},
						theme: {
							primaryColor: '#3B82F6',
							accentColor: '#F59E0B'
						}
					}
				})
				.select()
				.single()
			
			if (createError) throw createError
			
			goto(`/${uuid}/spaces/${space.slug}`)
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
	
	<div class="max-w-2xl">
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
							/{uuid}/space/
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
				
				<div class="flex space-x-4 pt-4">
					<button
						type="button"
						on:click={() => goto(`/${uuid}/spaces`)}
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
</div>