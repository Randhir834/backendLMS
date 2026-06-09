require('dotenv').config();
const { query } = require('../src/config/database');

/**
 * Verification script to ensure the assignment submission fix is working
 */
async function verifyFix() {
  console.log('\n=== Verifying Assignment Submission Fix ===\n');

  try {
    // Test 1: Verify users table structure
    console.log('1. Checking users table structure...');
    const usersColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('avatar_url', 'profile_photo')
    `);
    console.log('Users table columns:', usersColumns.rows);
    
    const hasAvatarUrl = usersColumns.rows.some(col => col.column_name === 'avatar_url');
    const hasProfilePhoto = usersColumns.rows.some(col => col.column_name === 'profile_photo');
    
    if (hasAvatarUrl && !hasProfilePhoto) {
      console.log('✅ Users table has correct column (avatar_url)');
    } else {
      console.log('❌ Users table structure issue!');
      if (!hasAvatarUrl) console.log('  - Missing avatar_url column');
      if (hasProfilePhoto) console.log('  - Unexpected profile_photo column exists');
    }

    // Test 2: Try to fetch assignment assignments (should not error)
    console.log('\n2. Testing getAssignmentAssignments query...');
    const testAssignmentId = 3; // Using the known test assignment
    try {
      const assignmentsResult = await query(
        `SELECT aa.*, u.name, u.email, u.avatar_url as profile_photo,
         (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = aa.assignment_id AND student_id = aa.student_id) as submission_count
         FROM assignment_assignments aa
         JOIN users u ON aa.student_id = u.id
         WHERE aa.assignment_id = $1
         LIMIT 1`,
        [testAssignmentId]
      );
      console.log(`✅ Query executed successfully, returned ${assignmentsResult.rows.length} rows`);
    } catch (err) {
      console.log('❌ Query failed:', err.message);
    }

    // Test 3: Try to fetch submissions (should not error)
    console.log('\n3. Testing findSubmissionsByAssignment query...');
    try {
      const submissionsResult = await query(
        `SELECT s.*, u.name AS student_name, u.email AS student_email, u.avatar_url as profile_photo
         FROM assignment_submissions s 
         JOIN users u ON s.student_id = u.id 
         WHERE s.assignment_id = $1
         LIMIT 1`,
        [testAssignmentId]
      );
      console.log(`✅ Query executed successfully, returned ${submissionsResult.rows.length} rows`);
    } catch (err) {
      console.log('❌ Query failed:', err.message);
    }

    // Test 4: Try to fetch quiz assignments (should not error)
    console.log('\n4. Testing getQuizAssignments query...');
    try {
      const quizResult = await query(
        `SELECT qa.*, u.name, u.email, u.avatar_url as profile_photo
         FROM quiz_assignments qa
         JOIN users u ON qa.student_id = u.id
         LIMIT 1`
      );
      console.log(`✅ Query executed successfully, returned ${quizResult.rows.length} rows`);
    } catch (err) {
      console.log('❌ Query failed:', err.message);
    }

    // Test 5: Check assignments with data
    console.log('\n5. Checking assignments with actual data...');
    const assignmentsWithData = await query(`
      SELECT 
        a.id,
        a.title,
        (SELECT COUNT(*) FROM assignment_assignments WHERE assignment_id = a.id) as total_assigned,
        (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as total_submitted
      FROM assignments a
      WHERE EXISTS (
        SELECT 1 FROM assignment_assignments WHERE assignment_id = a.id
      )
      LIMIT 5
    `);
    
    if (assignmentsWithData.rows.length > 0) {
      console.log('Found assignments with data:');
      console.table(assignmentsWithData.rows);
    } else {
      console.log('⚠️  No assignments with assigned students found');
    }

    console.log('\n=== Verification Complete ===\n');
    console.log('If all tests passed (✅), the fix is working correctly.');
    console.log('If any tests failed (❌), review the error messages above.');
    
  } catch (err) {
    console.error('Verification failed with error:', err);
  }

  process.exit(0);
}

verifyFix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
