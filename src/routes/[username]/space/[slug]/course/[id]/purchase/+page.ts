import type { PageLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: PageLoad = async ({ parent, params }) => {
	const { user } = await parent()

	// ユーザーがログインしていない場合は生徒ログインページにリダイレクト
	if (!user) {
		const { username, slug } = params
		throw redirect(302, `/${username}/space/${slug}/student/login`)
	}

	return {
		user
	}
}