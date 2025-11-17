<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username

	let spaces: any[] = []
	let selectedSpaceId: string = ''
	let students: any[] = []
	let loading = true
	let loadingStudents = false
	let error = ''
	let successMessage = ''

	onMount(async () => {
		await loadSpaces()
	})

	async function loadSpaces() {
		loading = true
		try {
			if (!username) {
				error = 'ユーザー名が必要です'
				return
			}

			// APIからスペース情報を取得
			const response = await fetch(`/api/spaces?username=${username}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || 'スペースの取得に失敗しました')
			}

			spaces = result.spaces || []

			// 最初のスペースを自動選択
			if (spaces.length > 0 && !selectedSpaceId) {
				selectedSpaceId = spaces[0].id
				await loadStudents()
			}
		} catch (err: any) {
			error = err.message
			console.error('Load spaces error:', err)
		} finally {
			loading = false
		}
	}

	async function loadStudents() {
		if (!selectedSpaceId) return

		loadingStudents = true
		error = ''

		try {
			const response = await fetch(`/api/students?spaceId=${selectedSpaceId}`)
			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '生徒の取得に失敗しました')
			}

			students = result.students || []
		} catch (err: any) {
			error = err.message
			console.error('Load students error:', err)
		} finally {
			loadingStudents = false
		}
	}

	async function handleSpaceChange(event: Event) {
		const target = event.target as HTMLSelectElement
		selectedSpaceId = target.value
		await loadStudents()
	}

	async function removeStudent(studentId: string) {
		if (!confirm('この生徒をスペースから削除しますか？')) {
			return
		}

		try {
			const response = await fetch(`/api/students`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					spaceId: selectedSpaceId,
					studentId
				})
			})

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || '生徒の削除に失敗しました')
			}

			successMessage = '生徒を削除しました'
			await loadStudents()
		} catch (err: any) {
			error = err.message
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString)
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}
</script>

<div class="max-w-7xl mx-auto">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">生徒管理</h1>
		<p class="mt-2 text-gray-600">スペースに登録されている生徒を管理できます</p>
	</div>

	{#if successMessage}
		<div class="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
			<svg class="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
			<div>
				<p class="font-medium">成功</p>
				<p class="text-sm mt-1">{successMessage}</p>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if spaces.length === 0}
		<div class="text-center py-12 bg-white rounded-lg shadow">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">スペースがありません</h3>
			<p class="mt-1 text-sm text-gray-500">まずスペースを作成してください</p>
			<div class="mt-6">
				<a
					href="/{username}/spaces/create"
					class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
				>
					<svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
					</svg>
					スペースを作成
				</a>
			</div>
		</div>
	{:else}
		<!-- スペース選択 -->
		<div class="mb-6 bg-white rounded-lg shadow p-6">
			<label for="space-select" class="block text-sm font-medium text-gray-700 mb-2">
				スペースを選択
			</label>
			<select
				id="space-select"
				bind:value={selectedSpaceId}
				on:change={handleSpaceChange}
				class="block w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
			>
				{#each spaces as space}
					<option value={space.id}>{space.title}</option>
				{/each}
			</select>
		</div>

		<!-- 生徒一覧 -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">登録生徒一覧</h2>
			</div>

			{#if loadingStudents}
				<div class="flex justify-center items-center h-64">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			{:else if students.length === 0}
				<div class="text-center py-12">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">生徒がいません</h3>
					<p class="mt-1 text-sm text-gray-500">このスペースにはまだ生徒が登録されていません</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									メールアドレス
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									ユーザー名
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									ステータス
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									登録日
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									アクション
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each students as student}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{student.email}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{student.username || '-'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										{#if student.status === 'active'}
											<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
												アクティブ
											</span>
										{:else if student.status === 'inactive'}
											<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
												非アクティブ
											</span>
										{:else}
											<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
												停止中
											</span>
										{/if}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{formatDate(student.enrolled_at || student.created_at)}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<button
											on:click={() => removeStudent(student.student_id)}
											class="text-red-600 hover:text-red-900"
										>
											削除
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
					<p class="text-sm text-gray-500">
						合計 {students.length} 人の生徒が登録されています
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
