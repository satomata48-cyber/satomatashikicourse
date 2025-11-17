import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StudentManager, getD1 } from '$lib/server/d1-db';
import { randomBytes } from 'crypto';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { email, spaceId } = await request.json();

		if (!email) {
			return json({ error: 'Email is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// 生徒を検索
		let student;
		if (spaceId) {
			student = await StudentManager.getStudentByEmailInSpace(db, email, spaceId);
			if (!student) {
				// スペースに登録されていなくてもメールで検索
				const result = await db
					.prepare('SELECT * FROM students WHERE email = ? LIMIT 1')
					.bind(email)
					.first();
				student = result;
			}
		} else {
			const result = await db
				.prepare('SELECT * FROM students WHERE email = ? LIMIT 1')
				.bind(email)
				.first();
			student = result;
		}

		if (!student) {
			// セキュリティのため、ユーザーが存在しなくても成功を返す
			return json({ success: true, token: 'dummy' });
		}

		// リセットトークンを生成（1時間有効）
		const resetToken = randomBytes(32).toString('hex');
		const expiresAt = Date.now() + 60 * 60 * 1000; // 1時間後

		// トークンをデータベースに保存
		await db
			.prepare(
				'INSERT INTO password_reset_tokens (id, student_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
			)
			.bind(
				crypto.randomUUID(),
				student.id,
				resetToken,
				new Date(expiresAt).toISOString(),
				new Date().toISOString()
			)
			.run();

		return json({ success: true, token: resetToken });
	} catch (error) {
		console.error('Request password reset error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
