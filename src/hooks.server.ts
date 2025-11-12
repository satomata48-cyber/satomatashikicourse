import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import {
	InstructorSessionManager,
	StudentSessionManager,
	InstructorManager,
	StudentManager,
	getD1
} from '$lib/server/d1-db';

export const handle: Handle = async ({ event, resolve }) => {
	// セッション確認
	const sessionToken = event.cookies.get('session_token');

	if (sessionToken) {
		try {
			// D1データベース取得
			const db = await getD1(event.platform);

			// 講師セッションを確認
			const instructorSession = await InstructorSessionManager.getSessionByToken(db, sessionToken);

			if (instructorSession) {
				// 講師ユーザー情報取得
				const instructor = await InstructorManager.getInstructorById(db, instructorSession.instructor_id as string);

				if (instructor) {
					event.locals.user = {
						...instructor,
						userType: 'instructor'
					};
					event.locals.session = {
						token: instructorSession.token as string,
						expires_at: instructorSession.expires_at as number
					};
				}
			} else {
				// 生徒セッションを確認
				const studentSession = await StudentSessionManager.getSessionByToken(db, sessionToken);

				if (studentSession) {
					// 生徒ユーザー情報取得
					const student = await StudentManager.getStudentById(db, studentSession.student_id as string);

					if (student) {
						event.locals.user = {
							...student,
							userType: 'student'
						};
						event.locals.session = {
							token: studentSession.token as string,
							expires_at: studentSession.expires_at as number
						};
					}
				} else {
					// 無効なセッションの場合、クッキー削除
					event.cookies.delete('session_token', { path: '/' });
				}
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