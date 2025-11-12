# Database Schema - Separated Instructors and Students

## Overview
This database separates **instructors** (content creators) and **students** (course enrollees) into completely different tables with separate authentication systems.

## Core Tables

### 1. instructors
**Purpose**: Content creators who own spaces and courses

```sql
CREATE TABLE instructors (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  social_links TEXT,
  -- Stripe Connect
  stripe_account_id TEXT,
  stripe_account_status TEXT DEFAULT 'pending',
  stripe_onboarding_completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 2. students
**Purpose**: Course enrollees (can have same email across different spaces)

```sql
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,  -- NOT UNIQUE - same person can register in multiple spaces
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 3. instructor_sessions
**Purpose**: Authentication sessions for instructors

```sql
CREATE TABLE instructor_sessions (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
);
```

### 4. student_sessions
**Purpose**: Authentication sessions for students

```sql
CREATE TABLE student_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
```

## Content Tables

### 5. spaces
**Purpose**: Instructor's learning spaces

```sql
CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,  -- References instructors.id
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  max_students INTEGER,
  is_active INTEGER DEFAULT 1,
  landing_page_content TEXT,  -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instructor_id, slug),
  FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
);
```

### 6. courses
**Purpose**: Courses within spaces

```sql
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT,
  price REAL DEFAULT 0,
  currency TEXT DEFAULT 'JPY',
  is_free INTEGER DEFAULT 1,
  is_published INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  course_page_content TEXT,  -- JSON
  -- Stripe
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  stripe_payment_link TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);
```

### 7. lessons
**Purpose**: Individual lessons within courses

```sql
CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  video_type TEXT,  -- 'youtube', 'external'
  duration INTEGER,
  order_index INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
```

## Enrollment & Progress Tables

### 8. space_students
**Purpose**: Links students to spaces

```sql
CREATE TABLE space_students (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  student_id TEXT NOT NULL,  -- References students.id
  status TEXT DEFAULT 'active',  -- 'active', 'inactive', 'suspended', 'completed'
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(space_id, student_id),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
```

### 9. course_purchases
**Purpose**: Course purchase records

```sql
CREATE TABLE course_purchases (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,  -- References students.id
  amount REAL,
  currency TEXT DEFAULT 'JPY',
  status TEXT DEFAULT 'pending',  -- 'pending', 'completed', 'failed', 'refunded'
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, student_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
```

### 10. lesson_completions
**Purpose**: Track lesson completion progress

```sql
CREATE TABLE lesson_completions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  student_id TEXT NOT NULL,  -- References students.id
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lesson_id, student_id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
```

## Key Differences from Old Schema

### Separated Authentication:
- **Instructors**:
  - Table: `instructors`
  - Sessions: `instructor_sessions`
  - Login: `/api/auth/instructor/login`
  - Unique email required

- **Students**:
  - Table: `students`
  - Sessions: `student_sessions`
  - Login: `/api/auth/student/login`
  - Same email can register in multiple spaces

### Benefits:
1. ✅ Clear separation of roles
2. ✅ No role confusion
3. ✅ Students can use same email across spaces
4. ✅ Simpler permission checks
5. ✅ Independent scaling

### Migration Path:
1. Run migration: `0004_separate_instructors_students.sql`
2. Data is automatically migrated from `profiles` → `instructors` / `students`
3. Sessions are split into `instructor_sessions` / `student_sessions`
4. Old tables (`profiles`, `sessions`) can be dropped after verification
