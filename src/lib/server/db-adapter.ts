// Database Adapter Layer - D1 Only (Production)
// For local development, use wrangler dev with --remote flag

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
 * Get D1 database adapter
 */
export async function getDatabaseAdapter(
	platform: App.Platform | undefined
): Promise<DatabaseAdapter> {
	if (!platform?.env?.DB) {
		throw new Error(
			'D1 database not available. ' +
			'For local development, use: npm run cf-dev (wrangler with --remote D1)'
		);
	}

	console.log('[DB] Using D1 database');
	return new D1Adapter(platform.env.DB);
}
