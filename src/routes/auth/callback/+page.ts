import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url, depends }) => {
	depends('supabase:auth')
	
	// URLパラメータを取得
	const token = url.searchParams.get('token')
	const tokenHash = url.searchParams.get('token_hash') 
	const type = url.searchParams.get('type')
	
	return {
		token,
		tokenHash, 
		type,
		url: url.href
	}
}