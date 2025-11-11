import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import Stripe from 'stripe'
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private'

const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2023-10-16'
})

// TODO: D1実装が必要

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
		// TODO: D1実装が必要 - 購入ステータスの更新とスペース登録
		console.log('Payment success - D1 implementation required:', paymentIntent.id)
	} catch (err) {
		console.error('Error handling payment success:', err)
	}
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
	try {
		// TODO: D1実装が必要 - 購入ステータスの失敗処理
		console.log('Payment failed - D1 implementation required:', paymentIntent.id)
	} catch (err) {
		console.error('Error handling payment failure:', err)
	}
}
