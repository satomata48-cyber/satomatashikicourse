import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/stripe-server';
import { createSupabaseServiceRoleClient } from '$lib/supabase-server';

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const authHeader = request.headers.get('authorization');
		if (!authHeader) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// ユーザー認証
		const supabase = createSupabaseServiceRoleClient();
		const token = authHeader.replace('Bearer ', '');
		const { data: { user }, error: authError } = await supabase.auth.getUser(token);

		if (authError || !user) {
			return json({ error: 'Invalid authentication token' }, { status: 401 });
		}

		// プロフィール情報を取得
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('stripe_account_id, email, display_name')
			.eq('id', user.id)
			.single();

		if (profileError) {
			return json({ error: 'Profile not found' }, { status: 404 });
		}

		// 簡易実装：ダミーのStripeアカウントIDを設定
		// 本番環境では実際のStripe Connectを使用
		const isDevelopment = process.env.NODE_ENV !== 'production';

		let accountId = profile.stripe_account_id;
		let accountStatus = 'active'; // 開発モードでは即座にアクティブ

		if (!accountId) {
			if (isDevelopment) {
				// 開発モード：ダミーアカウントID
				accountId = `acct_dev_${user.id.substring(0, 16)}`;
				console.log('Development mode: Using dummy Stripe account:', accountId);
			} else {
				// 本番モード：実際のStripe Connectアカウント作成
				try {
					const account = await stripe.accounts.create({
						type: 'express',
						country: 'JP',
						email: profile.email || user.email,
						capabilities: {
							card_payments: { requested: true },
							transfers: { requested: true }
						},
						business_type: 'individual',
						metadata: {
							user_id: user.id
						}
					});
					accountId = account.id;
					accountStatus = 'pending';
				} catch (stripeError: any) {
					console.error('Stripe account creation error:', stripeError);
					return json({
						error: 'Stripe Connectが有効になっていません。開発モードで続行します。',
						development: true
					}, { status: 400 });
				}
			}

			// データベースに保存
			const { error: updateError } = await supabase
				.from('profiles')
				.update({
					stripe_account_id: accountId,
					stripe_account_status: accountStatus,
					stripe_onboarding_completed: isDevelopment // 開発モードでは即座に完了
				})
				.eq('id', user.id);

			if (updateError) {
				console.error('Database update error:', updateError);
				return json({ error: 'Failed to save account' }, { status: 500 });
			}
		}

		// 開発モードでは直接リターンページへ
		if (isDevelopment) {
			const baseUrl = url.origin;
			const username = profile.display_name || 'instructor';
			return json({
				url: `${baseUrl}/api/stripe/connect/return`,
				accountId,
				development: true
			});
		}

		// 本番モード：Account Linkを作成（オンボーディング用）
		const baseUrl = url.origin;
		const accountLink = await stripe.accountLinks.create({
			account: accountId,
			refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
			return_url: `${baseUrl}/api/stripe/connect/return`,
			type: 'account_onboarding'
		});

		return json({
			url: accountLink.url,
			accountId
		});

	} catch (error) {
		console.error('Stripe Connect account creation error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
