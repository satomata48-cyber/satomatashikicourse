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

	// スペースに登録されている生徒を取得し、購入状況も含める
	const studentsWithPurchases = await db
		.prepare(`
			SELECT
				s.id as student_id,
				s.email,
				s.username,
				s.display_name,
				ss.enrolled_at,
				ss.status as student_status,
				cp.id as purchase_id,
				cp.amount,
				cp.currency,
				cp.status as purchase_status,
				cp.stripe_session_id,
				cp.stripe_payment_intent_id,
				cp.purchased_at
			FROM space_students ss
			INNER JOIN students s ON ss.student_id = s.id
			LEFT JOIN course_purchases cp ON cp.student_id = s.id AND cp.course_id = ?
			WHERE ss.space_id = ?
			ORDER BY cp.purchased_at DESC, ss.enrolled_at DESC
		`)
		.bind(courseId, course.space_id)
		.all();

	// スペース情報も取得
	const space = await db
		.prepare('SELECT id, title, slug FROM spaces WHERE id = ?')
		.bind(course.space_id)
		.first();

	return {
		course,
		space,
		students: studentsWithPurchases.results || []
	};
};
