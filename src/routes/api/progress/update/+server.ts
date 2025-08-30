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
		
		// 生徒IDを取得
		const { data: student, error: studentError } = await locals.supabase
			.from('space_students')
			.select('id')
			.eq('user_id', locals.user.id)
			.single()
		
		if (studentError || !student) {
			return json({ error: 'Student not found' }, { status: 404 })
		}
		
		// 進捗を更新/作成
		const progressData = {
			student_id: student.id,
			lesson_id: lesson_id,
			watch_time_seconds: watch_time_seconds || 0,
			last_position_seconds: watch_time_seconds || 0,
			completion_percentage: completion_percentage || 0,
			is_completed: is_completed || false,
			completed_at: is_completed ? new Date().toISOString() : null,
			last_watched_at: new Date().toISOString()
		}
		
		const { data, error } = await locals.supabase
			.from('lesson_progress')
			.upsert(progressData, {
				onConflict: 'student_id,lesson_id'
			})
			.select()
		
		if (error) {
			console.error('Progress update error:', error)
			return json({ error: 'Failed to update progress' }, { status: 500 })
		}
		
		return json({ success: true, data })
		
	} catch (err: any) {
		console.error('API error:', err)
		return json({ error: 'Internal server error' }, { status: 500 })
	}
}