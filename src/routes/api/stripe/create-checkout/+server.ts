import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/stripe-server';
import { createSupabaseServiceRoleClient } from '$lib/supabase-server';
import { PUBLIC_APP_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { courseId, priceId } = await request.json();

		if (!courseId || !priceId) {
			return json({ error: 'Missing courseId or priceId' }, { status: 400 });
		}

		// ユーザー認証確認
		const supabase = createSupabaseServiceRoleClient();
		
		// セッションからユーザーIDを取得（実際の実装では適切な認証方法を使用）
		// この例では簡易的にrequestからuserIdを取得
		const authHeader = request.headers.get('authorization');
		if (!authHeader) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// コース情報を取得
		const { data: course, error: courseError } = await supabase
			.from('courses')
			.select(`
				*,
				space:spaces!inner(
					instructor_id,
					title,
					slug
				)
			`)
			.eq('id', courseId)
			.single();

		if (courseError || !course) {
			return json({ error: 'Course not found' }, { status: 404 });
		}

		// 講師本人の購入を防止（後でuserIdを適切に取得）
		// const userId = getUserIdFromAuth(authHeader);
		// if (course.space.instructor_id === userId) {
		// 	return json({ error: 'Instructors cannot purchase their own courses' }, { status: 403 });
		// }

		// Stripe Checkoutセッションを作成
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			line_items: [
				{
					price: priceId,
					quantity: 1
				}
			],
			mode: 'payment',
			success_url: `${PUBLIC_APP_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&course_id=${courseId}`,
			cancel_url: `${PUBLIC_APP_URL}/course/${courseId}`,
			metadata: {
				courseId,
				instructorId: course.space.instructor_id
			},
			allow_promotion_codes: true,
			billing_address_collection: 'required',
			shipping_address_collection: {
				allowed_countries: ['JP', 'US', 'GB', 'CA', 'AU']
			}
		});

		return json({
			sessionUrl: session.url,
			sessionId: session.id
		});

	} catch (error) {
		console.error('Stripe checkout creation error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};