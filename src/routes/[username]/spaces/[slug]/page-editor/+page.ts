import type { PageLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: PageLoad = async ({ parent, params }) => {
	const { session, user } = await parent()
	
	if (!session || !user) {
		throw redirect(302, '/auth/login')
	}
	
	// 講師権限の確認は、ページ内でUUIDとの照合により行う
	if (user.id !== params.uuid) {
		throw redirect(302, '/auth/unauthorized')
	}
	
	return {
		user
	}
}