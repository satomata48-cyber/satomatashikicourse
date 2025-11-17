import { getD1 } from '$lib/server/d1-db';
import { CourseManager } from '$lib/server/d1-db';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (!locals.user) {
		throw redirect(302, `/${params.username}/space/${params.slug}/login`);
	}

	const db = await getD1(platform);
	const courseId = params.id;

	// コース情報を取得
	const course = await CourseManager.getCourseById(db, courseId);

	if (!course) {
		throw error(404, 'Course not found');
	}

	// すでに購入済みかチェック
	const hasPurchased = await CourseManager.hasStudentPurchasedCourse(
		db,
		courseId,
		locals.user.id
	);

	if (hasPurchased) {
		// すでに購入済みの場合はコースページにリダイレクト
		throw redirect(302, `/${params.username}/space/${params.slug}/student/course/${courseId}`);
	}

	// スペース情報を取得
	const spaceQuery = await db
		.prepare('SELECT * FROM spaces WHERE id = ?')
		.bind(course.space_id)
		.first();

	return {
		course,
		space: spaceQuery,
		user: locals.user
	};
};
