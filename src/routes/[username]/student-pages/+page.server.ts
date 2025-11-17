import { getD1 } from '$lib/server/d1-db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const db = await getD1(platform);
	const username = params.username;

	// 講師のスペース一覧を取得
	const spaces = await db
		.prepare('SELECT id, title, slug FROM spaces WHERE instructor_id = ? ORDER BY created_at DESC')
		.bind(locals.user.id)
		.all();

	// 各スペースの生徒情報と購入情報を統合して取得
	const studentsWithDetails = await db
		.prepare(`
			SELECT
				s.id as student_id,
				s.email,
				s.display_name,
				ss.space_id,
				sp.title as space_title,
				sp.slug as space_slug,
				ss.enrolled_at,
				ss.status as student_status,
				COUNT(DISTINCT cp.id) as total_purchases,
				SUM(CASE WHEN cp.status = 'completed' THEN cp.amount ELSE 0 END) as total_spent
			FROM space_students ss
			INNER JOIN students s ON ss.student_id = s.id
			INNER JOIN spaces sp ON ss.space_id = sp.id
			LEFT JOIN course_purchases cp ON cp.student_id = s.id
			WHERE sp.instructor_id = ?
			GROUP BY s.id, ss.space_id, sp.title, sp.slug, ss.enrolled_at, ss.status
			ORDER BY ss.enrolled_at DESC
		`)
		.bind(locals.user.id)
		.all();

	return {
		spaces: spaces.results || [],
		students: studentsWithDetails.results || []
	};
};
