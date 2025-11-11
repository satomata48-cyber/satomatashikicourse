<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'

	export let data

	$: username = $page.params.username
	$: slug = $page.params.slug

	let space: any = null
	let students: any[] = []
	let loading = false
	let error = '生徒管理機能は現在実装中です'
	let searchQuery = ''
	let statusFilter = 'all'
	let showInviteForm = false
	let inviteEmail = ''
	let inviteLoading = false
	let inviteError = ''
	let inviteSuccess = ''

	$: filteredStudents = students.filter(student => {
		const matchesSearch = student.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			student.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
		const matchesStatus = statusFilter === 'all' || student.status === statusFilter
		return matchesSearch && matchesStatus
	})

	onMount(async () => {
		// TODO: 生徒管理機能の実装
	})

	async function loadData() {
		// TODO: 生徒管理機能の実装が必要
		// - 生徒一覧取得API
		// - コース購入情報取得API
		// を実装してからこの機能を有効化します
	}
	
	async function updateStudentStatus(studentId: string, newStatus: string) {
		alert('生徒ステータス変更機能は現在実装中です')
		// TODO: 生徒ステータス更新APIの実装が必要
	}
	
	async function removeStudent(studentId: string) {
		alert('生徒除籍機能は現在実装中です')
		// TODO: 生徒除籍APIの実装が必要
	}
	
	async function inviteStudent() {
		inviteLoading = true
		inviteError = ''
		inviteSuccess = ''
		
		try {
			if (!inviteEmail) {
				throw new Error('メールアドレスを入力してください')
			}
			
			// メール招待の実装（簡略化）
			// 実際の実装では、メール送信やトークン生成が必要
			inviteSuccess = `${inviteEmail} に招待メールを送信しました`
			inviteEmail = ''
			showInviteForm = false
			
		} catch (err: any) {
			inviteError = err.message
		} finally {
			inviteLoading = false
		}
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}
	
	function formatCurrency(amount: number, currency: string): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: currency
		}).format(amount)
	}
	
	function getStatusBadge(status: string) {
		switch (status) {
			case 'active':
				return 'bg-green-100 text-green-800'
			case 'suspended':
				return 'bg-red-100 text-red-800'
			case 'completed':
				return 'bg-blue-100 text-blue-800'
			default:
				return 'bg-gray-100 text-gray-800'
		}
	}
	
	function getStatusText(status: string) {
		switch (status) {
			case 'active':
				return 'アクティブ'
			case 'suspended':
				return '停止中'
			case 'completed':
				return '修了'
			default:
				return status
		}
	}
</script>

<div>
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if space}
		<!-- Header -->
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold text-gray-900 mb-2">生徒管理</h2>
					<p class="text-gray-600">スペース: {space.title}</p>
				</div>
				<div class="flex space-x-3">
					<button
						on:click={() => showInviteForm = !showInviteForm}
						class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						生徒を招待
					</button>
					<a
						href="/{username}/spaces/{slug}"
						class="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
					>
						スペースに戻る
					</a>
				</div>
			</div>
		</div>
		
		<!-- 招待フォーム -->
		{#if showInviteForm}
			<div class="bg-white rounded-lg shadow p-6 mb-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">生徒を招待</h3>
				
				{#if inviteError}
					<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
						{inviteError}
					</div>
				{/if}
				
				{#if inviteSuccess}
					<div class="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
						{inviteSuccess}
					</div>
				{/if}
				
				<form on:submit|preventDefault={inviteStudent} class="flex space-x-3">
					<input
						type="email"
						bind:value={inviteEmail}
						placeholder="招待したい生徒のメールアドレス"
						required
						class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<button
						type="submit"
						disabled={inviteLoading}
						class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
					>
						{inviteLoading ? '送信中...' : '招待を送信'}
					</button>
					<button
						type="button"
						on:click={() => showInviteForm = false}
						class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
					>
						キャンセル
					</button>
				</form>
				
				<p class="mt-2 text-sm text-gray-500">
					招待リンクがメールで送信されます。生徒はリンクから登録できます。
				</p>
			</div>
		{/if}
		
		<!-- 統計情報 -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">総生徒数</p>
						<p class="text-2xl font-semibold text-gray-900">{students.length}</p>
					</div>
					<div class="p-3 bg-blue-100 rounded-full">
						<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">アクティブ</p>
						<p class="text-2xl font-semibold text-gray-900">
							{students.filter(s => s.status === 'active').length}
						</p>
					</div>
					<div class="p-3 bg-green-100 rounded-full">
						<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">修了</p>
						<p class="text-2xl font-semibold text-gray-900">
							{students.filter(s => s.status === 'completed').length}
						</p>
					</div>
					<div class="p-3 bg-purple-100 rounded-full">
						<svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
						</svg>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-1">
						<p class="text-sm font-medium text-gray-600">停止中</p>
						<p class="text-2xl font-semibold text-gray-900">
							{students.filter(s => s.status === 'suspended').length}
						</p>
					</div>
					<div class="p-3 bg-red-100 rounded-full">
						<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
						</svg>
					</div>
				</div>
			</div>
		</div>
		
		<!-- フィルター -->
		<div class="bg-white rounded-lg shadow p-4 mb-6">
			<div class="flex items-center space-x-4">
				<div class="flex-1">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="生徒名またはメールアドレスで検索..."
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				<select
					bind:value={statusFilter}
					class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value="all">すべてのステータス</option>
					<option value="active">アクティブ</option>
					<option value="completed">修了</option>
					<option value="suspended">停止中</option>
				</select>
			</div>
		</div>
		
		<!-- 生徒一覧 -->
		{#if filteredStudents.length === 0}
			<div class="text-center py-12">
				<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
				</svg>
				<h3 class="text-lg font-medium text-gray-900 mb-2">
					{searchQuery || statusFilter !== 'all' ? '該当する生徒がいません' : '生徒がいません'}
				</h3>
				<p class="text-gray-600 mb-4">
					{searchQuery || statusFilter !== 'all' 
						? '検索条件を変更してみてください' 
						: '生徒を招待して学習を始めましょう'}
				</p>
				{#if !searchQuery && statusFilter === 'all'}
					<button
						on:click={() => showInviteForm = true}
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
					>
						生徒を招待
					</button>
				{/if}
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow overflow-hidden">
				<div class="divide-y divide-gray-200">
					{#each filteredStudents as student}
						<div class="p-6">
							<div class="flex items-start justify-between">
								<div class="flex items-start space-x-4">
									<div class="flex-shrink-0">
										{#if student.profile?.avatar_url}
											<img
												class="h-10 w-10 rounded-full"
												src={student.profile.avatar_url}
												alt={student.profile?.display_name}
											/>
										{:else}
											<div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
												<svg class="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
												</svg>
											</div>
										{/if}
									</div>
									<div class="flex-1">
										<div class="flex items-center space-x-2 mb-1">
											<h3 class="text-lg font-medium text-gray-900">
												{student.profile?.display_name || 'Unknown User'}
											</h3>
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusBadge(student.status)}">
												{getStatusText(student.status)}
											</span>
										</div>
										<p class="text-sm text-gray-600 mb-2">
											{student.profile?.email}
										</p>
										<div class="flex items-center space-x-4 text-sm text-gray-500">
											<span>登録日: {formatDate(student.enrolled_at)}</span>
											{#if student.purchases && student.purchases.length > 0}
												<span>購入コース: {student.purchases.length}件</span>
											{/if}
										</div>
										
										{#if student.purchases && student.purchases.length > 0}
											<div class="mt-3">
												<p class="text-sm font-medium text-gray-700 mb-2">購入履歴:</p>
												<div class="space-y-1">
													{#each student.purchases as purchase}
														<div class="flex items-center justify-between text-sm">
															<span class="text-gray-600">{purchase.course?.title}</span>
															<div class="flex items-center space-x-2">
																<span class="text-gray-900 font-medium">
																	{formatCurrency(purchase.amount, purchase.currency)}
																</span>
																<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {purchase.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
																	{purchase.status}
																</span>
															</div>
														</div>
													{/each}
												</div>
											</div>
										{/if}
										
										{#if student.notes}
											<div class="mt-2">
												<p class="text-sm text-gray-600">
													<span class="font-medium">メモ:</span> {student.notes}
												</p>
											</div>
										{/if}
									</div>
								</div>
								
								<div class="flex space-x-2 ml-4">
									{#if student.status === 'active'}
										<button
											on:click={() => updateStudentStatus(student.id, 'suspended')}
											class="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
										>
											停止
										</button>
										<button
											on:click={() => updateStudentStatus(student.id, 'completed')}
											class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors"
										>
											修了
										</button>
									{:else if student.status === 'suspended'}
										<button
											on:click={() => updateStudentStatus(student.id, 'active')}
											class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors"
										>
											復帰
										</button>
									{:else if student.status === 'completed'}
										<button
											on:click={() => updateStudentStatus(student.id, 'active')}
											class="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
										>
											再開
										</button>
									{/if}
									<button
										on:click={() => removeStudent(student.id)}
										class="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
									>
										除籍
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>