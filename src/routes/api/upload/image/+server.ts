import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST: 画像をR2にアップロード
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		// 認証チェック
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Content-Typeチェック
		const contentType = request.headers.get('content-type');
		if (!contentType || !contentType.includes('multipart/form-data')) {
			return json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
		}

		// R2バケットの取得
		const bucket = platform?.env?.MEDIA_BUCKET;
		if (!bucket) {
			console.error('R2 bucket not available');
			return json({ error: 'Storage not configured' }, { status: 500 });
		}

		// フォームデータの取得
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// ファイルタイプチェック
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			return json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
		}

		// ファイルサイズチェック (5MB)
		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			return json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
		}

		// ファイル名を生成（ユーザーID + タイムスタンプ + 元のファイル名）
		const timestamp = Date.now();
		const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
		const key = `avatars/${locals.user.id}/${timestamp}-${sanitizedFilename}`;

		// R2にアップロード
		const arrayBuffer = await file.arrayBuffer();
		await bucket.put(key, arrayBuffer, {
			httpMetadata: {
				contentType: file.type
			}
		});

		// 公開URLを生成（CloudflareのR2 custom domainまたはR2.dev subdomain）
		// 本番環境では独自ドメインを設定することを推奨
		const url = `https://pub-${platform?.env?.R2_PUBLIC_BUCKET_ID || 'satomatashikicourse'}.r2.dev/${key}`;

		return json({
			success: true,
			url,
			key
		});
	} catch (error) {
		console.error('Image upload error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
