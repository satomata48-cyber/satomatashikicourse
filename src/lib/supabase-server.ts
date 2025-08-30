import { createBrowserClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import type { Database } from '../types/supabase'

export function createSupabaseServiceRoleClient() {
	return createBrowserClient<Database>(
		PUBLIC_SUPABASE_URL,
		SUPABASE_SERVICE_ROLE_KEY
	)
}