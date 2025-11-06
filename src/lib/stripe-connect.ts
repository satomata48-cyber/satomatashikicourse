/**
 * Stripe Connect用のクライアントサイド関数
 */

/**
 * Stripe Connectアカウントの接続・オンボーディングを開始
 */
export async function createStripeConnectAccount(accessToken: string): Promise<string> {
	const response = await fetch('/api/stripe/connect/create-account', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${accessToken}`
		}
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create Stripe account');
	}

	const data = await response.json();
	return data.url; // Stripe Onboarding URL
}
