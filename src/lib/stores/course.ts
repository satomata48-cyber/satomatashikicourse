import { writable, derived } from 'svelte/store'
import type { Database } from '../../types/supabase'

type Course = Database['public']['Tables']['courses']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']

export const courseStore = writable<Course[]>([])
export const currentCourse = writable<Course | null>(null)
export const lessonsStore = writable<Lesson[]>([])

export const publishedCourses = derived(
	courseStore,
	$courses => $courses.filter(c => c.is_published)
)

export const freeCourses = derived(
	publishedCourses,
	$courses => $courses.filter(c => c.is_free)
)