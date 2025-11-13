<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'

	export let data

	$: username = $page.params.username
	$: slug = $page.params.slug
	$: currentPath = $page.url.pathname

	let space: any = null
	let student: any = null
	let loading = true

	// メニューアイテム（URLパラメータのusernameを使用）
	$: menuItems = [
		{ label: 'ダッシュボード', href: `/${username}/space/${slug}/student`, icon: 'dashboard' },
		{ label: 'コース一覧', href: `/${username}/space/${slug}/student/courses`, icon: 'courses' },
		{ label: 'プロフィール', href: `/${username}/space/${slug}/student/profile`, icon: 'profile' }
	]

	onMount(async () => {
		await loadData()
	})

	async function loadData() {
		try {
			// スペース情報を取得
			const spaceResponse = await fetch(`/api/spaces?username=${username}&slug=${slug}`)
			const spaceResult = await spaceResponse.json()

			if (!spaceResponse.ok) {
				throw new Error(spaceResult.error || 'スペースの読み込みに失敗しました')
			}

			space = spaceResult.space

			// 生徒の登録状態を確認
			if (data.user) {
				const studentResponse = await fetch(`/api/students?spaceId=${space.id}`)
				const studentResult = await studentResponse.json()

				if (studentResponse.ok) {
					// このユーザーの登録状態を確認
					const enrollment = studentResult.students?.find((s: any) => s.student_id === data.user.id)
					if (enrollment) {
						student = enrollment
					} else {
						// 登録されていない場合は登録ページにリダイレクト
						goto(`/${username}/space/${slug}/register`)
					}
				}
			}
		} catch (err: any) {
			console.error('Load data error:', err)
			// エラーの場合はスペースページにリダイレクト
			goto(`/${username}/space/${slug}`)
		} finally {
			loading = false
		}
	}

	function isActive(href: string): boolean {
		if (href.endsWith('/student') && currentPath.endsWith('/student')) {
			return true
		}
		return currentPath.startsWith(href) && !currentPath.endsWith('/student')
	}

	async function handleLogout() {
		try {
			// ログアウトAPIを呼び出す
			await fetch('/api/auth/logout', {
				method: 'POST'
			})

			// スペースページにリダイレクト
			goto(`/${username}/space/${slug}`)
		} catch (err: any) {
			console.error('Logout error:', err)
			// エラーでもスペースページにリダイレクト
			goto(`/${username}/space/${slug}`)
		}
	}
</script>

{#if loading}
	<div class="min-h-screen flex justify-center items-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
	</div>
{:else if space && student}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<header class="bg-white shadow-sm border-b border-gray-200">
			<div class="px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between items-center h-16">
					<div class="flex items-center">
						<h1 class="text-xl font-semibold text-gray-900">{space.title}</h1>
						<span class="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {student.status === 'active' ? 'bg-green-100 text-green-800' : student.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}">
							{student.status === 'active' ? '学習中' : student.status === 'completed' ? '修了済み' : student.status}
						</span>
					</div>
					<div class="flex items-center space-x-4">
						<span class="text-sm text-gray-600">{data.user?.email}</span>
						<button
							on:click={handleLogout}
							class="text-sm text-gray-500 hover:text-gray-700"
						>
							ログアウト
						</button>
					</div>
				</div>
			</div>
		</header>
		
		<div class="flex">
			<!-- Sidebar -->
			<aside class="w-64 bg-white shadow-md">
				<nav class="mt-5 px-2">
					{#each menuItems as item}
						<a
							href={item.href}
							class="group flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1
							       {isActive(item.href) 
							         ? 'bg-blue-50 text-blue-700' 
							         : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
						>
							<span class="mr-3">
								{#if item.icon === 'dashboard'}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
									</svg>
								{:else if item.icon === 'courses'}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
									</svg>
								{:else if item.icon === 'profile'}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
									</svg>
								{/if}
							</span>
							{item.label}
						</a>
					{/each}
					
					<!-- スペースページに戻る -->
					<div class="border-t border-gray-200 mt-4 pt-4">
						<a
							href="/{username}/space/{slug}"
							class="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
						>
							<span class="mr-3">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
								</svg>
							</span>
							スペースページ
						</a>
					</div>
				</nav>
			</aside>
			
			<!-- Main Content -->
			<main class="flex-1 p-8">
				<slot />
			</main>
		</div>
	</div>
{/if}