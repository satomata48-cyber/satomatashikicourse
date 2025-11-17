-- Migration: Add attachments field to lessons table

ALTER TABLE lessons ADD COLUMN attachments TEXT;
-- attachments will store JSON array of file objects:
-- [{"id": "uuid", "name": "filename.pdf", "url": "https://...", "size": 12345, "type": "application/pdf"}]
