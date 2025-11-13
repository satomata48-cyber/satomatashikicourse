import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InstructorManager, StudentManager, getD1, generateUUID } from '$lib/server/d1-db';
import {
	hashPassword,
	validateEmail,
	validatePassword,
	validateUsername
} from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { email, password, username, display_name, role = 'student' } = await request.json();

		console.log('[REGISTER] Starting registration for role:', role, 'email:', email);

		// バリデーション
		if (!validateEmail(email)) {
			return json({ error: 'Invalid email address' }, { status: 400 });
		}

		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			return json({ error: passwordValidation.message }, { status: 400 });
		}

		if (username) {
			const usernameValidation = validateUsername(username);
			if (!usernameValidation.valid) {
				return json({ error: usernameValidation.message }, { status: 400 });
			}
		}

		// D1データベース取得
		const db = await getD1(platform);

		// ロールに応じて既存ユーザーチェック
		if (role === 'instructor') {
			// 講師の場合
			const existingInstructor = await InstructorManager.getInstructorByEmail(db, email);
			if (existingInstructor) {
				console.log('[REGISTER] Instructor email already registered');
				return json({ error: 'Email already registered' }, { status: 400 });
			}

			if (username) {
				const existingUsername = await InstructorManager.getInstructorByUsername(db, username);
				if (existingUsername) {
					console.log('[REGISTER] Instructor username already taken');
					return json({ error: 'Username already taken' }, { status: 400 });
				}
			}

			// パスワードハッシュ化
			const password_hash = await hashPassword(password);

			// 講師作成
			const userId = generateUUID();
			await InstructorManager.createInstructor(db, {
				id: userId,
				email,
				password_hash,
				display_name: display_name || undefined,
				username: username || undefined
			});

			console.log('[REGISTER] Instructor created successfully:', userId);
			return json({ success: true, userId, role: 'instructor' });
		} else {
			// 生徒の場合（メールアドレスの重複チェックなし - 複数スペースに登録可能）
			// パスワードハッシュ化
			const password_hash = await hashPassword(password);

			// 生徒作成
			const userId = generateUUID();
			await StudentManager.createStudent(db, {
				id: userId,
				email,
				password_hash,
				display_name: display_name || undefined
			});

			console.log('[REGISTER] Student created successfully:', userId);
			return json({ success: true, userId, role: 'student' });
		}
	} catch (error) {
		console.error('Registration error:', error);
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
