// Cloudflare D1 Database Helper
import type { D1Database } from '@cloudflare/workers-types';

/**
 * D1データベース取得
 */
export function getD1(platform: App.Platform | undefined): D1Database {
	if (!platform?.env?.DB) {
		throw new Error('D1 database not available');
	}
	return platform.env.DB;
}

/**
 * UUID生成
 */
export function generateUUID(): string {
	return crypto.randomUUID();
}

/**
 * 現在のUnixタイムスタンプ取得
 */
export function getCurrentTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * セッション管理
 */
export class SessionManager {
	/**
	 * セッション作成
	 */
	static async createSession(
		db: D1Database,
		userId: string,
		token: string,
		expiresAt: number
	) {
		const id = generateUUID();
		await db
			.prepare(
				'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
			)
			.bind(id, userId, token, expiresAt)
			.run();

		return { id, user_id: userId, token, expires_at: expiresAt };
	}

	/**
	 * トークンでセッション取得
	 */
	static async getSessionByToken(db: D1Database, token: string) {
		const now = getCurrentTimestamp();
		const result = await db
			.prepare(
				'SELECT * FROM sessions WHERE token = ? AND expires_at > ?'
			)
			.bind(token, now)
			.first();

		return result;
	}

	/**
	 * セッション削除
	 */
	static async deleteSession(db: D1Database, token: string) {
		await db
			.prepare('DELETE FROM sessions WHERE token = ?')
			.bind(token)
			.run();
	}

	/**
	 * 期限切れセッションをクリーンアップ
	 */
	static async cleanupExpiredSessions(db: D1Database) {
		const now = getCurrentTimestamp();
		await db
			.prepare('DELETE FROM sessions WHERE expires_at < ?')
			.bind(now)
			.run();
	}
}

/**
 * プロフィール管理
 */
export class ProfileManager {
	/**
	 * メールアドレスでユーザー取得
	 */
	static async getUserByEmail(db: D1Database, email: string) {
		const result = await db
			.prepare('SELECT * FROM profiles WHERE email = ?')
			.bind(email)
			.first();

		return result;
	}

	/**
	 * IDでユーザー取得
	 */
	static async getUserById(db: D1Database, id: string) {
		const result = await db
			.prepare('SELECT * FROM profiles WHERE id = ?')
			.bind(id)
			.first();

		return result;
	}

	/**
	 * ユーザー名でユーザー取得
	 */
	static async getUserByUsername(db: D1Database, username: string) {
		const result = await db
			.prepare('SELECT * FROM profiles WHERE username = ?')
			.bind(username)
			.first();

		return result;
	}

	/**
	 * ユーザー作成
	 */
	static async createUser(
		db: D1Database,
		user: {
			id: string;
			email: string;
			password_hash: string;
			display_name?: string;
			username?: string;
			role: 'instructor' | 'student';
		}
	) {
		await db
			.prepare(
				'INSERT INTO profiles (id, email, password_hash, display_name, username, role) VALUES (?, ?, ?, ?, ?, ?)'
			)
			.bind(
				user.id,
				user.email,
				user.password_hash,
				user.display_name || null,
				user.username || null,
				user.role
			)
			.run();

		return user;
	}

	/**
	 * プロフィール更新
	 */
	static async updateProfile(
		db: D1Database,
		userId: string,
		updates: {
			display_name?: string;
			username?: string;
			bio?: string;
			avatar_url?: string;
		}
	) {
		const fields: string[] = [];
		const values: any[] = [];

		if (updates.display_name !== undefined) {
			fields.push('display_name = ?');
			values.push(updates.display_name);
		}
		if (updates.username !== undefined) {
			fields.push('username = ?');
			values.push(updates.username);
		}
		if (updates.bio !== undefined) {
			fields.push('bio = ?');
			values.push(updates.bio);
		}
		if (updates.avatar_url !== undefined) {
			fields.push('avatar_url = ?');
			values.push(updates.avatar_url);
		}

		if (fields.length === 0) return null;

		fields.push('updated_at = CURRENT_TIMESTAMP');
		values.push(userId);

		const sql = `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`;
		await db.prepare(sql).bind(...values).run();

		return await ProfileManager.getUserById(db, userId);
	}
}

/**
 * パスワードリセット管理
 */
/**
 * スペース管理
 */
export class SpaceManager {
	/**
	 * 講師のスペース一覧を取得
	 */
	static async getSpacesByInstructor(db: D1Database, instructorId: string) {
		const result = await db
			.prepare('SELECT * FROM spaces WHERE instructor_id = ? ORDER BY created_at DESC')
			.bind(instructorId)
			.all();

		const spaces = result.results || [];
		// landing_page_contentをパース
		return spaces.map(space => {
			if (space.landing_page_content) {
				try {
					space.landing_page_content = JSON.parse(space.landing_page_content as string);
				} catch (e) {
					console.error('Failed to parse landing_page_content:', e);
					space.landing_page_content = null;
				}
			}
			return space;
		});
	}

	/**
	 * スペースをIDで取得
	 */
	static async getSpaceById(db: D1Database, id: string) {
		const result = await db
			.prepare('SELECT * FROM spaces WHERE id = ?')
			.bind(id)
			.first();

		if (result && result.landing_page_content) {
			try {
				result.landing_page_content = JSON.parse(result.landing_page_content as string);
			} catch (e) {
				console.error('Failed to parse landing_page_content:', e);
				result.landing_page_content = null;
			}
		}

		return result;
	}

	/**
	 * スペースをスラッグで取得
	 */
	static async getSpaceBySlug(db: D1Database, instructorId: string, slug: string) {
		const result = await db
			.prepare('SELECT * FROM spaces WHERE instructor_id = ? AND slug = ?')
			.bind(instructorId, slug)
			.first();

		if (result && result.landing_page_content) {
			try {
				result.landing_page_content = JSON.parse(result.landing_page_content as string);
			} catch (e) {
				console.error('Failed to parse landing_page_content:', e);
				result.landing_page_content = null;
			}
		}

		return result;
	}

	/**
	 * スペース作成
	 */
	static async createSpace(
		db: D1Database,
		space: {
			id: string;
			instructor_id: string;
			title: string;
			description?: string;
			slug: string;
			max_students?: number;
			is_active?: boolean;
			landing_page_content?: any;
		}
	) {
		await db
			.prepare(
				`INSERT INTO spaces (id, instructor_id, title, description, slug, max_students, is_active, landing_page_content, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
			)
			.bind(
				space.id,
				space.instructor_id,
				space.title,
				space.description || null,
				space.slug,
				space.max_students || null,
				space.is_active !== undefined ? (space.is_active ? 1 : 0) : 1,
				space.landing_page_content ? JSON.stringify(space.landing_page_content) : null
			)
			.run();

		return await SpaceManager.getSpaceById(db, space.id);
	}

	/**
	 * スペース更新
	 */
	static async updateSpace(db: D1Database, spaceId: string, updates: any) {
		const fields: string[] = [];
		const values: any[] = [];

		if (updates.title !== undefined) {
			fields.push('title = ?');
			values.push(updates.title);
		}
		if (updates.description !== undefined) {
			fields.push('description = ?');
			values.push(updates.description);
		}
		if (updates.slug !== undefined) {
			fields.push('slug = ?');
			values.push(updates.slug);
		}
		if (updates.max_students !== undefined) {
			fields.push('max_students = ?');
			values.push(updates.max_students);
		}
		if (updates.is_active !== undefined) {
			fields.push('is_active = ?');
			values.push(updates.is_active ? 1 : 0);
		}
		if (updates.landing_page_content !== undefined) {
			fields.push('landing_page_content = ?');
			values.push(JSON.stringify(updates.landing_page_content));
		}

		if (fields.length === 0) return null;

		fields.push('updated_at = CURRENT_TIMESTAMP');
		values.push(spaceId);

		const sql = `UPDATE spaces SET ${fields.join(', ')} WHERE id = ?`;
		await db.prepare(sql).bind(...values).run();

		return await SpaceManager.getSpaceById(db, spaceId);
	}

	/**
	 * スペース削除
	 */
	static async deleteSpace(db: D1Database, spaceId: string) {
		await db.prepare('DELETE FROM spaces WHERE id = ?').bind(spaceId).run();
	}
}

/**
 * コース管理
 */
export class CourseManager {
	/**
	 * スペースIDでコース一覧を取得
	 */
	static async getCoursesBySpaceId(db: D1Database, spaceId: string) {
		const result = await db
			.prepare('SELECT * FROM courses WHERE space_id = ? ORDER BY created_at DESC')
			.bind(spaceId)
			.all();

		return result.results || [];
	}

	/**
	 * 複数のスペースIDでコース一覧を取得
	 */
	static async getCoursesBySpaceIds(db: D1Database, spaceIds: string[]) {
		if (spaceIds.length === 0) return [];

		const placeholders = spaceIds.map(() => '?').join(',');
		const sql = `SELECT * FROM courses WHERE space_id IN (${placeholders}) ORDER BY created_at DESC`;

		const result = await db.prepare(sql).bind(...spaceIds).all();
		return result.results || [];
	}

	/**
	 * コースをIDで取得
	 */
	static async getCourseById(db: D1Database, id: string) {
		const result = await db
			.prepare('SELECT * FROM courses WHERE id = ?')
			.bind(id)
			.first();

		return result;
	}

	/**
	 * コースをスラッグで取得
	 */
	static async getCourseBySlug(db: D1Database, spaceId: string, slug: string) {
		const result = await db
			.prepare('SELECT * FROM courses WHERE space_id = ? AND slug = ?')
			.bind(spaceId, slug)
			.first();

		return result;
	}

	/**
	 * コース作成
	 */
	static async createCourse(db: D1Database, course: any) {
		await db
			.prepare(
				`INSERT INTO courses (
					id, space_id, title, description, slug, price, currency,
					is_free, is_published, thumbnail_url,
					stripe_product_id, stripe_price_id, stripe_payment_link,
					created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
			)
			.bind(
				course.id,
				course.space_id,
				course.title,
				course.description || null,
				course.slug || null,
				course.price || 0,
				course.currency || 'JPY',
				course.is_free ? 1 : 0,
				course.is_published ? 1 : 0,
				course.thumbnail_url || null,
				course.stripe_product_id || null,
				course.stripe_price_id || null,
				course.stripe_payment_link || null
			)
			.run();

		return await CourseManager.getCourseById(db, course.id);
	}

	/**
	 * コース更新
	 */
	static async updateCourse(db: D1Database, courseId: string, updates: any) {
		const fields: string[] = [];
		const values: any[] = [];

		if (updates.title !== undefined) {
			fields.push('title = ?');
			values.push(updates.title);
		}
		if (updates.description !== undefined) {
			fields.push('description = ?');
			values.push(updates.description);
		}
		if (updates.slug !== undefined) {
			fields.push('slug = ?');
			values.push(updates.slug);
		}
		if (updates.price !== undefined) {
			fields.push('price = ?');
			values.push(updates.price);
		}
		if (updates.is_free !== undefined) {
			fields.push('is_free = ?');
			values.push(updates.is_free ? 1 : 0);
		}
		if (updates.is_published !== undefined) {
			fields.push('is_published = ?');
			values.push(updates.is_published ? 1 : 0);
		}
		if (updates.thumbnail_url !== undefined) {
			fields.push('thumbnail_url = ?');
			values.push(updates.thumbnail_url);
		}
		if (updates.stripe_product_id !== undefined) {
			fields.push('stripe_product_id = ?');
			values.push(updates.stripe_product_id);
		}
		if (updates.stripe_price_id !== undefined) {
			fields.push('stripe_price_id = ?');
			values.push(updates.stripe_price_id);
		}
		if (updates.stripe_payment_link !== undefined) {
			fields.push('stripe_payment_link = ?');
			values.push(updates.stripe_payment_link);
		}
		if (updates.course_page_content !== undefined) {
			fields.push('course_page_content = ?');
			values.push(JSON.stringify(updates.course_page_content));
		}
		if (updates.currency !== undefined) {
			fields.push('currency = ?');
			values.push(updates.currency);
		}

		if (fields.length === 0) return null;

		fields.push('updated_at = CURRENT_TIMESTAMP');
		values.push(courseId);

		const sql = `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`;
		await db.prepare(sql).bind(...values).run();

		return await CourseManager.getCourseById(db, courseId);
	}

	/**
	 * コース削除
	 */
	static async deleteCourse(db: D1Database, courseId: string) {
		await db.prepare('DELETE FROM courses WHERE id = ?').bind(courseId).run();
	}
}

export class PasswordResetManager {
	/**
	 * リセットトークン作成
	 */
	static async createResetToken(
		db: D1Database,
		email: string,
		token: string,
		expiresAt: number
	) {
		const id = generateUUID();
		await db
			.prepare(
				'INSERT INTO password_resets (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)'
			)
			.bind(id, email, token, expiresAt)
			.run();

		return { id, email, token, expires_at: expiresAt, used: 0 };
	}

	/**
	 * リセットトークン検証
	 */
	static async validateResetToken(db: D1Database, token: string) {
		const now = getCurrentTimestamp();
		const result = await db
			.prepare(
				'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > ?'
			)
			.bind(token, now)
			.first();

		return result;
	}

	/**
	 * リセットトークンを使用済みにする
	 */
	static async markTokenAsUsed(db: D1Database, token: string) {
		await db
			.prepare('UPDATE password_resets SET used = 1 WHERE token = ?')
			.bind(token)
			.run();
	}
}
