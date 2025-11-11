import type { D1Database } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Locals {
			user: any | null;
			session: { token: string; expires_at: number } | null;
		}
		interface PageData {
			user: any | null;
		}
		interface Platform {
			env?: {
				DB?: D1Database;
			};
		}
	}
}

export {}