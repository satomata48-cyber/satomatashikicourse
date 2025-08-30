import type { LayoutServerLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
	const { user, role } = locals
	
	// 公開ページ（/space/ パス）の場合は認証チェックをスキップ
	const isPublicSpacePage = url.pathname.includes('/space/')
	
	if (!isPublicSpacePage) {
		// 管理画面の場合のみ認証チェック
		if (!user) {
			const redirectUrl = new URL('/login', url.origin)
			redirectUrl.searchParams.set('redirect', url.pathname)
			throw redirect(302, redirectUrl.toString())
		}
	}
	
	// ユーザー情報を返す（認証状況に関係なく）
	return {
		user: user || null,
		role: user?.user_metadata?.role || null,
		session: locals.session || null
	}
}