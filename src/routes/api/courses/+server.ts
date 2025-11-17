import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InstructorManager, SpaceManager, CourseManager, getD1 } from '$lib/server/d1-db';

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		const username = url.searchParams.get('username');
		const spaceId = url.searchParams.get('space_id');
		const spaceSlug = url.searchParams.get('space_slug');
		const courseId = url.searchParams.get('id');
		const courseSlug = url.searchParams.get('slug');

		const db = await getD1(platform);

		// コースIDが指定されている場合は単一コース取得
		if (courseId) {
			const course = await CourseManager.getCourseById(db, courseId);
			if (!course) {
				return json({ error: 'Course not found' }, { status: 404 });
			}

			// スペース情報も取得
			const space = await SpaceManager.getSpaceById(db, course.space_id as string);

			return json({ course, space });
		}

		// コースslugとスペースslugが指定されている場合
		if (courseSlug && (spaceId || (spaceSlug && username))) {
			let space;

			if (spaceId) {
				space = await SpaceManager.getSpaceById(db, spaceId);
			} else if (spaceSlug && username) {
				// ユーザー名からユーザーIDを取得
				const user = await InstructorManager.getInstructorByUsername(db, username);
				if (!user) {
					return json({ error: 'User not found' }, { status: 404 });
				}
				space = await SpaceManager.getSpaceBySlug(db, user.id as string, spaceSlug);
			}

			if (!space) {
				return json({ error: 'Space not found' }, { status: 404 });
			}

			const course = await CourseManager.getCourseBySlug(db, space.id as string, courseSlug);
			if (!course) {
				return json({ error: 'Course not found' }, { status: 404 });
			}

			return json({ course, space });
		}

		if (!username) {
			return json({ error: 'Username is required' }, { status: 400 });
		}

		// ユーザー名からユーザーIDを取得
		const user = await InstructorManager.getInstructorByUsername(db, username);

		if (!user) {
			return json({ error: 'Instructor not found' }, { status: 404 });
		}

		// スペースIDが指定されている場合は、そのスペースのコースのみ取得
		if (spaceId) {
			const courses = await CourseManager.getCoursesBySpaceId(db, spaceId);
			return json({ courses });
		}

		// 全スペースのコースを取得
		const spaces = await SpaceManager.getSpacesByInstructor(db, user.id as string);
		const spaceIds = spaces.map((s: any) => s.id);

		if (spaceIds.length === 0) {
			return json({ courses: [], spaces: [] });
		}

		const courses = await CourseManager.getCoursesBySpaceIds(db, spaceIds);

		// 各コースにスペース情報を追加
		const coursesWithSpace = courses.map((course: any) => {
			const space = spaces.find((s: any) => s.id === course.space_id);
			return {
				...course,
				space: space ? { title: space.title, slug: space.slug } : null
			};
		});

		// プロフィール情報も返す（payment-settingsページで使用）
		return json({ courses: coursesWithSpace, spaces, profile: user });
	} catch (error) {
		console.error('Get courses error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { space_id, title, description, slug, price, is_free, is_published } = await request.json();

		if (!space_id || !title) {
			return json({ error: 'Space ID and title are required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// スペースの所有者確認
		const space = await SpaceManager.getSpaceById(db, space_id);

		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// デバッグログ
		console.log('=== Course Creation Debug ===');
		console.log('space.instructor_id:', space.instructor_id);
		console.log('locals.user.id:', locals.user.id);
		console.log('locals.user:', JSON.stringify(locals.user, null, 2));
		console.log('space:', JSON.stringify(space, null, 2));
		console.log('Match:', space.instructor_id === locals.user.id);

		if (space.instructor_id !== locals.user.id) {
			return json({
				error: 'Forbidden',
				debug: {
					space_instructor_id: space.instructor_id,
					user_id: locals.user.id,
					space_instructor_id_type: typeof space.instructor_id,
					user_id_type: typeof locals.user.id,
					match: space.instructor_id === locals.user.id,
					user_keys: Object.keys(locals.user)
				}
			}, { status: 403 });
		}

		// コース作成
		const { generateUUID } = await import('$lib/server/d1-db');
		const newCourse = await CourseManager.createCourse(db, {
			id: generateUUID(),
			space_id,
			title,
			description,
			slug,
			price: price || 0,
			currency: 'JPY',
			is_free: is_free !== undefined ? is_free : true,
			is_published: is_published !== undefined ? is_published : false
		});

		return json({ course: newCourse });
	} catch (error) {
		console.error('Create course error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id, ...updates } = await request.json();

		if (!id) {
			return json({ error: 'Course ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// コースの所有者確認
		const course = await CourseManager.getCourseById(db, id);

		if (!course) {
			return json({ error: 'Course not found' }, { status: 404 });
		}

		const space = await SpaceManager.getSpaceById(db, course.space_id as string);

		// デバッグログ（PUT用）
		console.log('=== Course Update Debug ===');
		console.log('space.instructor_id:', space?.instructor_id);
		console.log('locals.user.id:', locals.user.id);
		console.log('locals.user:', JSON.stringify(locals.user, null, 2));
		console.log('space:', JSON.stringify(space, null, 2));
		console.log('Match:', space?.instructor_id === locals.user.id);
		console.log('Type of space.instructor_id:', typeof space?.instructor_id);
		console.log('Type of locals.user.id:', typeof locals.user.id);

		if (!space || space.instructor_id !== locals.user.id) {
			return json({
				error: 'Forbidden',
				debug: {
					space_instructor_id: space?.instructor_id,
					user_id: locals.user.id,
					space_instructor_id_type: typeof space?.instructor_id,
					user_id_type: typeof locals.user.id,
					match: space?.instructor_id === locals.user.id,
					user_keys: Object.keys(locals.user),
					space_exists: !!space
				}
			}, { status: 403 });
		}

		// コース更新
		const updatedCourse = await CourseManager.updateCourse(db, id, updates);

		return json({ course: updatedCourse });
	} catch (error) {
		console.error('Update course error:', error);
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		console.error('Error message:', error instanceof Error ? error.message : String(error));
		return json({
			error: 'Internal server error',
			details: error instanceof Error ? error.message : String(error)
		}, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const courseId = url.searchParams.get('id');

		if (!courseId) {
			return json({ error: 'Course ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// コースの所有者確認
		const course = await CourseManager.getCourseById(db, courseId);

		if (!course) {
			return json({ error: 'Course not found' }, { status: 404 });
		}

		const space = await SpaceManager.getSpaceById(db, course.space_id as string);

		if (!space || space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// コース削除
		await CourseManager.deleteCourse(db, courseId);

		return json({ success: true });
	} catch (error) {
		console.error('Delete course error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
