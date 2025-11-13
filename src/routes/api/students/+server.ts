import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SpaceStudentManager, StudentManager, getD1 } from '$lib/server/d1-db';

/**
 * GET: スペースの生徒一覧を取得
 */
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const spaceId = url.searchParams.get('spaceId');

		if (!spaceId) {
			return json({ error: 'Space ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// 生徒一覧を取得
		const students = await SpaceStudentManager.getSpaceStudents(db, spaceId);

		return json({ students });
	} catch (error) {
		console.error('Get students error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * POST: スペースに生徒を追加
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { spaceId, email } = await request.json();

		if (!spaceId || !email) {
			return json({ error: 'Space ID and email are required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// メールアドレスから生徒を検索（studentsテーブルから最初に見つかった生徒）
		const result = await db
			.prepare('SELECT * FROM students WHERE email = ? LIMIT 1')
			.bind(email)
			.first();

		if (!result) {
			return json({
				error: 'このメールアドレスの生徒は登録されていません。生徒に登録リンクを送信してください。'
			}, { status: 404 });
		}

		const student = result;

		// すでに登録済みかチェック
		const isAlreadyEnrolled = await SpaceStudentManager.isStudentInSpace(
			db,
			spaceId,
			student.id as string
		);

		if (isAlreadyEnrolled) {
			return json({ error: 'この生徒は既にこのスペースに登録されています' }, { status: 400 });
		}

		// 生徒を追加
		const enrollment = await SpaceStudentManager.addStudentToSpace(
			db,
			spaceId,
			student.id as string
		);

		return json({ enrollment, student });
	} catch (error) {
		console.error('Add student error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * PUT: 生徒のステータスを更新
 */
export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { studentRecordId, status } = await request.json();

		if (!studentRecordId || !status) {
			return json({ error: 'Student record ID and status are required' }, { status: 400 });
		}

		// ステータスのバリデーション
		const validStatuses = ['active', 'inactive', 'suspended', 'completed'];
		if (!validStatuses.includes(status)) {
			return json({ error: 'Invalid status' }, { status: 400 });
		}

		const db = await getD1(platform);

		// ステータス更新
		await SpaceStudentManager.updateStudentStatus(db, studentRecordId, status);

		return json({ success: true });
	} catch (error) {
		console.error('Update student status error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * DELETE: スペースから生徒を削除
 */
export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const studentRecordId = url.searchParams.get('studentRecordId');

		if (!studentRecordId) {
			return json({ error: 'Student record ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// 生徒を削除
		await SpaceStudentManager.removeStudentFromSpace(db, studentRecordId);

		return json({ success: true });
	} catch (error) {
		console.error('Remove student error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
