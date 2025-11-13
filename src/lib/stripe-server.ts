import Stripe from 'stripe';

/**
 * Get Stripe client instance using runtime environment variables
 * In Cloudflare Pages, secrets are available at runtime via platform.env
 */
export function getStripe(platform: App.Platform | undefined): Stripe {
	const secretKey = platform?.env?.STRIPE_SECRET_KEY;

	if (!secretKey) {
		throw new Error(
			'STRIPE_SECRET_KEY is not set. ' +
			'Please configure it using: wrangler pages secret put STRIPE_SECRET_KEY'
		);
	}

	return new Stripe(secretKey, {
		apiVersion: '2024-11-20.acacia',
		typescript: true
	});
}