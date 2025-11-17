<script lang="ts">
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username
	$: course = data.course
	$: purchasers = data.purchasers || []

	function formatDate(dateString: string): string {
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

	function getStatusBadge(status: string) {
		switch (status) {
			case 'completed':
				return { class: 'bg-green-100 text-green-800', text: '完了' }
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
				<span>価格: {course.is_free ? '無料' : formatCurrency(course.price, course.currency)}</span>
				<span>購入者数: {purchasers.length}人</span>
			</div>
		</div>
	</div>

	<!-- 購入者一覧 -->
	<div class="bg-white rounded-lg shadow">
		<div class="px-6 py-4 border-b border-gray-200">
			<h2 class="text-lg font-semibold text-gray-900">購入者一覧</h2>
		</div>

		{#if purchasers.length === 0}
			<div class="text-center py-12">
				<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">購入者がいません</h3>
				<p class="mt-1 text-sm text-gray-500">このコースはまだ購入されていません</p>
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
								購入金額
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								ステータス
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								購入日時
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								決済ID
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each purchasers as purchaser}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">
										{purchaser.display_name || purchaser.username || '-'}
									</div>
									<div class="text-sm text-gray-500">
										{purchaser.email}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{formatCurrency(purchaser.amount, purchaser.currency)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{@const badge = getStatusBadge(purchaser.status)}
									<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {badge.class}">
										{badge.text}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{formatDate(purchaser.purchased_at)}
								</td>
								<td class="px-6 py-4 text-sm text-gray-500">
									{#if purchaser.stripe_payment_intent_id}
										<div class="max-w-xs truncate" title={purchaser.stripe_payment_intent_id}>
											{purchaser.stripe_payment_intent_id}
										</div>
									{:else}
										<span class="text-gray-400">-</span>
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
						合計 {purchasers.length} 人が購入しています
					</p>
					<div class="text-sm font-medium text-gray-900">
						総売上: {formatCurrency(
							purchasers
								.filter(p => p.status === 'completed')
								.reduce((sum, p) => sum + p.amount, 0),
							course.currency
						)}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
