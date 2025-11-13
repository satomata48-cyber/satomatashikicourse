// テストユーザー作成スクリプト
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'local.db');

// PBKDF2パスワードハッシュ関数（auth.tsと同じロジック - Web Crypto API使用）
async function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString('hex');
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

function generateUUID() {
	return crypto.randomUUID();
}

console.log('=== テストユーザー作成 ===\n');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// デフォルトのテストユーザー
const testUsers = [
	{
		email: 'satomata48@gmail.com',
		password: 'password123',
		username: 'satomatashiki',
		display_name: 'Sato Matashiki',
		role: 'instructor'
	},
	{
		email: 'student@example.com',
		password: 'password123',
		username: 'teststudent',
		display_name: 'Test Student',
		role: 'student'
	}
];

async function createUsers() {
	for (const user of testUsers) {
		console.log(`[${user.role}] ${user.email} を作成中...`);

		// 既存ユーザーチェック
		const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(user.email);
		if (existing) {
			console.log(`  ⚠ すでに存在します: ${user.email}\n`);
			continue;
		}

		const id = generateUUID();
		const passwordHash = await hashPassword(user.password);

		db.prepare(`
			INSERT INTO profiles (id, email, password_hash, username, display_name, role)
			VALUES (?, ?, ?, ?, ?, ?)
		`).run(id, user.email, passwordHash, user.username, user.display_name, user.role);

		console.log(`  ✓ 作成完了: ${user.email}`);
		console.log(`    ID: ${id}`);
		console.log(`    Username: ${user.username}`);
		console.log(`    Password: ${user.password}\n`);

		// 講師の場合、サンプルスペースを作成
		if (user.role === 'instructor') {
			const spaceId = generateUUID();
			db.prepare(`
				INSERT INTO spaces (id, instructor_id, title, description, slug, is_active)
				VALUES (?, ?, ?, ?, ?, 1)
			`).run(spaceId, id, 'Sample Space', 'サンプルスペースです', 'sample');

			console.log(`  ✓ サンプルスペース作成: /satomatashiki/spaces/sample\n`);
		}
	}
}

createUsers()
	.then(() => {
		console.log('=== 作成完了 ===\n');
		console.log('ログイン情報:');
		console.log('  講師アカウント:');
		console.log('    Email: satomata48@gmail.com');
		console.log('    Password: password123');
		console.log('');
		console.log('  生徒アカウント:');
		console.log('    Email: student@example.com');
		console.log('    Password: password123');
		console.log('');
		console.log('開発サーバーを起動してログインをテストしてください: npm run dev\n');
		db.close();
	})
	.catch(err => {
		console.error('エラー:', err);
		db.close();
		process.exit(1);
	});
