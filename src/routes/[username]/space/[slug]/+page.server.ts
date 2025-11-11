import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
	// TODO: D1実装が必要 - ユーザー認証情報の取得

	return {
		user: null // スタブ: 現在はユーザー情報を返さない
	}
}
