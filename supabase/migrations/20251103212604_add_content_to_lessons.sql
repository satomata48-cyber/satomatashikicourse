-- Add content column to lessons table for text-only lessons
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS content TEXT;

COMMENT ON COLUMN lessons.content IS 'Text content for text-only lessons. Optional if video is provided.';
