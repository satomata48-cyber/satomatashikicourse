import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { lesson_id, watch_time_seconds, completion_percentage, is_completed } = await request.json()

		if (!lesson_id) {
			return json({ error: 'lesson_id is required' }, { status: 400 })
		}

		// TODO: D1実装が必要 - 進捗の更新と保存
		return json({ error: 'Progress tracking not implemented' }, { status: 501 })

	} catch (err: any) {
		console.error('API error:', err)
		return json({ error: 'Internal server error' }, { status: 500 })
	}
}