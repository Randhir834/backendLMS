/**
 * Check actual data in database for Randhir Kumar
 */

require('dotenv').config();
const { query } = require('./src/config/database');

async function checkActualData() {
  console.log('🔍 Checking ACTUAL database state...\n');

  try {
    // Get student
    const student = await query(`
      SELECT id, name, email FROM users
      WHERE email = 'kumarrandhir1705@gmail.com'
    `);

    if (student.rows.length === 0) {
      console.log('Student not found');
      return;
    }

    const studentId = student.rows[0].id;
    console.log(`Student: ${student.rows[0].name} (ID: ${studentId})\n`);

    // Get enrollments
    const enrollments = await query(`
      SELECT 
        e.id as enrollment_id,
        e.course_id,
        c.title,
        c.total_lessons
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.id
    `, [studentId]);

    console.log(`Found ${enrollments.rows.length} enrollments:\n`);

    for (const enrollment of enrollments.rows) {
      console.log(`📚 ${enrollment.title}`);
      console.log(`   Enrollment ID: ${enrollment.enrollment_id}`);
      console.log(`   Total Lessons: ${enrollment.total_lessons}`);

      // Check lesson_completions
      const completions = await query(`
        SELECT 
          id,
          lesson_number,
          completed_at,
          completed_by,
          notes
        FROM lesson_completions
        WHERE enrollment_id = $1
        ORDER BY lesson_number
      `, [enrollment.enrollment_id]);

      console.log(`   Completed Lessons: ${completions.rows.length}`);
      
      if (completions.rows.length > 0) {
        completions.rows.forEach(comp => {
          console.log(`      - Lesson ${comp.lesson_number} (completed_by: ${comp.completed_by})`);
        });
      }

      // Test instructor query
      const instQuery = await query(`
        SELECT 
          COUNT(lc.id)::INTEGER as completed_lessons
        FROM enrollments e
        LEFT JOIN lesson_completions lc ON e.id = lc.enrollment_id
        WHERE e.id = $1
        GROUP BY e.id
      `, [enrollment.enrollment_id]);

      console.log(`   Instructor Query Result: ${instQuery.rows[0]?.completed_lessons || 0} lessons\n`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkActualData();
