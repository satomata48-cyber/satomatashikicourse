import Stripe from 'stripe';

/**
 * Get Stripe client instance using runtime environment variables
 * In Cloudflare Pages, secrets are available at runtime via platform.env
 *
 * @param platform - App platform containing environment variables
 * @param testMode - Use test mode keys instead of live keys (default: false)
 */
export function getStripe(
	platform: App.Platform | undefined,
	testMode: boolean = false
): Stripe {
	const secretKey = testMode
		? platform?.env?.STRIPE_TEST_SECRET_KEY
		: platform?.env?.STRIPE_SECRET_KEY;

	if (!secretKey) {
		const keyName = testMode ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_SECRET_KEY';
		throw new Error(
			`${keyName} is not set. ` +
			`Please configure it using: wrangler pages secret put ${keyName}`
		);
	}

	return new Stripe(secretKey, {
		apiVersion: '2024-11-20.acacia',
		typescript: true
	});
}

/**
 * Get Stripe publishable key for client-side usage
 *
 * @param platform - App platform containing environment variables
 * @param testMode - Use test mode keys instead of live keys (default: false)
 */
export function getStripePublishableKey(
	platform: App.Platform | undefined,
	testMode: boolean = false
): string {
	const publishableKey = testMode
		? platform?.env?.PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
		: platform?.env?.PUBLIC_STRIPE_PUBLISHABLE_KEY;

	if (!publishableKey) {
		const keyName = testMode
			? 'PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY'
			: 'PUBLIC_STRIPE_PUBLISHABLE_KEY';
		throw new Error(
			`${keyName} is not set. ` +
			`Please configure it using: wrangler pages secret put ${keyName}`
		);
	}

	return publishableKey;
}