import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/stripe-server';
import { createSupabaseServiceRoleClient } from '$lib/supabase-server';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { courseId, name, description, price, currency } = await request.json();

		if (!courseId || !name || !price) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Stripeで商品を作成
		const product = await stripe.products.create({
			name,
			description: description || undefined,
			metadata: {
				courseId
			}
		});

		// 価格を作成
		const stripePrice = await stripe.prices.create({
			product: product.id,
			unit_amount: Math.round(price * 100), // 円を最小単位に変換
			currency: currency.toLowerCase(),
			metadata: {
				courseId
			}
		});

		// Payment Linkを作成
		const paymentLink = await stripe.paymentLinks.create({
			line_items: [
				{
					price: stripePrice.id,
					quantity: 1
				}
			],
			metadata: {
				courseId
			}
		});

		// データベースを更新
		const supabase = createSupabaseServiceRoleClient();
		const { error: updateError } = await supabase
			.from('courses')
			.update({
				stripe_product_id: product.id,
				stripe_price_id: stripePrice.id,
				stripe_payment_link: paymentLink.url
			})
			.eq('id', courseId);

		if (updateError) {
			console.error('Database update error:', updateError);
			return json({ error: 'Database update failed' }, { status: 500 });
		}

		return json({
			productId: product.id,
			priceId: stripePrice.id,
			paymentLink: paymentLink.url
		});

	} catch (error) {
		console.error('Stripe product creation error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};