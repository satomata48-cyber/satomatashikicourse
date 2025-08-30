import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/supabase'

/**
 * 講師のUUIDから講師IDを取得する
 */
export async function getInstructorIdFromUuid(
	supabase: SupabaseClient<Database>,
	uuid: string
): Promise<string> {
	const { data, error } = await supabase
		.from('instructors')
		.select('id')
		.eq('uuid', uuid)
		.single()
	
	if (error || !data) {
		throw new Error('講師が見つかりません')
	}
	
	return data.id
}