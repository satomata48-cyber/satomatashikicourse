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

		// コース情報とスペース情報を取得
		const supabase = createSupabaseServiceRoleClient();
		const { data: course, error: courseError } = await supabase
			.from('courses')
			.select(`
				*,
				space:spaces!inner(
					id,
					title,
					slug,
					instructor_id
				)
			`)
			.eq('id', courseId)
			.single();

		if (courseError || !course) {
			return json({ error: 'Course not found' }, { status: 404 });
		}

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

		// データベースを更新
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