import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LessonManager, CourseManager, SpaceManager, getD1, generateUUID } from '$lib/server/d1-db';

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		const courseId = url.searchParams.get('courseId');
		const lessonId = url.searchParams.get('id');

		const db = await getD1(platform);

		// レッスンIDが指定されている場合は単一レッスン取得
		if (lessonId) {
			const lesson = await LessonManager.getLessonById(db, lessonId);
			if (!lesson) {
				return json({ error: 'Lesson not found' }, { status: 404 });
			}
			return json({ lesson });
		}

		// コースIDが指定されている場合はそのコースのレッスン一覧を取得
		if (courseId) {
			const lessons = await LessonManager.getLessonsByCourseId(db, courseId);
			return json({ lessons });
		}

		return json({ error: 'Course ID or Lesson ID is required' }, { status: 400 });
	} catch (error) {
		console.error('Get lessons error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const {
			course_id,
			title,
			description,
			content,
			video_url,
			video_type,
			duration,
			order_index,
			is_published
		} = await request.json();

		if (!course_id || !title) {
			return json({ error: 'Course ID and title are required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// コースの所有者確認
		const course = await CourseManager.getCourseById(db, course_id);
		if (!course) {
			return json({ error: 'Course not found' }, { status: 404 });
		}

		const space = await SpaceManager.getSpaceById(db, course.space_id as string);
		if (!space || space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// レッスン作成
		const newLesson = await LessonManager.createLesson(db, {
			id: generateUUID(),
			course_id,
			title,
			description,
			content,
			video_url,
			video_type,
			duration,
			order_index,
			is_published: is_published !== undefined ? is_published : false
		});

		return json({ lesson: newLesson });
	} catch (error) {
		console.error('Create lesson error:', error);
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
			return json({ error: 'Lesson ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// レッスンの所有者確認
		const lesson = await LessonManager.getLessonById(db, id);
		if (!lesson) {
			return json({ error: 'Lesson not found' }, { status: 404 });
		}

		const course = await CourseManager.getCourseById(db, lesson.course_id as string);
		if (!course) {
			return json({ error: 'Course not found' }, { status: 404 });
		}

		const space = await SpaceManager.getSpaceById(db, course.space_id as string);
		if (!space || space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// レッスン更新
		const updatedLesson = await LessonManager.updateLesson(db, id, updates);

		return json({ lesson: updatedLesson });
	} catch (error) {
		console.error('Update lesson error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const lessonId = url.searchParams.get('id');

		if (!lessonId) {
			return json({ error: 'Lesson ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// レッスンの所有者確認
		const lesson = await LessonManager.getLessonById(db, lessonId);
		if (!lesson) {
			return json({ error: 'Lesson not found' }, { status: 404 });
		}

		const course = await CourseManager.getCourseById(db, lesson.course_id as string);
		if (!course) {
			return json({ error: 'Course not found' }, { status: 404 });
		}

		const space = await SpaceManager.getSpaceById(db, course.space_id as string);
		if (!space || space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// レッスン削除
		await LessonManager.deleteLesson(db, lessonId);

		return json({ success: true });
	} catch (error) {
		console.error('Delete lesson error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
