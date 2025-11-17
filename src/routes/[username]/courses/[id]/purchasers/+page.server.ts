import { getD1 } from '$lib/server/d1-db';
import { CourseManager } from '$lib/server/d1-db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const db = await getD1(platform);
	const courseId = params.id;

	// コース情報を取得
	const course = await CourseManager.getCourseById(db, courseId);

	if (!course) {
		throw error(404, 'Course not found');
	}

	// コースの所有者確認（スペースの講師IDとログインユーザーIDを照合）
	const spaceQuery = await db
		.prepare('SELECT instructor_id FROM spaces WHERE id = ?')
		.bind(course.space_id)
		.first();

	if (!spaceQuery || spaceQuery.instructor_id !== locals.user.id) {
		throw error(403, 'Forbidden');
	}

	// 購入者一覧を取得（course_purchasesとstudentsを結合）
	const purchasers = await db
		.prepare(`
			SELECT
				cp.id,
				cp.course_id,
				cp.student_id,
				cp.amount,
				cp.currency,
				cp.status,
				cp.stripe_session_id,
				cp.stripe_payment_intent_id,
				cp.purchased_at,
				s.email,
				s.username,
				s.display_name
			FROM course_purchases cp
			LEFT JOIN students s ON cp.student_id = s.id
			WHERE cp.course_id = ?
			ORDER BY cp.purchased_at DESC
		`)
		.bind(courseId)
		.all();

	return {
		course,
		purchasers: purchasers.results || []
	};
};
