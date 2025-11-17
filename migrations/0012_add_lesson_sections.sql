-- Add sections column to lessons table for flexible content structure

-- Add sections column to store JSON array of content sections
ALTER TABLE lessons ADD COLUMN sections TEXT;

-- Note: Existing lessons will have NULL sections
-- The application will handle backward compatibility by converting
-- content_before, video, content_after, and attachments to sections format
