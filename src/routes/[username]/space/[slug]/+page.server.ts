import type { PageServerLoad } from './$types'
import { createSupabaseServerClient } from '$lib/supabase'

export const load: PageServerLoad = async (event) => {
	const supabase = createSupabaseServerClient(event)
	
	// ユーザー情報を取得（ログインしていない場合でもエラーにしない）
	const { data: { user } } = await supabase.auth.getUser()
	
	return {
		user: user || null
	}
}