import { getD1 } from '$lib/server/d1-db';
import { CourseManager } from '$lib/server/d1-db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const db = await getD1(platform);
	const courseId = params.id;

	// コース情報を取得
	const course = await CourseManager.getCourseById(db, courseId);

	if (!course) {
		return {
			hasPurchased: false,
			course: null
		};
	}

	// 購入状態をチェック（無料・有料問わず購入が必須）
	let hasPurchased = false;

	if (locals.user) {
		hasPurchased = await CourseManager.hasStudentPurchasedCourse(
			db,
			courseId,
			locals.user.id
		);
	}

	return {
		hasPurchased,
		course
	};
};
