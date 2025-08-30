import { writable } from 'svelte/store'
import type { User } from '@supabase/supabase-js'

interface AuthState {
	user: User | null
	role: 'instructor' | 'student' | 'admin' | null
	loading: boolean
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		role: null,
		loading: true
	})
	
	return {
		subscribe,
		setUser: (user: User | null) => update(state => ({
			...state,
			user,
			role: user?.user_metadata?.role ?? null,
			loading: false
		})),
		setLoading: (loading: boolean) => update(state => ({ ...state, loading })),
		reset: () => set({ user: null, role: null, loading: false })
	}
}

export const authStore = createAuthStore()