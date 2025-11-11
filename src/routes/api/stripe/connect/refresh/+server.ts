import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// TODO: D1実装が必要 - locals から認証情報を取得
		const user = locals.user;

		if (!user) {
			throw redirect(302, '/login?error=authentication_required');
		}

		// TODO: D1実装が必要 - プロフィールを取得
		const profile = {
			username: 'stub-user'
		};

		// リフレッシュが必要な場合は決済設定ページに戻す
		const errorMessage = 'オンボーディングを完了できませんでした。もう一度お試しください。';
		throw redirect(302, `/${profile?.username || 'dashboard'}/payment-settings?error=${encodeURIComponent(errorMessage)}`);

	} catch (error) {
		if (error instanceof Response) {
			throw error;
		}
		console.error('Refresh handler error:', error);
		throw redirect(302, '/dashboard/payment-settings?error=unknown_error');
	}
};
