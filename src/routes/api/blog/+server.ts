import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InstructorManager, SpaceManager, BlogManager, getD1, generateUUID } from '$lib/server/d1-db';

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		const username = url.searchParams.get('username');
		const spaceSlug = url.searchParams.get('space_slug');
		const spaceId = url.searchParams.get('space_id');
		const postId = url.searchParams.get('id');
		const postSlug = url.searchParams.get('slug');
		const includeUnpublished = url.searchParams.get('include_unpublished') === 'true';

		const db = await getD1(platform);

		// 記事IDが指定されている場合は単一記事取得
		if (postId) {
			const post = await BlogManager.getPostById(db, postId);
			if (!post) {
				return json({ error: 'Post not found' }, { status: 404 });
			}
			return json({ post });
		}

		// スペース特定
		let space;
		if (spaceId) {
			space = await SpaceManager.getSpaceById(db, spaceId);
		} else if (spaceSlug && username) {
			const user = await InstructorManager.getInstructorByUsername(db, username);
			if (!user) {
				return json({ error: 'User not found' }, { status: 404 });
			}
			space = await SpaceManager.getSpaceBySlug(db, user.id as string, spaceSlug);
		}

		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// 記事slugが指定されている場合は単一記事取得
		if (postSlug) {
			const post = await BlogManager.getPostBySlug(db, space.id as string, postSlug);
			if (!post) {
				return json({ error: 'Post not found' }, { status: 404 });
			}
			// 未公開記事は管理者のみ
			if (!post.is_published && !includeUnpublished) {
				return json({ error: 'Post not found' }, { status: 404 });
			}
			return json({ post, space });
		}

		// 記事一覧取得
		const posts = await BlogManager.getPostsBySpaceId(db, space.id as string, includeUnpublished);
		return json({ posts, space });
	} catch (error) {
		console.error('Get blog posts error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { space_id, title, slug, content, is_published } = await request.json();

		if (!space_id || !title || !slug) {
			return json({ error: 'Space ID, title and slug are required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// スペースの所有者確認
		const space = await SpaceManager.getSpaceById(db, space_id);

		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		if (space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// スラッグの重複チェック
		const existingPost = await BlogManager.getPostBySlug(db, space_id, slug);
		if (existingPost) {
			return json({ error: 'Slug already exists in this space' }, { status: 400 });
		}

		// 記事作成
		const newPost = await BlogManager.createPost(db, {
			id: generateUUID(),
			space_id,
			title,
			slug,
			content,
			is_published: is_published || false
		});

		return json({ post: newPost });
	} catch (error) {
		console.error('Create blog post error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id, ...updates } = await request.json();

		if (!id) {
			return json({ error: 'Post ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// 記事の所有者確認
		const post = await BlogManager.getPostById(db, id);

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		const space = await SpaceManager.getSpaceById(db, post.space_id as string);

		if (!space || space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// スラッグ変更時の重複チェック
		if (updates.slug && updates.slug !== post.slug) {
			const existingPost = await BlogManager.getPostBySlug(db, post.space_id as string, updates.slug);
			if (existingPost) {
				return json({ error: 'Slug already exists in this space' }, { status: 400 });
			}
		}

		// 記事更新
		const updatedPost = await BlogManager.updatePost(db, id, updates);

		return json({ post: updatedPost });
	} catch (error) {
		console.error('Update blog post error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const postId = url.searchParams.get('id');

		if (!postId) {
			return json({ error: 'Post ID is required' }, { status: 400 });
		}

		const db = await getD1(platform);

		// 記事の所有者確認
		const post = await BlogManager.getPostById(db, postId);

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		const space = await SpaceManager.getSpaceById(db, post.space_id as string);

		if (!space || space.instructor_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// 記事削除
		await BlogManager.deletePost(db, postId);

		return json({ success: true });
	} catch (error) {
		console.error('Delete blog post error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
