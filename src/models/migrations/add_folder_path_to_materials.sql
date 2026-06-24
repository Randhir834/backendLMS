-- Add folder_path column to course_materials table
-- This allows materials to be grouped by their original folder structure

ALTER TABLE course_materials 
ADD COLUMN folder_path TEXT;

-- Add index for folder_path to improve grouping queries
CREATE INDEX idx_course_materials_folder_path ON course_materials(folder_path);

-- Add comment to explain the column
COMMENT ON COLUMN course_materials.folder_path IS 'Original folder path when uploaded (e.g., "Module 1/Lecture Notes")';
