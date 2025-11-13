import type { LayoutServerLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
	const { user } = locals

	// 認証チェック
	if (!user) {
		const redirectUrl = new URL(`/${params.username}/space/${params.slug}/register`, url.origin)
		throw redirect(302, redirectUrl.toString())
	}

	// 学生権限チェック（講師は除外）
	if ((user as any)?.role === 'instructor') {
		throw redirect(302, `/${params.username}/dashboard`)
	}

	return {
		user,
		session: locals.session
	}
}