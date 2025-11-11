import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { SessionManager, ProfileManager, getD1 } from '$lib/server/d1-db';

export const handle: Handle = async ({ event, resolve }) => {
	// セッション確認
	const sessionToken = event.cookies.get('session_token');

	if (sessionToken) {
		try {
			// D1データベース取得
			const db = getD1(event.platform);

			// セッション取得
			const session = await SessionManager.getSessionByToken(db, sessionToken);

			if (session) {
				// ユーザー情報取得
				const user = await ProfileManager.getUserById(db, session.user_id);

				if (user) {
					event.locals.user = user;
					event.locals.session = {
						token: session.token,
						expires_at: session.expires_at
					};
				}
			} else {
				// 無効なセッションの場合、クッキー削除
				event.cookies.delete('session_token', { path: '/' });
			}
		} catch (error) {
			console.error('Session validation error:', error);
			event.cookies.delete('session_token', { path: '/' });
		}
	}

	// ルート保護
	const path = event.url.pathname;
	const user = event.locals.user;

	// ログインページと講師登録ページへのリダイレクトループを防ぐ
	if ((path === '/login' || path === '/instructor/register') && user) {
		if (user.username) {
			throw redirect(302, `/${user.username}/dashboard`);
		} else {
			throw redirect(302, '/profile/setup');
		}
	}

	// 認証が必要なルートの保護
	const protectedPaths = ['/dashboard', '/profile/setup', '/instructor'];
	const isProtectedPath = protectedPaths.some((p) => path.startsWith(p));

	if (isProtectedPath && !user) {
		throw redirect(302, '/login');
	}

	return resolve(event);
};