import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST: 動画をR2にアップロード
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
		const courseId = formData.get('courseId') as string;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// ファイルタイプチェック（動画のみ）
		const allowedTypes = [
			'video/mp4',
			'video/webm',
			'video/ogg',
			'video/quicktime', // .mov
			'video/x-msvideo', // .avi
			'video/x-matroska' // .mkv
		];

		if (!allowedTypes.includes(file.type)) {
			return json(
				{
					error: `ファイルタイプ「${file.type}」はサポートされていません。許可されている形式: MP4, WebM, OGG, MOV, AVI, MKV`
				},
				{ status: 400 }
			);
		}

		// ファイルサイズチェック (500MB - Cloudflare Pagesの制限)
		const maxSize = 500 * 1024 * 1024;
		if (file.size > maxSize) {
			return json({ error: 'ファイルサイズが大きすぎます。最大500MBまでです。' }, { status: 400 });
		}

		// ファイル名を生成
		const timestamp = Date.now();
		const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
		const key = `videos/${locals.user.id}/${courseId || 'general'}/${timestamp}-${sanitizedFilename}`;

		// R2にアップロード
		const arrayBuffer = await file.arrayBuffer();
		await bucket.put(key, arrayBuffer, {
			httpMetadata: {
				contentType: file.type
			},
			customMetadata: {
				originalName: file.name,
				uploadedBy: locals.user.id,
				courseId: courseId || '',
				uploadedAt: new Date().toISOString()
			}
		});

		// 公開URLを生成
		const url = `https://pub-bde867b9de4420c93bdc797d254ea437.r2.dev/${key}`;

		return json({
			success: true,
			url,
			key,
			name: file.name,
			size: file.size,
			type: file.type
		});
	} catch (error) {
		console.error('Video upload error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * GET: R2に保存された動画一覧を取得
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	try {
		// 認証チェック
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// R2バケットの取得
		const bucket = platform?.env?.MEDIA_BUCKET;
		if (!bucket) {
			console.error('R2 bucket not available');
			return json({ error: 'Storage not configured' }, { status: 500 });
		}

		const courseId = url.searchParams.get('courseId');

		// ユーザーの動画を検索
		const prefix = `videos/${locals.user.id}/`;
		const listed = await bucket.list({ prefix });

		const videos = listed.objects
			.filter(obj => {
				// 動画ファイルのみフィルタ
				const ext = obj.key.split('.').pop()?.toLowerCase();
				return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext || '');
			})
			.filter(obj => {
				// courseIdが指定されている場合はフィルタ
				if (courseId) {
					return obj.key.includes(`/${courseId}/`);
				}
				return true;
			})
			.map(obj => ({
				key: obj.key,
				url: `https://pub-bde867b9de4420c93bdc797d254ea437.r2.dev/${obj.key}`,
				name: obj.key.split('/').pop()?.replace(/^\d+-/, '') || obj.key,
				size: obj.size,
				uploaded: obj.uploaded
			}));

		return json({ videos });
	} catch (error) {
		console.error('Get videos error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * DELETE: R2から動画を削除
 */
export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	try {
		// 認証チェック
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const key = url.searchParams.get('key');
		if (!key) {
			return json({ error: 'Key is required' }, { status: 400 });
		}

		// 自分の動画のみ削除可能
		if (!key.startsWith(`videos/${locals.user.id}/`)) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// R2バケットの取得
		const bucket = platform?.env?.MEDIA_BUCKET;
		if (!bucket) {
			return json({ error: 'Storage not configured' }, { status: 500 });
		}

		await bucket.delete(key);

		return json({ success: true });
	} catch (error) {
		console.error('Delete video error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
