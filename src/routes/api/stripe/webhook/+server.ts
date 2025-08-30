import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import Stripe from 'stripe'
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private'
import { createSupabaseServiceRoleClient } from '$lib/supabase-server'

const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2023-10-16'
})

const supabase = createSupabaseServiceRoleClient()

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.text()
		const signature = request.headers.get('stripe-signature')

		if (!signature) {
			return json({ error: 'No signature' }, { status: 400 })
		}

		let event: Stripe.Event

		try {
			event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
		} catch (err: any) {
			console.error('Webhook signature verification failed:', err.message)
			return json({ error: 'Invalid signature' }, { status: 400 })
		}

		// イベントの処理
		switch (event.type) {
			case 'payment_intent.succeeded':
				await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
				break
			case 'payment_intent.payment_failed':
				await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
				break
			default:
				console.log(`Unhandled event type: ${event.type}`)
		}

		return json({ received: true })

	} catch (err: any) {
		console.error('Webhook error:', err)
		return json({ error: 'Internal server error' }, { status: 500 })
	}
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
	try {
		const { course_id, user_id } = paymentIntent.metadata

		// 購入ステータスを更新
		const { error: updateError } = await supabase
			.from('course_purchases')
			.update({
				status: 'completed',
				completed_at: new Date().toISOString()
			})
			.eq('stripe_payment_intent_id', paymentIntent.id)

		if (updateError) {
			console.error('Failed to update purchase status:', updateError)
			return
		}

		// 自動的にスペースに生徒として登録
		const { data: course } = await supabase
			.from('courses')
			.select('space_id')
			.eq('id', course_id)
			.single()

		if (course) {
			// 既に登録済みかチェック
			const { data: existingStudent } = await supabase
				.from('space_students')
				.select('id')
				.eq('user_id', user_id)
				.eq('space_id', course.space_id)
				.single()

			if (!existingStudent) {
				await supabase
					.from('space_students')
					.insert({
						user_id: user_id,
						space_id: course.space_id,
						status: 'active'
					})
			}
		}

		console.log(`Payment succeeded for course ${course_id} by user ${user_id}`)

	} catch (err) {
		console.error('Error handling payment success:', err)
	}
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
	try {
		// 購入ステータスを失敗に更新
		const { error: updateError } = await supabase
			.from('course_purchases')
			.update({
				status: 'failed'
			})
			.eq('stripe_payment_intent_id', paymentIntent.id)

		if (updateError) {
			console.error('Failed to update purchase status to failed:', updateError)
		}

		console.log(`Payment failed for payment intent ${paymentIntent.id}`)

	} catch (err) {
		console.error('Error handling payment failure:', err)
	}
}