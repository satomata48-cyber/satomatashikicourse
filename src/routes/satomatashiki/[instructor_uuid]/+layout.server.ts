import type { LayoutServerLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
	const { user, role } = locals
	
	// デバッグ情報
	console.log('Layout server load debug:')
	console.log('- User:', user?.id)
	console.log('- User metadata:', user?.user_metadata)
	console.log('- Role from locals:', role)
	console.log('- Params UUID:', params.instructor_uuid)
	console.log('- URL:', url.pathname)
	
	// 認証チェック
	if (!user) {
		console.log('No user found, redirecting to login')
		const redirectUrl = new URL('/login', url.origin)
		redirectUrl.searchParams.set('redirect', url.pathname)
		throw redirect(302, redirectUrl.toString())
	}
	
	// 講師権限チェック
	if (role !== 'instructor') {
		console.log(`Role check failed. Expected 'instructor', got '${role}'`)
		const redirectUrl = new URL('/login', url.origin)
		redirectUrl.searchParams.set('error', '講師権限が必要です')
		redirectUrl.searchParams.set('redirect', url.pathname)
		throw redirect(302, redirectUrl.toString())
	}
	
	// UUIDがユーザーIDと一致するかチェック
	if (params.instructor_uuid !== user.id) {
		console.log(`UUID mismatch. Expected '${user.id}', got '${params.instructor_uuid}'`)
		const redirectUrl = new URL('/login', url.origin)
		redirectUrl.searchParams.set('error', 'アクセス権限がありません')
		redirectUrl.searchParams.set('redirect', url.pathname)
		throw redirect(302, redirectUrl.toString())
	}
	
	console.log('All checks passed, loading layout')
	
	return {
		user,
		role,
		session: locals.session
	}
}