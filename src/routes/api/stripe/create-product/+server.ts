import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/stripe-server';
import { CourseManager, SpaceManager, getD1 } from '$lib/server/d1-db';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		// 認証チェック
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { courseId, name, description, price, currency } = await request.json();

		if (!courseId || !name || !price) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// D1データベースからコース情報を取得
		const db = await getD1(platform);
		const course = await CourseManager.getCourseById(db, courseId);

		if (!course) {
			return json({ error: 'Course not found' }, { status: 404 });
		}

		// スペース情報を取得
		const space = await SpaceManager.getSpaceById(db, course.space_id as string);

		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// 所有者確認
		if (space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// Stripeで商品を作成（スペース情報も含める）
		const product = await stripe.products.create({
			name,
			description: description || undefined,
			metadata: {
				courseId,
				spaceId: space.id,
				spaceTitle: space.title,
				spaceSlug: space.slug,
				instructorId: space.instructor_id
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
				spaceId: space.id,
				instructorId: space.instructor_id
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
				spaceId: space.id,
				spaceTitle: space.title,
				instructorId: space.instructor_id
			}
		});

		// D1データベースを更新
		await CourseManager.updateCourse(db, courseId, {
			stripe_product_id: product.id,
			stripe_price_id: stripePrice.id,
			stripe_payment_link: paymentLink.url
		});

		console.log('Stripe product created and course updated:', {
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
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		console.error('Error message:', error instanceof Error ? error.message : String(error));
		return json(
			{
				error: 'Failed to create Stripe product',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
