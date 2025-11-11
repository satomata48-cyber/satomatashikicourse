import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/stripe-server';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { courseId, name, description, price, currency } = await request.json();

		if (!courseId || !name || !price) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// TODO: D1実装が必要 - コース情報とスペース情報を取得
		// スタブ実装
		const course = {
			id: courseId,
			space: {
				id: 'stub-space-id',
				title: 'Sample Space',
				slug: 'sample-space',
				instructor_id: 'stub-instructor-id'
			}
		};

		// Stripeで商品を作成（スペース情報も含める）
		const product = await stripe.products.create({
			name,
			description: description || undefined,
			metadata: {
				courseId,
				spaceId: course.space.id,
				spaceTitle: course.space.title,
				spaceSlug: course.space.slug,
				instructorId: course.space.instructor_id
			}
		});

		// 価格を作成
		// JPY（日本円）は最小単位が1円なので100倍不要
		// USD/EURなどは100倍必要（1ドル = 100セント）
		const isZeroDecimalCurrency = ['jpy', 'krw'].includes(currency.toLowerCase());
		const unitAmount = isZeroDecimalCurrency ? Math.round(price) : Math.round(price * 100);

		const stripePrice = await stripe.prices.create({
			product: product.id,
			unit_amount: unitAmount,
			currency: currency.toLowerCase(),
			metadata: {
				courseId,
				spaceId: course.space.id,
				instructorId: course.space.instructor_id
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
				courseId,
				spaceId: course.space.id,
				spaceTitle: course.space.title,
				instructorId: course.space.instructor_id
			}
		});

		// TODO: D1実装が必要 - データベースを更新
		console.log('TODO: Update course in D1 with Stripe IDs:', {
			courseId,
			productId: product.id,
			priceId: stripePrice.id,
			paymentLink: paymentLink.url
		});

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
