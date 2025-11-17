import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getD1 } from '$lib/server/d1-db';
import { hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const { token, newPassword } = await request.json();

		if (!token || !newPassword) {
			return json({ error: 'Token and new password are required' }, { status: 400 });
		}

		if (newPassword.length < 8) {
			return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
		}

		const db = await getD1(platform);

		// トークンを検証
		const resetToken = await db
			.prepare(
				'SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > ?'
			)
			.bind(token, new Date().toISOString())
			.first();

		if (!resetToken) {
			return json({ error: 'Invalid or expired reset token' }, { status: 400 });
		}

		// パスワードをハッシュ化
		const passwordHash = await hashPassword(newPassword);

		// 生徒のパスワードを更新
		await db
			.prepare('UPDATE students SET password_hash = ?, updated_at = ? WHERE id = ?')
			.bind(passwordHash, new Date().toISOString(), resetToken.student_id)
			.run();

		// トークンを使用済みにマーク
		await db
			.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?')
			.bind(new Date().toISOString(), resetToken.id)
			.run();

		return json({ success: true });
	} catch (error) {
		console.error('Reset password error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
