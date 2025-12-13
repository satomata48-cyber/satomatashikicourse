-- ブログ記事テーブル
CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT,
    is_published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT,
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
    UNIQUE(space_id, slug)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_blog_posts_space_id ON blog_posts(space_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(space_id, slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at);
