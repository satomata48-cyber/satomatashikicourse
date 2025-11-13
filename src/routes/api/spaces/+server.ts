import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ProfileManager, SpaceManager, CourseManager, getD1, generateUUID } from '$lib/server/d1-db';

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		const username = url.searchParams.get('username');
		const slug = url.searchParams.get('slug');

		if (!username) {
			return json({ error: 'Username is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// ユーザー名からユーザーIDを取得
		const user = await ProfileManager.getUserByUsername(db, username);

		if (!user) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// スラッグが指定されている場合は単一スペースを取得
		if (slug) {
			const space = await SpaceManager.getSpaceBySlug(db, user.id as string, slug);

			if (!space) {
				return json({ error: 'Space not found' }, { status: 404 });
			}

			return json({ space });
		}

		// スペース一覧を取得
		const spaces = await SpaceManager.getSpacesByInstructor(db, user.id as string);

		// 各スペースのコース数を取得
		const spacesWithCounts = await Promise.all(
			spaces.map(async (space) => {
				const courses = await CourseManager.getCoursesBySpaceId(db, space.id as string);
				return {
					...space,
					course_count: courses.length
				};
			})
		);

		return json({ spaces: spacesWithCounts });
	} catch (error) {
		console.error('Get spaces error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { title, description, slug, max_students, is_active } = await request.json();

		if (!title || !slug) {
			return json({ error: 'Title and slug are required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// スラッグの重複チェック
		const existingSpace = await SpaceManager.getSpaceBySlug(db, locals.user.id, slug);
		if (existingSpace) {
			return json({ error: 'Slug already exists' }, { status: 400 });
		}

		// スペース作成
		const newSpace = await SpaceManager.createSpace(db, {
			id: generateUUID(),
			instructor_id: locals.user.id,
			title,
			description,
			slug,
			max_students,
			is_active: is_active !== undefined ? is_active : true
		});

		return json({ space: newSpace });
	} catch (error) {
		console.error('Create space error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id, title, description, slug, max_students, is_active, landing_page_content } = await request.json();

		if (!id) {
			return json({ error: 'Space ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// スペースの所有者確認
		const space = await SpaceManager.getSpaceById(db, id);

		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		if (space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// スペース更新
		const updates: any = {};
		if (title !== undefined) updates.title = title;
		if (description !== undefined) updates.description = description;
		if (slug !== undefined) updates.slug = slug;
		if (max_students !== undefined) updates.max_students = max_students;
		if (is_active !== undefined) updates.is_active = is_active;
		if (landing_page_content !== undefined) updates.landing_page_content = landing_page_content;

		const updatedSpace = await SpaceManager.updateSpace(db, id, updates);

		return json({ space: updatedSpace });
	} catch (error) {
		console.error('Update space error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const spaceId = url.searchParams.get('id');

		if (!spaceId) {
			return json({ error: 'Space ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// スペースの所有者確認
		const space = await SpaceManager.getSpaceById(db, spaceId);

		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		if (space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// スペース削除
		await SpaceManager.deleteSpace(db, spaceId);

		return json({ success: true });
	} catch (error) {
		console.error('Delete space error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
