import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ProfileManager, getD1, generateUUID } from '$lib/server/d1-db';
import {
	hashPassword,
	validateEmail,
	validatePassword,
	validateUsername
} from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { email, password, username, role = 'student' } = await request.json();

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
		const db = getD1(platform);

		// 既存ユーザーチェック
		const existingUser = await ProfileManager.getUserByEmail(db, email);
		if (existingUser) {
			return json({ error: 'Email already registered' }, { status: 400 });
		}

		if (username) {
			const existingUsername = await ProfileManager.getUserByUsername(db, username);
			if (existingUsername) {
				return json({ error: 'Username already taken' }, { status: 400 });
			}
		}

		// パスワードハッシュ化
		const password_hash = await hashPassword(password);

		// ユーザー作成
		const userId = generateUUID();
		await ProfileManager.createUser(db, {
			id: userId,
			email,
			password_hash,
			username: username || undefined,
			role: role === 'instructor' ? 'instructor' : 'student'
		});

		return json({ success: true, userId });
	} catch (error) {
		console.error('Registration error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
