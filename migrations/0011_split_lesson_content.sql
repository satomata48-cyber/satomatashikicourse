-- Split lesson content into before and after video sections

-- Add new columns
ALTER TABLE lessons ADD COLUMN content_before TEXT;
ALTER TABLE lessons ADD COLUMN content_after TEXT;

-- Migrate existing content to content_before
UPDATE lessons SET content_before = content WHERE content IS NOT NULL;

-- Set content_after to empty string for existing records
UPDATE lessons SET content_after = '' WHERE content_after IS NULL;

-- Drop old content column
-- Note: SQLite doesn't support DROP COLUMN directly, so we'll keep it for now
-- and mark it as deprecated in application code
