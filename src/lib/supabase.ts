import { createServerClient } from '@supabase/ssr'
import { createBrowserClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import type { Database } from '../types/supabase'

export function createSupabaseServerClient(event: any) {
	return createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				get: (key) => event.cookies.get(key),
				set: (key, value, options) => {
					event.cookies.set(key, value, {
						...options,
						path: '/'
					})
				},
				remove: (key, options) => {
					event.cookies.delete(key, {
						...options,
						path: '/'
					})
				}
			}
		}
	)
}

export function createSupabaseBrowserClient() {
	return createBrowserClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY
	)
}

// サーバーサイド専用の関数
export function createSupabaseServiceRoleClient() {
	// この関数はサーバーサイドでのみ使用される
	throw new Error('This function should only be used on the server side')
}