import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/stripe-server';

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const authHeader = request.headers.get('authorization');
		if (!authHeader) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// TODO: D1実装が必要 - ユーザー認証とプロフィール取得
		const token = authHeader.replace('Bearer ', '');

		// スタブ: 仮のプロフィールデータ
		const profile = {
			stripe_account_id: null,
			email: 'stub@example.com',
			display_name: 'Stub User'
		};
		const user = { id: 'stub-user-id' };

		// 簡易実装：ダミーのStripeアカウントIDを設定
		// 本番環境では実際のStripe Connectを使用
		const isDevelopment = process.env.NODE_ENV !== 'production';

		let accountId: string | null = profile.stripe_account_id;
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
						email: profile.email,
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

			// TODO: D1実装が必要 - データベースに保存
			console.log('TODO: Save Stripe account to D1:', { accountId, accountStatus });
		}

		// 開発モードでは直接リターンページへ
		if (isDevelopment) {
			const baseUrl = url.origin;
			return json({
				url: `${baseUrl}/api/stripe/connect/return`,
				accountId,
				development: true
			});
		}

		// 本番モード：Account Linkを作成（オンボーディング用）
		const baseUrl = url.origin;
		const accountLink = await stripe.accountLinks.create({
			account: accountId as string,
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
