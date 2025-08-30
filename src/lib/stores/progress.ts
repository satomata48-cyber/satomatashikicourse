import { writable, derived } from 'svelte/store'
import { currentCourse } from './course'
import type { Database } from '../../types/supabase'

type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']

export const progressStore = writable<Map<string, LessonProgress>>(new Map())

export const courseProgress = derived(
	[currentCourse, progressStore],
	([$course, $progress]) => {
		if (!$course) return 0
		// Note: This would need lessons data to calculate properly
		return 0
	}
)

export function updateProgress(lessonId: string, progress: LessonProgress) {
	progressStore.update(store => {
		store.set(lessonId, progress)
		return store
	})
}