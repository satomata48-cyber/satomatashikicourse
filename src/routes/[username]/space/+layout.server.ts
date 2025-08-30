import type { LayoutServerLoad } from './$types'
import { createSupabaseServerClient } from '$lib/supabase'

export const load: LayoutServerLoad = async (event) => {
	const supabase = createSupabaseServerClient(event)
	
	// 公開ページなので認証は必須ではない
	// ユーザー情報があれば取得、なければnull
	const { data: { user } } = await supabase.auth.getUser()
	
	// 親レイアウトの認証チェックをバイパスするために
	// 公開ページ専用のユーザーデータを返す
	return {
		user: user || null,
		role: user?.user_metadata?.role || null,
		session: null,
		// 公開ページ専用フラグ
		isPublicPage: true
	}
}