/**
 * Verification Script: Student Progress Data Sync
 * This script verifies that the progress data is consistent between instructor and admin views
 */

require('dotenv').config();
const { query } = require('./src/config/database');

async function verifyProgressSync() {
  console.log('🔍 Starting Progress Sync Verification...\n');

  try {
    // 1. Check if total_lessons column exists and has data
    console.log('1️⃣  Checking courses.total_lessons column...');
    const coursesCheck = await query(`
      SELECT 
        id, 
        title, 
        total_lessons,
        (SELECT COUNT(*) FROM course_materials WHERE course_id = courses.id) as actual_materials_count
      FROM courses 
      ORDER BY id
      LIMIT 10
    `);
    
    console.log(`   ✓ Found ${coursesCheck.rows.length} courses\n`);
    coursesCheck.rows.forEach(course => {
      console.log(`   Course ID ${course.id}: "${course.title}"`);
      console.log(`      - total_lessons: ${course.total_lessons || 0}`);
      console.log(`      - actual materials: ${course.actual_materials_count}`);
      if (course.total_lessons === 0 || course.total_lessons === null) {
        console.log(`      ⚠️  WARNING: total_lessons is ${course.total_lessons}`);
      }
    });

    // 2. Get student progress data (Randhir Kumar - ID should be found dynamically)
    console.log('\n2️⃣  Finding Randhir Kumar student...');
    const studentCheck = await query(`
      SELECT id, name, email, role
      FROM users
      WHERE email = 'kumarrandhir1705@gmail.com' OR name ILIKE '%Randhir Kumar%'
      LIMIT 1
    `);

    if (studentCheck.rows.length === 0) {
      console.log('   ⚠️  Student Randhir Kumar not found');
      return;
    }

    const student = studentCheck.rows[0];
    console.log(`   ✓ Found student: ${student.name} (ID: ${student.id}, Email: ${student.email})\n`);

    // 3. Check instructor view query result
    console.log('3️⃣  Testing INSTRUCTOR view query...');
    const instructorQuery = await query(`
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
      WHERE e.user_id = $1
      GROUP BY e.id, c.id, c.title, c.total_lessons
      ORDER BY e.enrolled_at DESC
    `, [student.id]);

    console.log(`   ✓ Found ${instructorQuery.rows.length} enrollments\n`);
    instructorQuery.rows.forEach(enrollment => {
      console.log(`   📚 ${enrollment.course_title}`);
      console.log(`      - Enrollment ID: ${enrollment.enrollment_id}`);
      console.log(`      - Total Lessons: ${enrollment.total_lessons}`);
      console.log(`      - Completed: ${enrollment.completed_lessons}`);
      console.log(`      - Progress: ${enrollment.progress_percentage}%`);
    });

    // 4. Check admin view query result
    console.log('\n4️⃣  Testing ADMIN view query...');
    const adminQuery = await query(`
      SELECT 
        e.id as enrollment_id,
        e.course_id,
        c.title as course_title,
        c.total_lessons,
        (SELECT COUNT(*) FROM lesson_completions lc WHERE lc.enrollment_id = e.id) as completed_lessons
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `, [student.id]);

    console.log(`   ✓ Found ${adminQuery.rows.length} enrollments\n`);
    adminQuery.rows.forEach(enrollment => {
      console.log(`   📚 ${enrollment.course_title}`);
      console.log(`      - Enrollment ID: ${enrollment.enrollment_id}`);
      console.log(`      - Total Lessons: ${enrollment.total_lessons}`);
      console.log(`      - Completed: ${enrollment.completed_lessons}`);
      
      const progressPct = enrollment.total_lessons > 0 
        ? Math.round((enrollment.completed_lessons / enrollment.total_lessons) * 100) 
        : 0;
      console.log(`      - Progress: ${progressPct}%`);
    });

    // 5. Compare results
    console.log('\n5️⃣  Comparing Instructor vs Admin views...');
    let hasDiscrepancy = false;
    
    instructorQuery.rows.forEach(instRow => {
      const adminRow = adminQuery.rows.find(a => a.enrollment_id === instRow.enrollment_id);
      if (adminRow) {
        const match = 
          parseInt(instRow.total_lessons) === parseInt(adminRow.total_lessons) &&
          parseInt(instRow.completed_lessons) === parseInt(adminRow.completed_lessons);
        
        if (match) {
          console.log(`   ✅ ${instRow.course_title}: DATA MATCHES`);
          console.log(`      Both show: ${instRow.completed_lessons}/${instRow.total_lessons} lessons`);
        } else {
          console.log(`   ❌ ${instRow.course_title}: DATA MISMATCH!`);
          console.log(`      Instructor: ${instRow.completed_lessons}/${instRow.total_lessons}`);
          console.log(`      Admin: ${adminRow.completed_lessons}/${adminRow.total_lessons}`);
          hasDiscrepancy = true;
        }
      }
    });

    console.log('\n' + '='.repeat(60));
    if (hasDiscrepancy) {
      console.log('❌ VERIFICATION FAILED: Data inconsistencies found!');
      console.log('   Please check if total_lessons column needs to be populated.');
    } else {
      console.log('✅ VERIFICATION PASSED: All data is consistent!');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Run verification
verifyProgressSync();
