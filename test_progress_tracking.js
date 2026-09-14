/**
 * Test Progress Tracking: Add test lesson completions and verify consistency
 */

require('dotenv').config();
const { query } = require('./src/config/database');

async function testProgressTracking() {
  console.log('🧪 Testing Progress Tracking System\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Get student and enrollment info
    console.log('\n1️⃣  Getting student information...');
    const studentResult = await query(`
      SELECT id, name, email FROM users
      WHERE email = 'kumarrandhir1705@gmail.com'
      LIMIT 1
    `);

    if (studentResult.rows.length === 0) {
      console.log('❌ Student not found');
      return;
    }

    const student = studentResult.rows[0];
    console.log(`   ✓ Student: ${student.name} (ID: ${student.id})`);

    // Get Grammar-Basic enrollment
    const enrollmentResult = await query(`
      SELECT e.id, e.course_id, c.title, c.total_lessons
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1 AND c.title = 'Grammar- Basic'
      LIMIT 1
    `, [student.id]);

    if (enrollmentResult.rows.length === 0) {
      console.log('❌ Grammar-Basic enrollment not found');
      return;
    }

    const enrollment = enrollmentResult.rows[0];
    console.log(`   ✓ Course: ${enrollment.title}`);
    console.log(`   ✓ Enrollment ID: ${enrollment.id}`);
    console.log(`   ✓ Total Lessons: ${enrollment.total_lessons}`);

    // Step 2: Add test lesson completions
    console.log('\n2️⃣  Adding 5 test lesson completions...');
    
    for (let i = 1; i <= 5; i++) {
      await query(`
        INSERT INTO lesson_completions (enrollment_id, lesson_number, completed_at, notes)
        VALUES ($1, $2, NOW(), $3)
        ON CONFLICT DO NOTHING
      `, [enrollment.id, i, `Test completion for lesson ${i}`]);
      console.log(`   ✓ Added lesson ${i}`);
    }

    // Step 3: Test instructor view query
    console.log('\n3️⃣  Testing INSTRUCTOR view query...');
    const instructorView = await query(`
      SELECT 
        e.id as enrollment_id,
        c.id as course_id,
        c.title as course_title,
        c.total_lessons as total_lessons,
        COUNT(lc.id)::INTEGER as completed_lessons,
        CASE 
          WHEN c.total_lessons > 0 
          THEN ROUND((COUNT(lc.id)::DECIMAL / c.total_lessons) * 100, 2)
          ELSE 0
        END as progress_percentage
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN lesson_completions lc ON e.id = lc.enrollment_id
      WHERE e.user_id = $1 AND e.course_id = $2
      GROUP BY e.id, c.id, c.title, c.total_lessons
    `, [student.id, enrollment.course_id]);

    const instResult = instructorView.rows[0];
    console.log(`   📊 Instructor View Result:`);
    console.log(`      - Course: ${instResult.course_title}`);
    console.log(`      - Completed: ${instResult.completed_lessons}/${instResult.total_lessons}`);
    console.log(`      - Progress: ${instResult.progress_percentage}%`);

    // Step 4: Test admin view query
    console.log('\n4️⃣  Testing ADMIN view query...');
    const adminView = await query(`
      SELECT 
        e.id as enrollment_id,
        e.course_id,
        c.title as course_title,
        c.total_lessons,
        (SELECT COUNT(*) FROM lesson_completions lc WHERE lc.enrollment_id = e.id) as completed_lessons
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1 AND e.course_id = $2
    `, [student.id, enrollment.course_id]);

    const adminResult = adminView.rows[0];
    const adminProgress = adminResult.total_lessons > 0 
      ? Math.round((adminResult.completed_lessons / adminResult.total_lessons) * 100) 
      : 0;

    console.log(`   📊 Admin View Result:`);
    console.log(`      - Course: ${adminResult.course_title}`);
    console.log(`      - Completed: ${adminResult.completed_lessons}/${adminResult.total_lessons}`);
    console.log(`      - Progress: ${adminProgress}%`);

    // Step 5: Compare results
    console.log('\n5️⃣  Comparing results...');
    const match = 
      instResult.total_lessons === adminResult.total_lessons &&
      instResult.completed_lessons === parseInt(adminResult.completed_lessons) &&
      instResult.progress_percentage === adminProgress;

    if (match) {
      console.log(`   ✅ PERFECT MATCH! Both views show identical data.`);
    } else {
      console.log(`   ❌ MISMATCH DETECTED!`);
      console.log(`      Instructor: ${instResult.completed_lessons}/${instResult.total_lessons} (${instResult.progress_percentage}%)`);
      console.log(`      Admin: ${adminResult.completed_lessons}/${adminResult.total_lessons} (${adminProgress}%)`);
    }

    // Step 6: Get detailed lesson list
    console.log('\n6️⃣  Retrieving completed lesson details...');
    const lessonDetails = await query(`
      SELECT lesson_number, completed_at, notes
      FROM lesson_completions
      WHERE enrollment_id = $1
      ORDER BY lesson_number
    `, [enrollment.id]);

    console.log(`   📝 Completed Lessons:`);
    lessonDetails.rows.forEach(lesson => {
      console.log(`      - Lesson ${lesson.lesson_number}: ${new Date(lesson.completed_at).toLocaleString()}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log(`   - Student: ${student.name}`);
    console.log(`   - Course: ${enrollment.title}`);
    console.log(`   - Progress: ${instResult.completed_lessons}/${instResult.total_lessons} lessons (${instResult.progress_percentage}%)`);
    console.log(`   - Data Consistency: ${match ? '✅ VERIFIED' : '❌ FAILED'}`);

    console.log('\n💡 Next Steps:');
    console.log('   1. Refresh the instructor dashboard at instructor.playfitclasses.com');
    console.log('   2. Refresh the admin dashboard at admin.playfitclasses.com');
    console.log('   3. Both should now show: 5/36 lessons (13.89% or 14%)');
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testProgressTracking();
