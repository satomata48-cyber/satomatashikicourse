import type { Handle } from '@sveltejs/kit'
import { createSupabaseServerClient } from '$lib/supabase'
import { redirect } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event)
	
	event.locals.safeGetSession = async () => {
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser()
		
		if (!user) {
			return { session: null, user: null }
		}
		
		// セッション情報も必要な場合は別途取得
		const { data: { session } } = await event.locals.supabase.auth.getSession()
		
		return { session, user }
	}
	
	const { session, user } = await event.locals.safeGetSession()
	event.locals.session = session
	event.locals.user = user
	event.locals.role = user?.user_metadata?.role ?? null
	
	// 最小限の保護のみ
	const path = event.url.pathname
	
	// ログインページと講師登録ページへのリダイレクトループを防ぐ
	if ((path === '/login' || path === '/instructor/register') && session) {
		// 既にログイン済みならダッシュボードへ
		if (user?.id) {
			// usernameを取得してリダイレクト
			const { data: profile } = await event.locals.supabase
				.from('profiles')
				.select('username')
				.eq('id', user.id)
				.single()

			if (profile?.username) {
				throw redirect(302, `/${profile.username}/dashboard`)
			} else {
				throw redirect(302, '/profile/setup')
			}
		}
	}
	
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version'
		}
	})
}