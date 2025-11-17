<script lang="ts">
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username
	$: course = data.course
	$: space = data.space
	$: students = data.students || []

	// 購入済みと未購入を分ける
	$: purchasedStudents = students.filter(s => s.purchase_id)
	$: unpurchasedStudents = students.filter(s => !s.purchase_id)

	function formatDate(dateString: string | null): string {
		if (!dateString) return '-'
		const date = new Date(dateString)
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	function formatCurrency(amount: number, currency: string = 'JPY'): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: currency
		}).format(amount)
	}

	function getPurchaseStatusBadge(status: string | null) {
		if (!status) {
			return { class: 'bg-gray-100 text-gray-800', text: '未購入' }
		}
		switch (status) {
			case 'completed':
				return { class: 'bg-green-100 text-green-800', text: '購入済み' }
			case 'pending':
				return { class: 'bg-yellow-100 text-yellow-800', text: '保留中' }
			case 'failed':
				return { class: 'bg-red-100 text-red-800', text: '失敗' }
			case 'refunded':
				return { class: 'bg-gray-100 text-gray-800', text: '返金済み' }
			default:
				return { class: 'bg-gray-100 text-gray-800', text: status }
		}
	}
</script>

<div class="max-w-7xl mx-auto">
	<!-- ヘッダー -->
	<div class="mb-8">
		<div class="flex items-center mb-4">
			<a
				href="/{username}/courses"
				class="text-blue-600 hover:text-blue-800 mr-4"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
				</svg>
			</a>
			<h1 class="text-3xl font-bold text-gray-900">購入者管理</h1>
		</div>
		<div class="bg-white rounded-lg shadow p-4">
			<h2 class="text-xl font-semibold text-gray-900 mb-2">{course.title}</h2>
			<div class="flex items-center space-x-4 text-sm text-gray-600">
				<span>スペース: {space?.title || '-'}</span>
				<span>価格: {course.is_free ? '無料' : formatCurrency(course.price, course.currency)}</span>
				<span>購入済み: {purchasedStudents.length}人</span>
				<span>未購入: {unpurchasedStudents.length}人</span>
			</div>
		</div>
	</div>

	<!-- 生徒一覧（購入状況込み） -->
	<div class="bg-white rounded-lg shadow">
		<div class="px-6 py-4 border-b border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900">スペース生徒一覧（購入状況）</h2>
			<p class="text-sm text-gray-500 mt-1">このスペースに登録されている全生徒と購入状況を表示します</p>
		</div>

		{#if students.length === 0}
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
								生徒情報
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								購入状況
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								購入金額
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								購入日時
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								スペース登録日
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each students as student}
							{@const badge = getPurchaseStatusBadge(student.purchase_status)}
							<tr class="hover:bg-gray-50 {student.purchase_id ? 'bg-green-50/30' : ''}">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<div>
											<div class="text-sm font-medium text-gray-900">
												{student.display_name || student.username || '-'}
											</div>
											<div class="text-sm text-gray-500">
												{student.email}
											</div>
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {badge.class}">
										{badge.text}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{#if student.purchase_id}
										{formatCurrency(student.amount || 0, student.currency || 'JPY')}
									{:else}
										<span class="text-gray-400">-</span>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{formatDate(student.purchased_at)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{formatDate(student.enrolled_at)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
				<div class="flex justify-between items-center">
					<p class="text-sm text-gray-500">
						合計 {students.length} 人中 {purchasedStudents.length} 人が購入済み
					</p>
					<div class="text-sm font-medium text-gray-900">
						総売上: {formatCurrency(
							purchasedStudents
								.filter(s => s.purchase_status === 'completed')
								.reduce((sum, s) => sum + (s.amount || 0), 0),
							course.currency
						)}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
