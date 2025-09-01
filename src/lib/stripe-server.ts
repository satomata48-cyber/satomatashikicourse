import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

if (!STRIPE_SECRET_KEY) {
	throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2023-10-16',
	typescript: true
});