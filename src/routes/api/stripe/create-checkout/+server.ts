import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/stripe-server';
import { createSupabaseServiceRoleClient } from '$lib/supabase-server';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		const { courseId, priceId } = await request.json();

		if (!courseId || !priceId) {
			return json({ error: 'Missing courseId or priceId' }, { status: 400 });
		}

		// ユーザー認証確認
		const authHeader = request.headers.get('authorization');
		if (!authHeader) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Supabaseクライアントを作成してトークンを検証
		const supabase = createSupabaseServiceRoleClient();
		const token = authHeader.replace('Bearer ', '');

		// トークンからユーザー情報を取得
		const { data: { user }, error: authError } = await supabase.auth.getUser(token);
		if (authError || !user) {
			console.error('Auth error:', authError);
			return json({ error: 'Invalid authentication token' }, { status: 401 });
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

		// 講師本人の購入を防止
		if (course.space.instructor_id === user.id) {
			return json({ error: 'Instructors cannot purchase their own courses' }, { status: 403 });
		}

		// アプリケーションのベースURLを取得
		const baseUrl = url.origin;

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
			success_url: `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}&course_id=${courseId}`,
			cancel_url: `${baseUrl}/course/${courseId}`,
			metadata: {
				courseId,
				studentId: user.id,
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