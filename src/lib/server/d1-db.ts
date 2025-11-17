// Database Helper with Adapter Layer
import type { DatabaseAdapter } from './db-adapter';
import { getDatabaseAdapter } from './db-adapter';

/**
 * データベース取得（環境に応じて適切なアダプターを返す）
 * ローカル開発: better-sqlite3
 * 本番環境: Cloudflare D1
 */
export async function getD1(platform: App.Platform | undefined): Promise<DatabaseAdapter> {
	return await getDatabaseAdapter(platform);
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
 * 講師セッション管理
 */
export class InstructorSessionManager {
	/**
	 * 講師セッション作成
	 */
	static async createSession(
		db: DatabaseAdapter,
		instructorId: string,
		token: string,
		expiresAt: number
	) {
		const id = generateUUID();
		await db
			.prepare(
				'INSERT INTO instructor_sessions (id, instructor_id, token, expires_at) VALUES (?, ?, ?, ?)'
			)
			.bind(id, instructorId, token, expiresAt)
			.run();

		return { id, instructor_id: instructorId, token, expires_at: expiresAt };
	}

	/**
	 * トークンで講師セッション取得
	 */
	static async getSessionByToken(db: DatabaseAdapter, token: string) {
		const now = getCurrentTimestamp();
		const result = await db
			.prepare(
				'SELECT * FROM instructor_sessions WHERE token = ? AND expires_at > ?'
			)
			.bind(token, now)
			.first();

		return result;
	}

	/**
	 * 講師セッション削除
	 */
	static async deleteSession(db: DatabaseAdapter, token: string) {
		await db
			.prepare('DELETE FROM instructor_sessions WHERE token = ?')
			.bind(token)
			.run();
	}

	/**
	 * 期限切れ講師セッションをクリーンアップ
	 */
	static async cleanupExpiredSessions(db: DatabaseAdapter) {
		const now = getCurrentTimestamp();
		await db
			.prepare('DELETE FROM instructor_sessions WHERE expires_at < ?')
			.bind(now)
			.run();
	}
}

/**
 * 生徒セッション管理
 */
export class StudentSessionManager {
	/**
	 * 生徒セッション作成
	 */
	static async createSession(
		db: DatabaseAdapter,
		studentId: string,
		token: string,
		expiresAt: number
	) {
		const id = generateUUID();
		await db
			.prepare(
				'INSERT INTO student_sessions (id, student_id, token, expires_at) VALUES (?, ?, ?, ?)'
			)
			.bind(id, studentId, token, expiresAt)
			.run();

		return { id, student_id: studentId, token, expires_at: expiresAt };
	}

	/**
	 * トークンで生徒セッション取得
	 */
	static async getSessionByToken(db: DatabaseAdapter, token: string) {
		const now = getCurrentTimestamp();
		const result = await db
			.prepare(
				'SELECT * FROM student_sessions WHERE token = ? AND expires_at > ?'
			)
			.bind(token, now)
			.first();

		return result;
	}

	/**
	 * 生徒セッション削除
	 */
	static async deleteSession(db: DatabaseAdapter, token: string) {
		await db
			.prepare('DELETE FROM student_sessions WHERE token = ?')
			.bind(token)
			.run();
	}

	/**
	 * 期限切れ生徒セッションをクリーンアップ
	 */
	static async cleanupExpiredSessions(db: DatabaseAdapter) {
		const now = getCurrentTimestamp();
		await db
			.prepare('DELETE FROM student_sessions WHERE expires_at < ?')
			.bind(now)
			.run();
	}
}

/**
 * セッション管理 (旧バージョン - 後方互換性のため残す)
 * @deprecated Use InstructorSessionManager or StudentSessionManager instead
 */
export class SessionManager {
	/**
	 * セッション作成
	 */
	static async createSession(
		db: DatabaseAdapter,
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
	static async getSessionByToken(db: DatabaseAdapter, token: string) {
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
	static async deleteSession(db: DatabaseAdapter, token: string) {
		await db
			.prepare('DELETE FROM sessions WHERE token = ?')
			.bind(token)
			.run();
	}

	/**
	 * 期限切れセッションをクリーンアップ
	 */
	static async cleanupExpiredSessions(db: DatabaseAdapter) {
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
	static async getUserByEmail(db: DatabaseAdapter, email: string) {
		const result = await db
			.prepare('SELECT * FROM profiles WHERE email = ?')
			.bind(email)
			.first();

		return result;
	}

	/**
	 * IDでユーザー取得
	 */
	static async getUserById(db: DatabaseAdapter, id: string) {
		const result = await db
			.prepare('SELECT * FROM profiles WHERE id = ?')
			.bind(id)
			.first();

		return result;
	}

	/**
	 * ユーザー名でユーザー取得
	 */
	static async getUserByUsername(db: DatabaseAdapter, username: string) {
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
		db: DatabaseAdapter,
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
		db: DatabaseAdapter,
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
 * 講師管理
 */
export class InstructorManager {
	/**
	 * メールアドレスで講師取得
	 */
	static async getInstructorByEmail(db: DatabaseAdapter, email: string) {
		const result = await db
			.prepare('SELECT * FROM instructors WHERE email = ?')
			.bind(email)
			.first();

		return result;
	}

	/**
	 * IDで講師取得
	 */
	static async getInstructorById(db: DatabaseAdapter, id: string) {
		const result = await db
			.prepare('SELECT * FROM instructors WHERE id = ?')
			.bind(id)
			.first();

		return result;
	}

	/**
	 * ユーザー名で講師取得
	 */
	static async getInstructorByUsername(db: DatabaseAdapter, username: string) {
		const result = await db
			.prepare('SELECT * FROM instructors WHERE username = ?')
			.bind(username)
			.first();

		return result;
	}

	/**
	 * 講師作成
	 */
	static async createInstructor(
		db: DatabaseAdapter,
		instructor: {
			id: string;
			email: string;
			password_hash: string;
			display_name?: string;
			username?: string;
		}
	) {
		await db
			.prepare(
				'INSERT INTO instructors (id, email, password_hash, display_name, username) VALUES (?, ?, ?, ?, ?)'
			)
			.bind(
				instructor.id,
				instructor.email,
				instructor.password_hash,
				instructor.display_name || null,
				instructor.username || null
			)
			.run();

		return instructor;
	}

	/**
	 * 講師プロフィール更新
	 */
	static async updateInstructor(
		db: DatabaseAdapter,
		instructorId: string,
		updates: {
			display_name?: string;
			username?: string;
			bio?: string;
			avatar_url?: string;
			social_links?: string;
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
		if (updates.social_links !== undefined) {
			fields.push('social_links = ?');
			values.push(updates.social_links);
		}

		if (fields.length === 0) return null;

		fields.push('updated_at = CURRENT_TIMESTAMP');
		values.push(instructorId);

		const sql = `UPDATE instructors SET ${fields.join(', ')} WHERE id = ?`;
		await db.prepare(sql).bind(...values).run();

		return await InstructorManager.getInstructorById(db, instructorId);
	}
}

/**
 * 生徒管理
 */
export class StudentManager {
	/**
	 * メールアドレスとスペースIDで生徒取得
	 * (同じメールアドレスが複数のスペースに登録可能なため、スペースも考慮)
	 */
	static async getStudentByEmailInSpace(db: DatabaseAdapter, email: string, spaceId: string) {
		const result = await db
			.prepare(`
				SELECT s.*
				FROM students s
				INNER JOIN space_students ss ON s.id = ss.student_id
				WHERE s.email = ? AND ss.space_id = ?
			`)
			.bind(email, spaceId)
			.first();

		return result;
	}

	/**
	 * IDで生徒取得
	 */
	static async getStudentById(db: DatabaseAdapter, id: string) {
		const result = await db
			.prepare('SELECT * FROM students WHERE id = ?')
			.bind(id)
			.first();

		return result;
	}

	/**
	 * 生徒作成
	 */
	static async createStudent(
		db: DatabaseAdapter,
		student: {
			id: string;
			email: string;
			password_hash: string;
			display_name?: string;
		}
	) {
		await db
			.prepare(
				'INSERT INTO students (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
			)
			.bind(
				student.id,
				student.email,
				student.password_hash,
				student.display_name || null
			)
			.run();

		return student;
	}

	/**
	 * 生徒プロフィール更新
	 */
	static async updateStudent(
		db: DatabaseAdapter,
		studentId: string,
		updates: {
			display_name?: string;
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
		values.push(studentId);

		const sql = `UPDATE students SET ${fields.join(', ')} WHERE id = ?`;
		await db.prepare(sql).bind(...values).run();

		return await StudentManager.getStudentById(db, studentId);
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
	static async getSpacesByInstructor(db: DatabaseAdapter, instructorId: string) {
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
	static async getSpaceById(db: DatabaseAdapter, id: string) {
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
	static async getSpaceBySlug(db: DatabaseAdapter, instructorId: string, slug: string) {
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
		db: DatabaseAdapter,
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
	static async updateSpace(db: DatabaseAdapter, spaceId: string, updates: any) {
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
	static async deleteSpace(db: DatabaseAdapter, spaceId: string) {
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
	static async getCoursesBySpaceId(db: DatabaseAdapter, spaceId: string) {
		const result = await db
			.prepare('SELECT * FROM courses WHERE space_id = ? ORDER BY created_at DESC')
			.bind(spaceId)
			.all();

		return result.results || [];
	}

	/**
	 * 複数のスペースIDでコース一覧を取得
	 */
	static async getCoursesBySpaceIds(db: DatabaseAdapter, spaceIds: string[]) {
		if (spaceIds.length === 0) return [];

		const placeholders = spaceIds.map(() => '?').join(',');
		const sql = `SELECT * FROM courses WHERE space_id IN (${placeholders}) ORDER BY created_at DESC`;

		const result = await db.prepare(sql).bind(...spaceIds).all();
		return result.results || [];
	}

	/**
	 * コースをIDで取得
	 */
	static async getCourseById(db: DatabaseAdapter, id: string) {
		const result = await db
			.prepare('SELECT * FROM courses WHERE id = ?')
			.bind(id)
			.first();

		return result;
	}

	/**
	 * コースをスラッグで取得
	 */
	static async getCourseBySlug(db: DatabaseAdapter, spaceId: string, slug: string) {
		const result = await db
			.prepare('SELECT * FROM courses WHERE space_id = ? AND slug = ?')
			.bind(spaceId, slug)
			.first();

		return result;
	}

	/**
	 * コース作成
	 */
	static async createCourse(db: DatabaseAdapter, course: any) {
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
	static async updateCourse(db: DatabaseAdapter, courseId: string, updates: any) {
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
	static async deleteCourse(db: DatabaseAdapter, courseId: string) {
		await db.prepare('DELETE FROM courses WHERE id = ?').bind(courseId).run();
	}

	/**
	 * コース購入チェック
	 */
	static async hasStudentPurchasedCourse(
		db: DatabaseAdapter,
		courseId: string,
		studentId: string
	): Promise<boolean> {
		const result = await db
			.prepare(
				'SELECT id FROM course_purchases WHERE course_id = ? AND student_id = ? AND status = ?'
			)
			.bind(courseId, studentId, 'completed')
			.first();

		return !!result;
	}

	/**
	 * コースが無料または購入済みかチェック
	 */
	static async canStudentAccessCourse(
		db: DatabaseAdapter,
		courseId: string,
		studentId: string | null
	): Promise<boolean> {
		// コース情報を取得
		const course = await CourseManager.getCourseById(db, courseId);
		if (!course) return false;

		// 無料コースは誰でもアクセス可能
		if (course.is_free) return true;

		// 有料コースの場合、ログインしていないとアクセス不可
		if (!studentId) return false;

		// 購入済みかチェック
		return await CourseManager.hasStudentPurchasedCourse(db, courseId, studentId);
	}
}

export class PasswordResetManager {
	/**
	 * リセットトークン作成
	 */
	static async createResetToken(
		db: DatabaseAdapter,
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
	static async validateResetToken(db: DatabaseAdapter, token: string) {
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
	static async markTokenAsUsed(db: DatabaseAdapter, token: string) {
		await db
			.prepare('UPDATE password_resets SET used = 1 WHERE token = ?')
			.bind(token)
			.run();
	}
}

/**
 * スペース生徒管理
 */
/**
 * レッスン管理
 */
export class LessonManager {
	/**
	 * コースIDでレッスン一覧を取得
	 */
	static async getLessonsByCourseId(db: DatabaseAdapter, courseId: string) {
		const result = await db
			.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC, created_at ASC')
			.bind(courseId)
			.all();

		return result.results || [];
	}

	/**
	 * レッスンをIDで取得
	 */
	static async getLessonById(db: DatabaseAdapter, id: string) {
		const result = await db
			.prepare('SELECT * FROM lessons WHERE id = ?')
			.bind(id)
			.first();

		return result;
	}

	/**
	 * レッスン作成
	 */
	static async createLesson(db: DatabaseAdapter, lesson: any) {
		await db
			.prepare(
				`INSERT INTO lessons (
					id, course_id, title, description, content, content_before, content_after,
					video_url, video_type, duration, order_index, is_published, attachments, sections,
					created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
			)
			.bind(
				lesson.id,
				lesson.course_id,
				lesson.title,
				lesson.description || null,
				lesson.content || null, // 後方互換性のため残す
				lesson.content_before || null,
				lesson.content_after || null,
				lesson.video_url || null,
				lesson.video_type || null,
				lesson.duration || null,
				lesson.order_index || 0,
				lesson.is_published ? 1 : 0,
				lesson.attachments || null,
				lesson.sections || null
			)
			.run();

		return await LessonManager.getLessonById(db, lesson.id);
	}

	/**
	 * レッスン更新
	 */
	static async updateLesson(db: DatabaseAdapter, lessonId: string, updates: any) {
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
		if (updates.content !== undefined) {
			fields.push('content = ?');
			values.push(updates.content);
		}
		if (updates.content_before !== undefined) {
			fields.push('content_before = ?');
			values.push(updates.content_before);
		}
		if (updates.content_after !== undefined) {
			fields.push('content_after = ?');
			values.push(updates.content_after);
		}
		if (updates.video_url !== undefined) {
			fields.push('video_url = ?');
			values.push(updates.video_url);
		}
		if (updates.video_type !== undefined) {
			fields.push('video_type = ?');
			values.push(updates.video_type);
		}
		if (updates.duration !== undefined) {
			fields.push('duration = ?');
			values.push(updates.duration);
		}
		if (updates.order_index !== undefined) {
			fields.push('order_index = ?');
			values.push(updates.order_index);
		}
		if (updates.is_published !== undefined) {
			fields.push('is_published = ?');
			values.push(updates.is_published ? 1 : 0);
		}
		if (updates.attachments !== undefined) {
			fields.push('attachments = ?');
			values.push(updates.attachments);
		}
		if (updates.sections !== undefined) {
			fields.push('sections = ?');
			values.push(updates.sections);
		}

		if (fields.length === 0) return null;

		fields.push('updated_at = CURRENT_TIMESTAMP');
		values.push(lessonId);

		const sql = `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`;
		await db.prepare(sql).bind(...values).run();

		return await LessonManager.getLessonById(db, lessonId);
	}

	/**
	 * レッスン削除
	 */
	static async deleteLesson(db: DatabaseAdapter, lessonId: string) {
		await db.prepare('DELETE FROM lessons WHERE id = ?').bind(lessonId).run();
	}
}

export class SpaceStudentManager {
	/**
	 * スペースの生徒一覧を取得（プロフィール情報と購入情報を含む）
	 */
	static async getSpaceStudents(db: DatabaseAdapter, spaceId: string) {
		// 生徒基本情報取得
		const studentsResult = await db
			.prepare(`
				SELECT
					ss.id, ss.space_id, ss.student_id, ss.status, ss.enrolled_at,
					s.email, s.display_name, s.avatar_url, s.bio
				FROM space_students ss
				LEFT JOIN students s ON ss.student_id = s.id
				WHERE ss.space_id = ?
				ORDER BY ss.enrolled_at DESC
			`)
			.bind(spaceId)
			.all();

		const students = studentsResult.results || [];

		// 各生徒の購入情報を取得
		const studentsWithPurchases = await Promise.all(
			students.map(async (student: any) => {
				const purchasesResult = await db
					.prepare(`
						SELECT
							cp.id, cp.course_id, cp.amount, cp.currency, cp.status, cp.purchased_at,
							c.title as course_title
						FROM course_purchases cp
						LEFT JOIN courses c ON cp.course_id = c.id
						WHERE cp.student_id = ? AND c.space_id = ?
						ORDER BY cp.purchased_at DESC
					`)
					.bind(student.student_id, spaceId)
					.all();

				return {
					...student,
					profile: {
						email: student.email,
						display_name: student.display_name,
						avatar_url: student.avatar_url,
						bio: student.bio
					},
					purchases: (purchasesResult.results || []).map((p: any) => ({
						...p,
						course: { title: p.course_title }
					}))
				};
			})
		);

		return studentsWithPurchases;
	}

	/**
	 * スペースに生徒を追加
	 */
	static async addStudentToSpace(
		db: DatabaseAdapter,
		spaceId: string,
		studentId: string,
		status: 'active' | 'inactive' | 'suspended' = 'active'
	) {
		const id = generateUUID();
		await db
			.prepare(
				'INSERT INTO space_students (id, space_id, student_id, status, enrolled_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
			)
			.bind(id, spaceId, studentId, status)
			.run();

		return { id, space_id: spaceId, student_id: studentId, status };
	}

	/**
	 * 生徒のステータス更新
	 */
	static async updateStudentStatus(
		db: DatabaseAdapter,
		studentRecordId: string,
		status: 'active' | 'inactive' | 'suspended' | 'completed'
	) {
		await db
			.prepare('UPDATE space_students SET status = ? WHERE id = ?')
			.bind(status, studentRecordId)
			.run();
	}

	/**
	 * スペースから生徒を削除
	 */
	static async removeStudentFromSpace(db: DatabaseAdapter, studentRecordId: string) {
		await db
			.prepare('DELETE FROM space_students WHERE id = ?')
			.bind(studentRecordId)
			.run();
	}

	/**
	 * 生徒がスペースに登録済みか確認
	 */
	static async isStudentInSpace(db: DatabaseAdapter, spaceId: string, studentId: string) {
		const result = await db
			.prepare('SELECT id FROM space_students WHERE space_id = ? AND student_id = ?')
			.bind(spaceId, studentId)
			.first();

		return !!result;
	}
}

/**
 * 講師プロフィール管理
 */
export class InstructorProfileManager {
	/**
	 * 講師IDでプロフィール一覧を取得
	 */
	static async getProfilesByInstructorId(db: DatabaseAdapter, instructorId: string) {
		const result = await db
			.prepare('SELECT * FROM instructor_profiles WHERE instructor_id = ? ORDER BY is_primary DESC, created_at ASC')
			.bind(instructorId)
			.all();

		return result.results || [];
	}

	/**
	 * プロフィールをIDで取得
	 */
	static async getProfileById(db: DatabaseAdapter, id: string) {
		const result = await db
			.prepare('SELECT * FROM instructor_profiles WHERE id = ?')
			.bind(id)
			.first();

		return result;
	}

	/**
	 * プライマリプロフィールを取得
	 */
	static async getPrimaryProfile(db: DatabaseAdapter, instructorId: string) {
		const result = await db
			.prepare('SELECT * FROM instructor_profiles WHERE instructor_id = ? AND is_primary = 1 LIMIT 1')
			.bind(instructorId)
			.first();

		return result;
	}

	/**
	 * プロフィール作成
	 */
	static async createProfile(
		db: DatabaseAdapter,
		profile: {
			id: string;
			instructor_id: string;
			display_name: string;
			bio?: string;
			avatar_url?: string;
			social_links?: string;
			is_primary?: boolean;
			is_active?: boolean;
		}
	) {
		await db
			.prepare(
				`INSERT INTO instructor_profiles (id, instructor_id, display_name, bio, avatar_url, social_links, is_primary, is_active, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
			)
			.bind(
				profile.id,
				profile.instructor_id,
				profile.display_name,
				profile.bio || null,
				profile.avatar_url || null,
				profile.social_links || null,
				profile.is_primary !== undefined ? (profile.is_primary ? 1 : 0) : 1,
				profile.is_active !== undefined ? (profile.is_active ? 1 : 0) : 1
			)
			.run();

		return await InstructorProfileManager.getProfileById(db, profile.id);
	}

	/**
	 * プロフィール更新
	 */
	static async updateProfile(db: DatabaseAdapter, profileId: string, updates: any) {
		const fields: string[] = [];
		const values: any[] = [];

		if (updates.display_name !== undefined) {
			fields.push('display_name = ?');
			values.push(updates.display_name);
		}
		if (updates.bio !== undefined) {
			fields.push('bio = ?');
			values.push(updates.bio);
		}
		if (updates.avatar_url !== undefined) {
			fields.push('avatar_url = ?');
			values.push(updates.avatar_url);
		}
		if (updates.social_links !== undefined) {
			fields.push('social_links = ?');
			values.push(updates.social_links);
		}
		if (updates.is_primary !== undefined) {
			fields.push('is_primary = ?');
			values.push(updates.is_primary ? 1 : 0);
		}
		if (updates.is_active !== undefined) {
			fields.push('is_active = ?');
			values.push(updates.is_active ? 1 : 0);
		}

		if (fields.length === 0) return null;

		fields.push('updated_at = CURRENT_TIMESTAMP');
		values.push(profileId);

		const sql = `UPDATE instructor_profiles SET ${fields.join(', ')} WHERE id = ?`;
		await db.prepare(sql).bind(...values).run();

		return await InstructorProfileManager.getProfileById(db, profileId);
	}

	/**
	 * プロフィール削除
	 */
	static async deleteProfile(db: DatabaseAdapter, profileId: string) {
		await db.prepare('DELETE FROM instructor_profiles WHERE id = ?').bind(profileId).run();
	}
}
