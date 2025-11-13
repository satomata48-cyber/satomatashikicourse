-- Migration: Fix space_students foreign key to reference students table instead of profiles

-- SQLiteでは外部キー制約を直接変更できないため、テーブルを再作成する必要があります

-- 1. 既存データをバックアップ
CREATE TABLE IF NOT EXISTS space_students_backup AS SELECT * FROM space_students;

-- 2. 既存のテーブルを削除
DROP TABLE IF EXISTS space_students;

-- 3. 正しい外部キー制約で新しいテーブルを作成
CREATE TABLE space_students (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(space_id, student_id)
);

-- 4. バックアップからデータを復元（studentsテーブルに存在するもののみ）
INSERT INTO space_students (id, space_id, student_id, status, enrolled_at)
SELECT ss.id, ss.space_id, ss.student_id, ss.status, ss.enrolled_at
FROM space_students_backup ss
WHERE EXISTS (SELECT 1 FROM students s WHERE s.id = ss.student_id);

-- 5. バックアップテーブルを削除
DROP TABLE space_students_backup;

-- 6. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_space_students_space ON space_students(space_id);
CREATE INDEX IF NOT EXISTS idx_space_students_student ON space_students(student_id);
