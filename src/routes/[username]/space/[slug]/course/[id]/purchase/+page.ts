import type { PageLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: PageLoad = async ({ parent }) => {
	const { session, user } = await parent()
	
	if (!session || !user) {
		throw redirect(302, '/auth/login')
	}
	
	return {
		user
	}
}