// Dummy progress store
import { writable } from 'svelte/store';

export const lessonProgress = writable({});

export function updateProgress(lessonId: string, progress: any) {
	console.warn('Progress tracking disabled: D1 implementation required');
}
