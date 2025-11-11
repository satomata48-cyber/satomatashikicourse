import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getD1, ProfileManager } from '$lib/server/d1-db';

/**
 * GET /api/profile
 * プロフィール情報を取得
 * クエリパラメータ:
 * - username: ユーザー名
 * - id: ユーザーID
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		const db = getD1(platform);
		const username = url.searchParams.get('username');
		const id = url.searchParams.get('id');

		if (!username && !id) {
			return json({ error: 'usernameまたはidが必要です' }, { status: 400 });
		}

		let profile;

		if (username) {
			profile = await ProfileManager.getUserByUsername(db, username);
		} else if (id) {
			profile = await ProfileManager.getUserById(db, id);
		}

		if (!profile) {
			return json({ error: 'プロフィールが見つかりません' }, { status: 404 });
		}

		return json({ profile });
	} catch (error: any) {
		console.error('Profile API error:', error);
		return json({ error: error.message || 'プロフィール取得エラー' }, { status: 500 });
	}
};
