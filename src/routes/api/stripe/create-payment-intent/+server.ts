import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import Stripe from 'stripe'
import { STRIPE_SECRET_KEY } from '$env/static/private'

const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2023-10-16'
})

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { course_id, amount, currency = 'jpy' } = await request.json()

		if (!course_id || !amount) {
			return json({ error: 'course_id and amount are required' }, { status: 400 })
		}

		// コース情報を取得
		const { data: course, error: courseError } = await locals.supabase
			.from('courses')
			.select('id, title, price, currency, space_id, spaces!courses_space_id_fkey(instructor_id)')
			.eq('id', course_id)
			.single()

		if (courseError || !course) {
			return json({ error: 'Course not found' }, { status: 404 })
		}

		// 価格の確認
		if (course.price !== amount || course.currency !== currency) {
			return json({ error: 'Price mismatch' }, { status: 400 })
		}

		// 既に購入済みかチェック
		const { data: existingPurchase } = await locals.supabase
			.from('course_purchases')
			.select('id, status')
			.eq('user_id', locals.user.id)
			.eq('course_id', course_id)
			.eq('status', 'completed')
			.single()

		if (existingPurchase) {
			return json({ error: 'Course already purchased' }, { status: 400 })
		}

		// PaymentIntentを作成
		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(amount * 100), // Stripeは最小単位で処理
			currency: currency,
			metadata: {
				course_id: course_id,
				user_id: locals.user.id,
				course_title: course.title
			}
		})

		// 購入レコードを作成（pending状態）
		const { data: purchase, error: purchaseError } = await locals.supabase
			.from('course_purchases')
			.insert({
				user_id: locals.user.id,
				course_id: course_id,
				amount: amount,
				currency: currency,
				status: 'pending',
				stripe_payment_intent_id: paymentIntent.id
			})
			.select()
			.single()

		if (purchaseError) {
			console.error('Purchase record creation error:', purchaseError)
			return json({ error: 'Failed to create purchase record' }, { status: 500 })
		}

		return json({
			client_secret: paymentIntent.client_secret,
			purchase_id: purchase.id
		})

	} catch (err: any) {
		console.error('Stripe payment intent error:', err)
		return json({ error: 'Internal server error' }, { status: 500 })
	}
}