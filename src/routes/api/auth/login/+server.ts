import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	ProfileManager,
	SessionManager,
	getD1,
	getCurrentTimestamp
} from '$lib/server/d1-db';
import { verifyPassword, generateSessionToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		// D1データベース取得
		const db = getD1(platform);

		// ユーザー取得
		const user = await ProfileManager.getUserByEmail(db, email);
		if (!user || !user.password_hash) {
			return json({ error: 'Invalid email or password' }, { status: 401 });
		}

		// パスワード検証
		const isValid = await verifyPassword(password, user.password_hash as string);
		if (!isValid) {
			return json({ error: 'Invalid email or password' }, { status: 401 });
		}

		// セッション作成（7日間有効）
		const sessionToken = generateSessionToken();
		const expiresAt = getCurrentTimestamp() + 60 * 60 * 24 * 7; // 7日後

		await SessionManager.createSession(db, user.id as string, sessionToken, expiresAt);

		// セッションクッキー設定（7日間有効）
		cookies.set('session_token', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7日間
		});

		return json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				role: user.role
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
