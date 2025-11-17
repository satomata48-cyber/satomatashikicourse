import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST: ファイル（PDF、ドキュメント、画像など）をR2にアップロード
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
		const lessonId = formData.get('lessonId') as string;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// ファイルタイプチェック（許可されたタイプのみ）
		const allowedTypes = [
			// Documents
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint',
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'text/plain',
			'text/csv',
			// Images
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/gif',
			'image/webp',
			'image/svg+xml',
			// Archives
			'application/zip',
			'application/x-zip-compressed',
			'application/x-rar-compressed',
			// Code files
			'text/html',
			'text/css',
			'text/javascript',
			'application/json',
			'application/xml'
		];

		if (!allowedTypes.includes(file.type)) {
			return json(
				{
					error: `ファイルタイプ「${file.type}」はサポートされていません。許可されているタイプ: PDF, Word, Excel, PowerPoint, 画像, ZIP, テキストファイルなど`
				},
				{ status: 400 }
			);
		}

		// ファイルサイズチェック (50MB)
		const maxSize = 50 * 1024 * 1024;
		if (file.size > maxSize) {
			return json({ error: 'ファイルサイズが大きすぎます。最大50MBまでです。' }, { status: 400 });
		}

		// ファイル名を生成（lesson ID + タイムスタンプ + 元のファイル名）
		const timestamp = Date.now();
		const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
		const key = `lesson-attachments/${lessonId || 'temp'}/${timestamp}-${sanitizedFilename}`;

		// R2にアップロード
		const arrayBuffer = await file.arrayBuffer();
		await bucket.put(key, arrayBuffer, {
			httpMetadata: {
				contentType: file.type
			}
		});

		// 公開URLを生成
		const url = `https://pub-satomatashikicourse.r2.dev/${key}`;

		return json({
			success: true,
			url,
			key,
			name: file.name,
			size: file.size,
			type: file.type
		});
	} catch (error) {
		console.error('File upload error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
