import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'

export const POST: RequestHandler = async ({ request }) => {
	try {
		// サービスロールキーを使用してSupabaseクライアントを作成
		const supabaseAdmin = createClient(
			PUBLIC_SUPABASE_URL,
			SUPABASE_SERVICE_ROLE_KEY,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false
				}
			}
		)

		const { spaceId } = await request.json()

		if (!spaceId) {
			return json({ error: 'スペースIDが必要です' }, { status: 400 })
		}

		const testEmail = 'satomata48@gmail.com'
		const testPassword = 'satomata4848'

		// 1. 既存のユーザーを確認
		const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
		let testUser = existingUsers?.users.find(u => u.email === testEmail)

		// 2. ユーザーが存在しない場合は作成
		if (!testUser) {
			const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
				email: testEmail,
				password: testPassword,
				email_confirm: true,
				user_metadata: {
					display_name: 'テスト生徒',
					username: 'teststudent'
				}
			})

			if (userError) {
				console.error('ユーザー作成エラー:', userError)
				return json({ error: 'ユーザーの作成に失敗しました: ' + userError.message }, { status: 500 })
			}

			testUser = newUser.user
		}

		if (!testUser) {
			return json({ error: 'ユーザーの取得に失敗しました' }, { status: 500 })
		}

		// 3. プロフィールを作成または更新
		const { error: profileError } = await supabaseAdmin
			.from('profiles')
			.upsert({
				id: testUser.id,
				email: testEmail,
				display_name: 'テスト生徒',
				username: 'teststudent',
				role: 'student',
				bio: 'テスト用の生徒アカウントです',
				stripe_account_status: 'pending',
				stripe_onboarding_completed: false
			}, {
				onConflict: 'id'
			})

		if (profileError) {
			console.error('プロフィール作成エラー:', profileError)
			return json({ error: 'プロフィールの作成に失敗しました: ' + profileError.message }, { status: 500 })
		}

		// 4. スペースに生徒を登録
		const { error: enrollError } = await supabaseAdmin
			.from('space_students')
			.upsert({
				space_id: spaceId,
				student_id: testUser.id,
				status: 'active'
			}, {
				onConflict: 'space_id,student_id'
			})

		if (enrollError) {
			console.error('スペース登録エラー:', enrollError)
			return json({ error: 'スペースへの登録に失敗しました: ' + enrollError.message }, { status: 500 })
		}

		return json({
			success: true,
			message: 'テスト生徒アカウントが作成されました',
			user: {
				id: testUser.id,
				email: testEmail
			}
		})

	} catch (error: any) {
		console.error('テスト生徒作成エラー:', error)
		return json({ error: error.message }, { status: 500 })
	}
}
