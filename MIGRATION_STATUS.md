# Database Migration Status - Instructor/Student Separation

## ✅ Completed (2025-11-12)

### 1. Database Migration
- **Local D1 Migration**: Successfully applied `migrations/0004_separate_instructors_students.sql`
- **Data Migrated**: 1 instructor + 4 instructor sessions
- **New Tables Created**:
  - `instructors` - Separate table for instructors (unique email required)
  - `students` - Separate table for students (email NOT unique - can register in multiple spaces)
  - `instructor_sessions` - Instructor authentication sessions
  - `student_sessions` - Student authentication sessions
- **Old Tables Preserved**: `profiles` and `sessions` tables kept for safety

### 2. Code Updates

#### Database Manager Classes (`src/lib/server/d1-db.ts`)
- ✅ Added `InstructorSessionManager` - Manages instructor authentication sessions
- ✅ Added `StudentSessionManager` - Manages student authentication sessions
- ✅ Added `InstructorManager` - CRUD operations for instructors
- ✅ Added `StudentManager` - CRUD operations for students
- ✅ Updated `SpaceStudentManager.getSpaceStudents()` - Now uses `students` table instead of `profiles`
- ✅ Kept `ProfileManager` and `SessionManager` for backward compatibility (deprecated)

#### Authentication System (`src/hooks.server.ts`)
- ✅ Updated to check both `instructor_sessions` and `student_sessions` tables
- ✅ Sets `userType` property ('instructor' | 'student') to distinguish user types
- ✅ Loads correct user data from `instructors` or `students` table

#### Login Endpoint (`src/routes/api/auth/login/+server.ts`)
- ✅ Updated to use `InstructorManager.getInstructorByEmail()`
- ✅ Creates sessions using `InstructorSessionManager.createSession()`
- ✅ Returns `userType: 'instructor'` in response

## ⚠️ TODO - Remaining Work

### High Priority
1. **Update Registration Endpoint** (`src/routes/api/auth/register/+server.ts`)
   - Currently uses old `ProfileManager`
   - Should use `InstructorManager.createInstructor()`
   - Should create `instructor_sessions`

2. **Create Student Authentication Endpoints**
   - `/api/auth/student/register` - Student registration (requires space context)
   - `/api/auth/student/login` - Student login (requires space context)
   - Students register per-space, not globally

3. **Update API Endpoints** - The following endpoints still use `ProfileManager`:
   - `/api/profile/+server.ts` - Profile update endpoint
   - `/api/students/+server.ts` - Student management endpoint
   - `/api/spaces/+server.ts` - Space management (may use ProfileManager)
   - `/api/courses/+server.ts` - Course management (may use ProfileManager)

4. **Apply Remote D1 Migration**
   - Run migration on production Cloudflare D1 database
   - Requires authentication with correct Cloudflare account
   - Command: `npx wrangler d1 execute satomatashiki-course-db --remote --file=migrations/0004_separate_instructors_students.sql`

### Medium Priority
5. **Update Frontend Components**
   - Check all components that reference `user.role` - should use `user.userType` instead
   - Update student-facing pages to use student authentication flow

6. **Drop Old Tables** (AFTER verification)
   - `DROP TABLE profiles` - Only after confirming all references updated
   - `DROP TABLE sessions` - Only after confirming all references updated

## 📊 Migration Verification

### Local Database Status
```sql
-- Instructors migrated
SELECT COUNT(*) FROM instructors;  -- Result: 1

-- Students migrated
SELECT COUNT(*) FROM students;  -- Result: 0

-- Instructor sessions migrated
SELECT COUNT(*) FROM instructor_sessions;  -- Result: 4

-- Student sessions migrated
SELECT COUNT(*) FROM student_sessions;  -- Result: 0

-- Instructor data
SELECT email, username FROM instructors;
-- Result: satomata48@gmail.com, satomatashiki
```

## 🔄 Backward Compatibility

The migration maintains backward compatibility by:
- Keeping old `ProfileManager` and `SessionManager` classes (marked as deprecated)
- Preserving old `profiles` and `sessions` tables
- Existing code that uses old managers will continue to work
- New code should use `InstructorManager`/`StudentManager`

## 📝 Key Architectural Changes

### Before
```
profiles (id, email, password_hash, role: 'instructor' | 'student')
└── sessions (id, user_id, token)
```

### After
```
instructors (id, email UNIQUE, password_hash, username UNIQUE)
└── instructor_sessions (id, instructor_id, token)

students (id, email, password_hash)  -- email NOT unique
└── student_sessions (id, student_id, token)
```

### Benefits
1. ✅ Clear separation of instructor and student concerns
2. ✅ Students can use same email across different spaces
3. ✅ Instructors have unique email requirement (for account recovery)
4. ✅ No role confusion - type is determined by table
5. ✅ Better security - separate session tables
6. ✅ Simpler permission checks

## 🚀 Next Steps

1. Update `/api/auth/register` to use `InstructorManager`
2. Create student registration flow for space enrollment
3. Update remaining API endpoints to use new managers
4. Test full authentication flow for both instructors and students
5. Apply migration to remote Cloudflare D1 (when account access available)
6. Remove old `ProfileManager`/`SessionManager` code after full migration
