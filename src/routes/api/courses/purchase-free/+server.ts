import { json } from '@sveltejs/kit';
import { getD1 } from '$lib/server/d1-db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { courseId, studentId } = await request.json();

		if (!courseId || !studentId) {
			return json({ error: 'courseId and studentId are required' }, { status: 400 });
		}

		// ログインユーザーと studentId が一致するか確認
		if (locals.user.id !== studentId) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const db = await getD1(platform);

		// コースが無料か確認
		const course = await db
			.prepare('SELECT id, is_free, price, currency FROM courses WHERE id = ?')
			.bind(courseId)
			.first();

		if (!course) {
			return json({ error: 'Course not found' }, { status: 404 });
		}

		if (!course.is_free) {
			return json({ error: 'This course is not free' }, { status: 400 });
		}

		// すでに購入済みか確認
		const existingPurchase = await db
			.prepare('SELECT id FROM course_purchases WHERE course_id = ? AND student_id = ?')
			.bind(courseId, studentId)
			.first();

		if (existingPurchase) {
			return json({ error: 'Already purchased' }, { status: 400 });
		}

		// 購入レコードを作成
		const purchaseId = crypto.randomUUID();
		const now = new Date().toISOString();

		await db
			.prepare(`
				INSERT INTO course_purchases (
					id, course_id, student_id, amount, currency, status, purchased_at
				) VALUES (?, ?, ?, ?, ?, ?, ?)
			`)
			.bind(purchaseId, courseId, studentId, 0, course.currency || 'JPY', 'completed', now)
			.run();

		return json({
			success: true,
			purchase: {
				id: purchaseId,
				courseId,
				studentId,
				amount: 0,
				currency: course.currency || 'JPY',
				status: 'completed',
				purchasedAt: now
			}
		});
	} catch (error: any) {
		console.error('Free course purchase error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
