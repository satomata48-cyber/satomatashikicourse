import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	InstructorManager,
	InstructorSessionManager,
	getD1,
	getCurrentTimestamp
} from '$lib/server/d1-db';
import { verifyPassword, generateSessionToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		console.log('[LOGIN] Step 1: Parsing request body');
		const { email, password } = await request.json();

		if (!email || !password) {
			console.log('[LOGIN] Missing email or password');
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		console.log('[LOGIN] Step 2: Getting D1 database, email:', email);
		// D1データベース取得
		const db = await getD1(platform);
		console.log('[LOGIN] Got D1 database:', !!db);

		console.log('[LOGIN] Step 3: Checking instructor login');
		// 講師として登録されているか確認
		const instructor = await InstructorManager.getInstructorByEmail(db, email);
		console.log('[LOGIN] Instructor found:', !!instructor);

		if (instructor && instructor.password_hash) {
			console.log('[LOGIN] Step 4: Verifying instructor password');
			// パスワード検証
			const isValid = await verifyPassword(password, instructor.password_hash as string);
			console.log('[LOGIN] Password valid:', isValid);

			if (!isValid) {
				return json({ error: 'Invalid email or password' }, { status: 401 });
			}

			console.log('[LOGIN] Step 5: Generating session token for instructor');
			// 講師セッション作成（7日間有効）
			const sessionToken = generateSessionToken();
			const expiresAt = getCurrentTimestamp() + 60 * 60 * 24 * 7; // 7日後
			console.log('[LOGIN] Token generated, expires at:', expiresAt);

			console.log('[LOGIN] Step 6: Creating instructor session in database');
			await InstructorSessionManager.createSession(db, instructor.id as string, sessionToken, expiresAt);
			console.log('[LOGIN] Session created successfully');

			// セッションクッキー設定（7日間有効）
			cookies.set('session_token', sessionToken, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 7 // 7日間
			});

			console.log('[LOGIN] Step 7: Instructor login successful');
			return json({
				success: true,
				user: {
					id: instructor.id,
					email: instructor.email,
					username: instructor.username,
					userType: 'instructor'
				}
			});
		}

		// 講師として見つからない場合
		console.log('[LOGIN] Instructor not found with this email');
		return json({ error: 'Invalid email or password' }, { status: 401 });
	} catch (error) {
		console.error('Login error:', error);
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		console.error('Error message:', error instanceof Error ? error.message : String(error));
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
