import { redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, params }) => {
	const { user } = await parent()

	if (!user) {
		throw redirect(303, '/login')
	}

	return {
		user,
		username: params.username,
		courseId: params.id
	}
}
