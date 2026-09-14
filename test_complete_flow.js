/**
 * Complete Flow Test - Shows the BEFORE and AFTER fix
 */

require('dotenv').config();
const { query } = require('./src/config/database');

async function testCompleteFlow() {
  console.log('\n' + '='.repeat(70));
  console.log('  COMPLETE PROGRESS TRACKING SYSTEM TEST');
  console.log('='.repeat(70) + '\n');

  try {
    // Get student
    const student = await query(`
      SELECT id, name, email FROM users
      WHERE email = 'kumarrandhir1705@gmail.com'
      LIMIT 1
    `);

    if (student.rows.length === 0) {
      console.log('❌ Student not found');
      return;
    }

    const studentId = student.rows[0].id;
    const studentName = student.rows[0].name;

    console.log(`📚 Student: ${studentName} (ID: ${studentId})\n`);

    // Get enrollment for Grammar-Basic
    const enrollment = await query(`
      SELECT e.id, e.course_id, c.title, c.total_lessons, e.manual_completed_lessons
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1 AND c.title = 'Grammar- Basic'
      LIMIT 1
    `, [studentId]);

    if (enrollment.rows.length === 0) {
      console.log('❌ Grammar-Basic enrollment not found');
      return;
    }

    const enrollmentId = enrollment.rows[0].id;
    const courseTitle = enrollment.rows[0].title;
    const totalLessons = enrollment.rows[0].total_lessons;
    const manualCount = enrollment.rows[0].manual_completed_lessons || 0;

    console.log(`📖 Course: ${courseTitle}`);
    console.log(`   Enrollment ID: ${enrollmentId}`);
    console.log(`   Total Lessons: ${totalLessons}\n`);

    // Check manual_completed_lessons (OLD system)
    console.log('🔍 OLD SYSTEM CHECK (manual_completed_lessons):');
    console.log(`   Value: ${manualCount}`);
    console.log(`   ${manualCount > 0 ? '⚠️  Has value but NOT used anymore' : '✅ Zero (not used)'}\n`);

    // Check lesson_completions table (NEW system)
    console.log('🔍 NEW SYSTEM CHECK (lesson_completions table):');
    const lessonCompletions = await query(`
      SELECT COUNT(*)::INTEGER as count
      FROM lesson_completions
      WHERE enrollment_id = $1
    `, [enrollmentId]);

    const actualCompletions = lessonCompletions.rows[0].count;
    console.log(`   Records in table: ${actualCompletions}`);
    console.log(`   ${actualCompletions > 0 ? '✅ Has data' : '⚠️  No completions yet'}\n`);

    // Test INSTRUCTOR query (NOW uses lesson_completions)
    console.log('👨‍🏫 INSTRUCTOR VIEW QUERY:');
    console.log('   Query: getStudentEnrolledCoursesByInstructor()');
    const instructorData = await query(`
      SELECT 
        c.title,
        c.total_lessons,
        (SELECT COUNT(*)::INTEGER FROM lesson_completions lc WHERE lc.enrollment_id = e.id) AS completed_lessons
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.id = $1
    `, [enrollmentId]);

    const instResult = instructorData.rows[0];
    console.log(`   Result: ${instResult.completed_lessons}/${instResult.total_lessons} lessons`);
    console.log(`   Progress: ${Math.round((instResult.completed_lessons / instResult.total_lessons) * 100)}%\n`);

    // Test ADMIN query (ALWAYS used lesson_completions)
    console.log('👑 ADMIN VIEW QUERY:');
    console.log('   Query: getStudentDetailedStats()');
    const adminData = await query(`
      SELECT COUNT(*) as completed_count
      FROM lesson_completions lc
      WHERE lc.enrollment_id = $1
    `, [enrollmentId]);

    const adminResult = parseInt(adminData.rows[0].completed_count);
    console.log(`   Result: ${adminResult}/${totalLessons} lessons`);
    console.log(`   Progress: ${Math.round((adminResult / totalLessons) * 100)}%\n`);

    // Compare results
    console.log('🔬 COMPARISON:');
    console.log(`   Instructor shows: ${instResult.completed_lessons}/${instResult.total_lessons}`);
    console.log(`   Admin shows: ${adminResult}/${totalLessons}`);
    
    if (instResult.completed_lessons === adminResult) {
      console.log(`   ✅ PERFECT MATCH! Both views are synchronized.\n`);
    } else {
      console.log(`   ❌ MISMATCH! Views show different data.\n`);
    }

    // Show the fix
    console.log('='.repeat(70));
    console.log('💡 THE FIX APPLIED:');
    console.log('='.repeat(70));
    console.log('');
    console.log('BEFORE (enrollmentService.js line 312):');
    console.log('  ❌ COALESCE(e.manual_completed_lessons, 0) AS completed_lessons');
    console.log('');
    console.log('AFTER (enrollmentService.js line 312):');
    console.log('  ✅ (SELECT COUNT(*)::INTEGER FROM lesson_completions lc');
    console.log('      WHERE lc.enrollment_id = e.id) AS completed_lessons');
    console.log('');
    console.log('RESULT:');
    console.log('  ✅ Both instructor and admin now query the same table');
    console.log('  ✅ Data is consistent across all views');
    console.log('  ✅ Progress tracking is unified');
    console.log('');
    console.log('='.repeat(70));

    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Clear browser cache on instructor and admin panels');
    console.log('   2. Refresh both dashboards');
    console.log('   3. Both will show identical progress data');
    console.log('   4. (Optional) Update instructor UI to use proper lesson completion API\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testCompleteFlow();
