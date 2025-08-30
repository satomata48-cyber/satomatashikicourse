import { loadStripe } from '@stripe/stripe-js'
import { PUBLIC_STRIPE_PUBLISHABLE_KEY } from '$env/static/public'

let stripePromise: Promise<any>

export function getStripe() {
	if (!stripePromise) {
		stripePromise = loadStripe(PUBLIC_STRIPE_PUBLISHABLE_KEY)
	}
	return stripePromise
}

export async function createPaymentIntent(courseId: string, amount: number, currency: string = 'jpy') {
	try {
		const response = await fetch('/api/stripe/create-payment-intent', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				course_id: courseId,
				amount: amount,
				currency: currency
			})
		})

		if (!response.ok) {
			const error = await response.json()
			throw new Error(error.error || 'Payment intent creation failed')
		}

		return await response.json()
	} catch (error) {
		console.error('Payment intent error:', error)
		throw error
	}
}

export async function confirmPayment(stripe: any, clientSecret: string, paymentMethod: any) {
	try {
		const result = await stripe.confirmCardPayment(clientSecret, {
			payment_method: paymentMethod
		})

		if (result.error) {
			throw new Error(result.error.message)
		}

		return result
	} catch (error) {
		console.error('Payment confirmation error:', error)
		throw error
	}
}