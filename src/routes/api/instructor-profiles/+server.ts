import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InstructorProfileManager, getD1, generateUUID } from '$lib/server/d1-db';

/**
 * GET: 講師のプロフィール一覧を取得
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	try {
		if (!locals.user || locals.userType !== 'instructor') {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const db = await getD1(platform);

		// 講師のプロフィール一覧を取得
		const profiles = await InstructorProfileManager.getProfilesByInstructorId(
			db,
			locals.user.id
		);

		return json({ profiles });
	} catch (error) {
		console.error('Get instructor profiles error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * POST: 新規プロフィール作成
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user || locals.userType !== 'instructor') {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { display_name, bio, avatar_url, social_links } = await request.json();

		if (!display_name) {
			return json({ error: 'Display name is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// 既存のプロフィール数を確認（現在は1つのみ許可）
		const existingProfiles = await InstructorProfileManager.getProfilesByInstructorId(
			db,
			locals.user.id
		);

		if (existingProfiles.length >= 1) {
			return json({ error: '現在、1つのプロフィールのみ作成可能です' }, { status: 400 });
		}

		// プロフィール作成
		const profileId = generateUUID();
		const profile = await InstructorProfileManager.createProfile(db, {
			id: profileId,
			instructor_id: locals.user.id,
			display_name,
			bio,
			avatar_url,
			social_links,
			is_primary: true, // 最初のプロフィールは自動的にプライマリ
			is_active: true
		});

		return json({ profile });
	} catch (error) {
		console.error('Create instructor profile error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * PUT: プロフィール更新
 */
export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user || locals.userType !== 'instructor') {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id, ...updates } = await request.json();

		if (!id) {
			return json({ error: 'Profile ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// プロフィールの所有者確認
		const profile = await InstructorProfileManager.getProfileById(db, id);
		if (!profile || profile.instructor_id !== locals.user.id) {
			return json({ error: 'Profile not found or unauthorized' }, { status: 404 });
		}

		// プロフィール更新
		const updatedProfile = await InstructorProfileManager.updateProfile(db, id, updates);

		return json({ profile: updatedProfile });
	} catch (error) {
		console.error('Update instructor profile error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * DELETE: プロフィール削除
 */
export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	try {
		if (!locals.user || locals.userType !== 'instructor') {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const profileId = url.searchParams.get('id');

		if (!profileId) {
			return json({ error: 'Profile ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// プロフィールの所有者確認
		const profile = await InstructorProfileManager.getProfileById(db, profileId);
		if (!profile || profile.instructor_id !== locals.user.id) {
			return json({ error: 'Profile not found or unauthorized' }, { status: 404 });
		}

		// プロフィール削除
		await InstructorProfileManager.deleteProfile(db, profileId);

		return json({ success: true });
	} catch (error) {
		console.error('Delete instructor profile error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
