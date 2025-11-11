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

		// TODO: D1実装が必要 - コース情報の取得と購入済みチェック
		return json({ error: 'Payment functionality not implemented' }, { status: 501 })

	} catch (err: any) {
		console.error('Stripe payment intent error:', err)
		return json({ error: 'Internal server error' }, { status: 500 })
	}
}