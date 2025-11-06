import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/stripe-server';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// locals から認証情報を取得（hooks.server.tsで設定）
		const user = locals.user;
		const supabase = locals.supabase;

		if (!user) {
			throw redirect(302, '/login?error=authentication_required');
		}

		// プロフィールからStripe Account IDを取得
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('stripe_account_id, username')
			.eq('id', user.id)
			.single();

		if (profileError || !profile?.stripe_account_id) {
			throw redirect(302, `/${profile?.username || 'dashboard'}/payment-settings?error=account_not_found`);
		}

		const isDevelopment = process.env.NODE_ENV !== 'production';
		let successMessage = '';

		if (isDevelopment) {
			// 開発モード：即座に成功
			console.log('Development mode: Stripe account connected:', profile.stripe_account_id);
			successMessage = 'Stripeアカウントの接続が完了しました！（開発モード）';

			// データベースを更新
			const { error: updateError } = await supabase
				.from('profiles')
				.update({
					stripe_account_status: 'active',
					stripe_onboarding_completed: true
				})
				.eq('id', user.id);

			if (updateError) {
				console.error('Database update error:', updateError);
			}
		} else {
			// 本番モード：Stripeアカウントの状態を確認
			try {
				const account = await stripe.accounts.retrieve(profile.stripe_account_id);

				// データベースを更新
				const { error: updateError } = await supabase
					.from('profiles')
					.update({
						stripe_account_status: account.charges_enabled ? 'active' : 'pending',
						stripe_onboarding_completed: account.details_submitted || false
					})
					.eq('id', user.id);

				if (updateError) {
					console.error('Database update error:', updateError);
				}

				successMessage = account.charges_enabled
					? 'Stripeアカウントの接続が完了しました！'
					: 'オンボーディングを開始しました。追加情報の入力が必要な場合があります。';
			} catch (stripeError) {
				console.error('Stripe account retrieval error:', stripeError);
				successMessage = 'Stripeアカウントの接続が完了しました！';
			}
		}

		throw redirect(302, `/${profile.username}/payment-settings?success=${encodeURIComponent(successMessage)}`);

	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}
		console.error('Return handler error:', error);

		// ユーザーのusernameを取得してエラーページにリダイレクト
		try {
			const user = locals.user;
			if (user) {
				const { data: profile } = await locals.supabase
					.from('profiles')
					.select('username')
					.eq('id', user.id)
					.single();

				if (profile?.username) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
					throw redirect(302, `/${profile.username}/payment-settings?error=${encodeURIComponent(errorMessage)}`);
				}
			}
		} catch (redirectError) {
			if (redirectError instanceof Response) {
				throw redirectError;
			}
		}

		// フォールバック
		throw redirect(302, '/dashboard');
	}
};
