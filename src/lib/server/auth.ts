// Cloudflare Workers 認証ユーティリティ
// Web Crypto APIを使用したパスワードハッシュ化とセッション管理

import { randomBytes } from 'crypto';

/**
 * パスワードをハッシュ化（PBKDF2使用）
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		{ name: 'PBKDF2' },
		false,
		['deriveBits']
	);

	const hashBuffer = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: encoder.encode(salt),
			iterations: 100000,
			hash: 'SHA-256'
		},
		keyMaterial,
		256
	);

	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

	return `${salt}:${hashHex}`;
}

/**
 * パスワードを検証
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
	const [salt, hash] = hashedPassword.split(':');
	const encoder = new TextEncoder();

	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		{ name: 'PBKDF2' },
		false,
		['deriveBits']
	);

	const hashBuffer = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: encoder.encode(salt),
			iterations: 100000,
			hash: 'SHA-256'
		},
		keyMaterial,
		256
	);

	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

	return hash === hashHex;
}

/**
 * ランダムなセッショントークンを生成
 */
export function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

/**
 * ランダムなUUIDを生成
 */
export function generateUUID(): string {
	return crypto.randomUUID();
}

/**
 * セッション有効期限を取得（7日後）
 */
export function getSessionExpiry(): string {
	const expiry = new Date();
	expiry.setDate(expiry.getDate() + 7);
	return expiry.toISOString();
}

/**
 * パスワードリセットトークン生成（1時間有効）
 */
export function generateResetToken(): { token: string; expiresAt: string } {
	const token = randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + 1);
	return { token, expiresAt: expiresAt.toISOString() };
}

/**
 * メールアドレスのバリデーション
 */
export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * パスワードの強度チェック（最低8文字）
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
	if (password.length < 8) {
		return { valid: false, message: 'パスワードは8文字以上である必要があります' };
	}
	return { valid: true };
}

/**
 * ユーザー名のバリデーション（英数字3-20文字）
 */
export function validateUsername(username: string): { valid: boolean; message?: string } {
	const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
	if (!usernameRegex.test(username)) {
		return {
			valid: false,
			message: 'ユーザー名は英数字とアンダースコアのみ、3-20文字である必要があります'
		};
	}
	return { valid: true };
}
