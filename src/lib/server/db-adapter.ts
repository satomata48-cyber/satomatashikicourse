// Database Adapter Layer
// Provides unified interface for both local (better-sqlite3) and production (D1) databases

import type { D1Database, D1Result } from '@cloudflare/workers-types';

/**
 * Unified database interface that mimics D1's API
 */
export interface DatabaseAdapter {
	prepare(query: string): PreparedStatementAdapter;
}

export interface PreparedStatementAdapter {
	bind(...values: any[]): PreparedStatementAdapter;
	first<T = unknown>(): Promise<T | null>;
	all<T = unknown>(): Promise<D1Result<T>>;
	run(): Promise<D1Result>;
}

/**
 * Better-SQLite3 Adapter for local development
 */
class BetterSQLitePreparedStatement implements PreparedStatementAdapter {
	private statement: any;
	private boundValues: any[] = [];

	constructor(statement: any) {
		this.statement = statement;
	}

	bind(...values: any[]): PreparedStatementAdapter {
		this.boundValues = values;
		return this;
	}

	async first<T = unknown>(): Promise<T | null> {
		try {
			const result = this.statement.get(...this.boundValues);
			return result || null;
		} catch (error) {
			console.error('[BetterSQLite] Query error:', error);
			console.error('[BetterSQLite] Query:', this.statement.source);
			console.error('[BetterSQLite] Values:', this.boundValues);
			throw error;
		}
	}

	async all<T = unknown>(): Promise<D1Result<T>> {
		try {
			const results = this.statement.all(...this.boundValues);
			return {
				results: results || [],
				success: true,
				meta: {}
			} as D1Result<T>;
		} catch (error) {
			console.error('[BetterSQLite] Query error:', error);
			console.error('[BetterSQLite] Query:', this.statement.source);
			console.error('[BetterSQLite] Values:', this.boundValues);
			throw error;
		}
	}

	async run(): Promise<D1Result> {
		try {
			const info = this.statement.run(...this.boundValues);
			return {
				success: true,
				meta: {
					changes: info.changes,
					last_row_id: info.lastInsertRowid
				}
			} as D1Result;
		} catch (error) {
			console.error('[BetterSQLite] Query error:', error);
			console.error('[BetterSQLite] Query:', this.statement.source);
			console.error('[BetterSQLite] Values:', this.boundValues);
			throw error;
		}
	}
}

export class BetterSQLiteAdapter implements DatabaseAdapter {
	private db: any;
	private initialized: Promise<void>;

	constructor(dbPath: string) {
		console.log('[BetterSQLite] Opening database at:', dbPath);
		// 動的インポート（ビルド時にbetter-sqlite3がバンドルされないようにする）
		this.initialized = this.init(dbPath);
	}

	private async init(dbPath: string) {
		const { default: Database } = await import('better-sqlite3');
		this.db = new Database(dbPath);
		this.db.pragma('journal_mode = WAL');
		this.db.pragma('foreign_keys = ON');
		console.log('[BetterSQLite] Database opened successfully');
	}

	prepare(query: string): PreparedStatementAdapter {
		// データベースが初期化されていない場合はエラー
		if (!this.db) {
			throw new Error('[BetterSQLite] Database not initialized. Call await adapter.waitForInit() first.');
		}
		const statement = this.db.prepare(query);
		return new BetterSQLitePreparedStatement(statement);
	}

	close() {
		this.db.close();
	}

	async waitForInit(): Promise<void> {
		await this.initialized;
	}
}

/**
 * D1 Adapter for production (Cloudflare Pages)
 */
class D1PreparedStatement implements PreparedStatementAdapter {
	private statement: any;

	constructor(statement: any) {
		this.statement = statement;
	}

	bind(...values: any[]): PreparedStatementAdapter {
		this.statement = this.statement.bind(...values);
		return this;
	}

	async first<T = unknown>(): Promise<T | null> {
		return await this.statement.first();
	}

	async all<T = unknown>(): Promise<D1Result<T>> {
		return await this.statement.all();
	}

	async run(): Promise<D1Result> {
		return await this.statement.run();
	}
}

export class D1Adapter implements DatabaseAdapter {
	private db: D1Database;

	constructor(db: D1Database) {
		this.db = db;
	}

	prepare(query: string): PreparedStatementAdapter {
		const statement = this.db.prepare(query);
		return new D1PreparedStatement(statement);
	}
}

/**
 * Get appropriate database adapter based on environment
 */
let localDbInstance: BetterSQLiteAdapter | null = null;

export async function getDatabaseAdapter(
	platform: App.Platform | undefined
): Promise<DatabaseAdapter> {
	// Detect if we're running in Node.js (local development) vs Cloudflare Workers
	const isNodeEnvironment = typeof process !== 'undefined' && process.versions?.node;

	// Force local DB in Node.js environment OR if platform.env.DB is not available
	const useLocalDb = isNodeEnvironment || !platform?.env?.DB;

	console.log('[DB] Platform check:', {
		useLocalDb,
		isNodeEnvironment,
		hasNodeProcess: typeof process !== 'undefined',
		nodeVersion: typeof process !== 'undefined' ? process.versions?.node : undefined,
		platform: !!platform,
		env: !!platform?.env,
		DB: !!platform?.env?.DB
	});

	// If in Node.js environment (local development), use better-sqlite3
	if (useLocalDb) {
		console.log('[DB] Using BetterSQLite (local development)');
		if (!localDbInstance) {
			const { join } = await import('path');
			const dbPath = join(process.cwd(), 'local.db');
			localDbInstance = new BetterSQLiteAdapter(dbPath);
			await localDbInstance.waitForInit();
		}
		return localDbInstance;
	}

	// Production (Cloudflare Workers): Use D1
	console.log('[DB] Using D1 database (production)');
	return new D1Adapter(platform.env.DB);
}

/**
 * Initialize local database with schema
 */
export function initializeLocalDatabase() {
	const path = require('path');
	const Database = require('better-sqlite3');
	const dbPath = path.join(process.cwd(), 'local.db');
	const db = new Database(dbPath);

	console.log('[DB] Initializing local database schema...');

	// Execute schema
	const schema = `
-- 1. profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  display_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  bio TEXT,
  social_links TEXT,
  stripe_account_id TEXT,
  stripe_account_status TEXT DEFAULT 'pending',
  stripe_onboarding_completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON profiles(stripe_account_id);

-- 2. spaces table
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  max_students INTEGER,
  is_active INTEGER DEFAULT 1,
  landing_page_content TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(instructor_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_spaces_instructor ON spaces(instructor_id);
CREATE INDEX IF NOT EXISTS idx_spaces_slug ON spaces(slug);

-- 3. courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT,
  price REAL,
  currency TEXT DEFAULT 'JPY',
  is_free INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  course_page_content TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  stripe_payment_link TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_courses_space ON courses(space_id);
CREATE INDEX IF NOT EXISTS idx_courses_stripe_product ON courses(stripe_product_id);

-- 4. lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  video_type TEXT,
  duration INTEGER,
  order_index INTEGER NOT NULL,
  is_published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);

-- 5. space_students table
CREATE TABLE IF NOT EXISTS space_students (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(space_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_space_students_space ON space_students(space_id);
CREATE INDEX IF NOT EXISTS idx_space_students_student ON space_students(student_id);

-- 6. course_purchases table
CREATE TABLE IF NOT EXISTS course_purchases (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  amount REAL,
  currency TEXT DEFAULT 'JPY',
  status TEXT DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_course ON course_purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_purchases_student ON course_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON course_purchases(stripe_session_id);

-- 7. lesson_completions table
CREATE TABLE IF NOT EXISTS lesson_completions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_completions_lesson ON lesson_completions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_completions_student ON lesson_completions(student_id);

-- 8. stripe_webhook_events table
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data TEXT,
  processed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);

-- 9. sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 10. password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
`;

	db.exec(schema);
	db.pragma('foreign_keys = ON');
	db.close();

	console.log('[DB] Local database initialized successfully');
}
