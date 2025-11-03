import type { PageLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: PageLoad = async ({ parent, params }) => {
	const parentData = await parent()

	if (!parentData.user) {
		throw redirect(302, '/login')
	}

	return {
		user: parentData.user,
		username: params.username,
		slug: params.slug
	}
}
