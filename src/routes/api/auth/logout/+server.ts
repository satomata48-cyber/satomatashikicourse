import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SessionManager, getD1 } from '$lib/server/d1-db';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	try {
		const sessionToken = cookies.get('session_token');

		if (sessionToken) {
			const db = await getD1(platform);
			await SessionManager.deleteSession(db, sessionToken);
		}

		// クッキー削除
		cookies.delete('session_token', { path: '/' });

		return json({ success: true });
	} catch (error) {
		console.error('Logout error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
