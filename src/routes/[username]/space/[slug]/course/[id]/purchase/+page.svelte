<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { createSupabaseBrowserClient } from '$lib/supabase'
	import { getStripe, createPaymentIntent, confirmPayment } from '$lib/stripe'
	
	export let data
	
	const supabase = createSupabaseBrowserClient()
	
	$: username = $page.params.username
	$: slug = $page.params.slug
	$: courseId = $page.params.id
	
	let course: any = null
	let space: any = null
	let loading = true
	let processing = false
	let error = ''
	let success = false
	
	let cardElement: any
	let stripe: any
	let elements: any
	
	onMount(async () => {
		await loadCourseData()
		await initializeStripe()
	})
	
	async function loadCourseData() {
		try {
			// まず、usernameで講師情報を取得
			const { data: instructorData, error: instructorError } = await supabase
				.from('instructors')
				.select('id')
				.eq('uuid', username)
				.single()
			
			if (instructorError || !instructorData) {
				throw new Error('講師が見つかりません')
			}
			
			// スペース情報を取得
			const { data: spaceData, error: spaceError } = await supabase
				.from('spaces')
				.select('*')
				.eq('slug', slug)
				.eq('instructor_id', instructorData.id)
				.single()
			
			if (spaceError) throw spaceError
			space = spaceData
			
			// コース情報を取得
			const { data: courseData, error: courseError } = await supabase
				.from('courses')
				.select(`
					*,
					lessons:lessons(id, title, is_published),
					purchases:course_purchases(id, status, purchased_at)
				`)
				.eq('id', courseId)
				.eq('space_id', space.id)
				.single()
			
			if (courseError) throw courseError
			course = courseData
			
			// 既に購入済みかチェック
			if (course.is_free) {
				error = 'このコースは無料です'
				return
			}
			
			const existingPurchase = course.purchases?.find(p => 
				p.user_id === data.user.id && p.status === 'completed'
			)
			
			if (existingPurchase) {
				error = '既に購入済みです'
				return
			}
			
		} catch (err: any) {
			error = err.message
			console.error('Load course data error:', err)
		} finally {
			loading = false
		}
	}
	
	async function initializeStripe() {
		try {
			stripe = await getStripe()
			
			if (!stripe) {
				throw new Error('Stripeの初期化に失敗しました')
			}
			
			elements = stripe.elements({
				appearance: {
					theme: 'stripe'
				}
			})
			
			cardElement = elements.create('card', {
				style: {
					base: {
						fontSize: '16px',
						color: '#424770',
						'::placeholder': {
							color: '#aab7c4'
						}
					}
				}
			})
			
			cardElement.mount('#card-element')
			
		} catch (err: any) {
			console.error('Stripe initialization error:', err)
			error = 'Stripeの初期化に失敗しました'
		}
	}
	
	async function handlePayment() {
		if (!stripe || !cardElement || !course) return
		
		processing = true
		error = ''
		
		try {
			// PaymentIntentを作成
			const { client_secret, purchase_id } = await createPaymentIntent(
				course.id,
				course.price,
				course.currency
			)
			
			// 支払いを確認
			const { error: paymentError } = await stripe.confirmCardPayment(client_secret, {
				payment_method: {
					card: cardElement,
					billing_details: {
						email: data.user.email
					}
				}
			})
			
			if (paymentError) {
				throw new Error(paymentError.message)
			}
			
			success = true
			
			// 成功後、コースページにリダイレクト
			setTimeout(() => {
				goto(`/${username}/space/${slug}/course/${courseId}`)
			}, 3000)
			
		} catch (err: any) {
			error = err.message
			console.error('Payment error:', err)
		} finally {
			processing = false
		}
	}
	
	function formatCurrency(price: number, currency: string): string {
		return new Intl.NumberFormat('ja-JP', {
			style: 'currency',
			currency: currency
		}).format(price)
	}
</script>

<div class="max-w-2xl mx-auto">
	<div class="mb-8">
		<h2 class="text-2xl font-bold text-gray-900 mb-2">コース購入</h2>
		<nav class="text-sm text-gray-600">
			<a href="/{username}/space/{slug}/dashboard" class="hover:text-blue-600">ダッシュボード</a>
			<span class="mx-2">/</span>
			<a href="/{username}/space/{slug}/course/{courseId}" class="hover:text-blue-600">コース詳細</a>
			<span class="mx-2">/</span>
			<span>購入</span>
		</nav>
	</div>
	
	{#if loading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
			{error}
		</div>
	{:else if success}
		<div class="bg-green-50 border border-green-200 text-green-600 px-6 py-4 rounded-lg">
			<div class="flex items-center">
				<svg class="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
				</svg>
				<div>
					<h3 class="text-lg font-medium">購入が完了しました！</h3>
					<p class="text-green-700 mt-1">3秒後にコースページにリダイレクトします...</p>
				</div>
			</div>
		</div>
	{:else if course}
		<div class="bg-white shadow-lg rounded-lg overflow-hidden">
			<!-- コース情報 -->
			<div class="p-6 bg-gray-50 border-b">
				<h3 class="text-xl font-semibold text-gray-900 mb-2">{course.title}</h3>
				<p class="text-gray-600 mb-4">{course.description}</p>
				
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-4 text-sm text-gray-500">
						<span class="flex items-center">
							<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
							</svg>
							{course.lessons?.filter(l => l.is_published).length || 0} レッスン
						</span>
					</div>
					<div class="text-2xl font-bold text-gray-900">
						{formatCurrency(course.price, course.currency)}
					</div>
				</div>
			</div>
			
			<!-- 支払いフォーム -->
			<div class="p-6">
				<h4 class="text-lg font-medium text-gray-900 mb-4">支払い情報</h4>
				
				<form on:submit|preventDefault={handlePayment}>
					<div class="mb-6">
						<label for="card-element" class="block text-sm font-medium text-gray-700 mb-2">
							クレジットカード情報
						</label>
						<div id="card-element" class="p-3 border border-gray-300 rounded-md"></div>
					</div>
					
					<div class="mb-6">
						<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<div class="flex items-start">
								<svg class="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
								<div class="text-sm">
									<p class="font-medium text-blue-800 mb-1">購入について</p>
									<ul class="text-blue-700 space-y-1">
										<li>• 購入後すぐに全てのレッスンにアクセスできます</li>
										<li>• 安全なStripe決済システムを使用しています</li>
										<li>• 購入情報はアカウントに保存されます</li>
									</ul>
								</div>
							</div>
						</div>
					</div>
					
					<button
						type="submit"
						disabled={processing}
						class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
					>
						{#if processing}
							<div class="flex items-center justify-center">
								<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
								処理中...
							</div>
						{:else}
							{formatCurrency(course.price, course.currency)} で購入する
						{/if}
					</button>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	#card-element {
		min-height: 40px;
	}
</style>