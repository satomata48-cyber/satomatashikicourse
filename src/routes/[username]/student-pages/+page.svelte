<script lang="ts">
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username
	$: spaces = data.spaces || []
	$: allStudents = data.students || []

	// フィルタとソート
	let selectedSpaceId: string = ''
	let purchaseFilter: string = 'all' // all, purchased, unpurchased
	let sortBy: string = 'enrolled_date' // enrolled_date, email, purchases, spent

	// フィルタリングとソート
	$: filteredAndSortedStudents = (() => {
		let result = [...allStudents]

		// スペースでフィルタ
		if (selectedSpaceId) {
			result = result.filter(s => s.space_id === selectedSpaceId)
		}

		// 購入状況でフィルタ
		if (purchaseFilter === 'purchased') {
			result = result.filter(s => s.total_purchases > 0)
		} else if (purchaseFilter === 'unpurchased') {
			result = result.filter(s => s.total_purchases === 0)
		}

		// ソート
		result.sort((a, b) => {
			switch (sortBy) {
				case 'email':
					return (a.email || '').localeCompare(b.email || '')
				case 'purchases':
					return (b.total_purchases || 0) - (a.total_purchases || 0)
				case 'spent':
					return (b.total_spent || 0) - (a.total_spent || 0)
				case 'enrolled_date':
				default:
					return new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()
			}
		})

		return result
	})()

	function formatDate(dateString: string): string {
		const date = new Date(dateString)
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: 'JPY'
		}).format(amount || 0)
	}
</script>

<div class="max-w-7xl mx-auto">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">生徒管理</h1>
		<p class="mt-2 text-gray-600">全スペースの生徒を一覧で管理できます</p>
	</div>

	{#if spaces.length === 0}
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
		<!-- フィルタ・ソートコントロール -->
		<div class="bg-white rounded-lg shadow p-6 mb-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- スペースフィルタ -->
				<div>
					<label for="space-filter" class="block text-sm font-medium text-gray-700 mb-2">
						スペースで絞り込み
					</label>
					<select
						id="space-filter"
						bind:value={selectedSpaceId}
						class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="">すべてのスペース</option>
						{#each spaces as space}
							<option value={space.id}>{space.title}</option>
						{/each}
					</select>
				</div>

				<!-- 購入状況フィルタ -->
				<div>
					<label for="purchase-filter" class="block text-sm font-medium text-gray-700 mb-2">
						購入状況で絞り込み
					</label>
					<select
						id="purchase-filter"
						bind:value={purchaseFilter}
						class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">すべて</option>
						<option value="purchased">購入あり</option>
						<option value="unpurchased">購入なし</option>
					</select>
				</div>

				<!-- ソート -->
				<div>
					<label for="sort-by" class="block text-sm font-medium text-gray-700 mb-2">
						並び替え
					</label>
					<select
						id="sort-by"
						bind:value={sortBy}
						class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="enrolled_date">登録日（新しい順）</option>
						<option value="email">メールアドレス順</option>
						<option value="purchases">購入数順</option>
						<option value="spent">購入金額順</option>
					</select>
				</div>
			</div>

			<div class="mt-4 flex items-center justify-between text-sm text-gray-600">
				<span>
					{filteredAndSortedStudents.length} 人の生徒を表示中
					{#if selectedSpaceId || purchaseFilter !== 'all'}
						<span class="text-blue-600">（フィルタ適用中）</span>
					{/if}
				</span>
				{#if selectedSpaceId || purchaseFilter !== 'all'}
					<button
						on:click={() => {
							selectedSpaceId = ''
							purchaseFilter = 'all'
						}}
						class="text-blue-600 hover:text-blue-800"
					>
						フィルタをクリア
					</button>
				{/if}
			</div>
		</div>

		<!-- 生徒一覧テーブル -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900">生徒一覧</h2>
			</div>

			{#if filteredAndSortedStudents.length === 0}
				<div class="text-center py-12">
					<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
					</svg>
					<h3 class="mt-2 text-sm font-medium text-gray-900">該当する生徒がいません</h3>
					<p class="mt-1 text-sm text-gray-500">フィルタ条件を変更してください</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									生徒情報
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									スペース
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									購入数
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									総購入額
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									登録日
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									ステータス
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each filteredAndSortedStudents as student}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm font-medium text-gray-900">
											{student.display_name || student.email || '-'}
										</div>
										<div class="text-sm text-gray-500">
											{student.email}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-900">{student.space_title}</div>
										<div class="text-xs text-gray-500">/{student.space_slug}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{#if student.total_purchases > 0}
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
												{student.total_purchases}件
											</span>
										{:else}
											<span class="text-gray-400">-</span>
										{/if}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{#if student.total_spent > 0}
											{formatCurrency(student.total_spent)}
										{:else}
											<span class="text-gray-400">-</span>
										{/if}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{formatDate(student.enrolled_at)}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										{#if student.student_status === 'active'}
											<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
												アクティブ
											</span>
										{:else if student.student_status === 'inactive'}
											<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
												非アクティブ
											</span>
										{:else}
											<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
												停止中
											</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
					<div class="flex justify-between items-center">
						<p class="text-sm text-gray-500">
							合計 {allStudents.length} 人の生徒が登録されています
						</p>
						<div class="text-sm text-gray-900">
							総売上: {formatCurrency(
								allStudents.reduce((sum, s) => sum + (s.total_spent || 0), 0)
							)}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
