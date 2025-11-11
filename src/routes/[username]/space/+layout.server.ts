import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async (event) => {
	// TODO: D1実装が必要 - ユーザー認証情報の取得

	// 公開ページ専用のデータを返す
	return {
		user: null,
		role: null,
		session: null,
		// 公開ページ専用フラグ
		isPublicPage: true
	}
}
