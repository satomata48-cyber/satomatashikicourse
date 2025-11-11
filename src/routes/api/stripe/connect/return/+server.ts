import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/stripe-server';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// TODO: D1実装が必要 - locals から認証情報を取得
		const user = locals.user;

		if (!user) {
			throw redirect(302, '/login?error=authentication_required');
		}

		// TODO: D1実装が必要 - プロフィールからStripe Account IDを取得
		const profile = {
			stripe_account_id: 'stub-account-id',
			username: 'stub-user'
		};

		if (!profile?.stripe_account_id) {
			throw redirect(302, `/${profile?.username || 'dashboard'}/payment-settings?error=account_not_found`);
		}

		const isDevelopment = process.env.NODE_ENV !== 'production';
		let successMessage = '';

		if (isDevelopment) {
			// 開発モード：即座に成功
			console.log('Development mode: Stripe account connected:', profile.stripe_account_id);
			successMessage = 'Stripeアカウントの接続が完了しました！（開発モード）';

			// TODO: D1実装が必要 - データベースを更新
			console.log('TODO: Update profile in D1 with active status');
		} else {
			// 本番モード：Stripeアカウントの状態を確認
			try {
				const account = await stripe.accounts.retrieve(profile.stripe_account_id);

				// TODO: D1実装が必要 - データベースを更新
				console.log('TODO: Update profile in D1 with account status:', {
					status: account.charges_enabled ? 'active' : 'pending',
					onboarding_completed: account.details_submitted || false
				});

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

		// フォールバック
		throw redirect(302, '/dashboard');
	}
};
