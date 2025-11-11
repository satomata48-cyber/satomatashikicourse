// Mock Database for Development (in-memory)
// This is used when D1 is not available in development mode

interface User {
	id: string;
	email: string;
	password_hash: string;
	display_name: string | null;
	username: string | null;
	role: string;
	created_at: number;
}

interface Session {
	id: string;
	user_id: string;
	token: string;
	expires_at: number;
	created_at: number;
}

interface Space {
	id: string;
	instructor_id: string;
	title: string;
	description: string | null;
	slug: string;
	max_students: number | null;
	is_active: boolean;
	landing_page_content: any | null;
	created_at: number;
	updated_at: number;
}

// In-memory storage
const users: Map<string, User> = new Map();
const sessions: Map<string, Session> = new Map();
const spaces: Map<string, Space> = new Map();
const usersByEmail: Map<string, string> = new Map(); // email -> userId
const usersByUsername: Map<string, string> = new Map(); // username -> userId

/**
 * セッション管理
 */
export class MockSessionManager {
	static async createSession(userId: string, token: string, expiresAt: number) {
		const id = crypto.randomUUID();
		const session: Session = {
			id,
			user_id: userId,
			token,
			expires_at: expiresAt,
			created_at: Math.floor(Date.now() / 1000)
		};
		sessions.set(token, session);
		return session;
	}

	static async getSessionByToken(token: string) {
		const session = sessions.get(token);
		if (!session) return null;

		const now = Math.floor(Date.now() / 1000);
		if (session.expires_at < now) {
			sessions.delete(token);
			return null;
		}

		return session;
	}

	static async deleteSession(token: string) {
		sessions.delete(token);
	}
}

/**
 * プロフィール管理
 */
export class MockProfileManager {
	static async getUserByEmail(email: string) {
		const userId = usersByEmail.get(email);
		if (!userId) return null;
		return users.get(userId) || null;
	}

	static async getUserById(id: string) {
		return users.get(id) || null;
	}

	static async getUserByUsername(username: string) {
		const userId = usersByUsername.get(username);
		if (!userId) return null;
		return users.get(userId) || null;
	}

	static async createUser(user: {
		id: string;
		email: string;
		password_hash: string;
		display_name?: string;
		username?: string;
		role: 'instructor' | 'student';
	}) {
		const newUser: User = {
			id: user.id,
			email: user.email,
			password_hash: user.password_hash,
			display_name: user.display_name || null,
			username: user.username || null,
			role: user.role,
			created_at: Math.floor(Date.now() / 1000)
		};

		users.set(user.id, newUser);
		usersByEmail.set(user.email, user.id);
		if (user.username) {
			usersByUsername.set(user.username, user.id);
		}

		return newUser;
	}

	static async updateProfile(userId: string, updates: any) {
		const user = users.get(userId);
		if (!user) return null;

		const updatedUser = { ...user, ...updates };
		users.set(userId, updatedUser);

		if (updates.username && updates.username !== user.username) {
			if (user.username) {
				usersByUsername.delete(user.username);
			}
			usersByUsername.set(updates.username, userId);
		}

		return updatedUser;
	}
}

export function generateUUID(): string {
	return crypto.randomUUID();
}

export function getCurrentTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * スペース管理
 */
export class MockSpaceManager {
	static async getSpacesByInstructor(instructorId: string) {
		const result: Space[] = [];
		spaces.forEach((space) => {
			if (space.instructor_id === instructorId) {
				result.push(space);
			}
		});
		// Sort by created_at descending
		return result.sort((a, b) => b.created_at - a.created_at);
	}

	static async getSpaceById(id: string) {
		return spaces.get(id) || null;
	}

	static async getSpaceBySlug(instructorId: string, slug: string) {
		for (const space of spaces.values()) {
			if (space.instructor_id === instructorId && space.slug === slug) {
				return space;
			}
		}
		return null;
	}

	static async createSpace(space: {
		id: string;
		instructor_id: string;
		title: string;
		description?: string;
		slug: string;
		max_students?: number;
		is_active?: boolean;
		landing_page_content?: any;
	}) {
		const newSpace: Space = {
			id: space.id,
			instructor_id: space.instructor_id,
			title: space.title,
			description: space.description || null,
			slug: space.slug,
			max_students: space.max_students || null,
			is_active: space.is_active !== undefined ? space.is_active : true,
			landing_page_content: space.landing_page_content || null,
			created_at: getCurrentTimestamp(),
			updated_at: getCurrentTimestamp()
		};

		spaces.set(space.id, newSpace);
		return newSpace;
	}

	static async updateSpace(spaceId: string, updates: Partial<Space>) {
		const space = spaces.get(spaceId);
		if (!space) return null;

		const updatedSpace = {
			...space,
			...updates,
			updated_at: getCurrentTimestamp()
		};

		spaces.set(spaceId, updatedSpace);
		return updatedSpace;
	}

	static async deleteSpace(spaceId: string) {
		spaces.delete(spaceId);
	}
}
