/**
 * Check actual lesson_completions records
 */

require('dotenv').config();
const { query } = require('./src/config/database');

async function checkLessonCompletions() {
  console.log('🔍 Checking lesson_completions table...\n');

  try {
    // Get Randhir Kumar's user ID
    const studentCheck = await query(`
      SELECT id, name, email
      FROM users
      WHERE email = 'kumarrandhir1705@gmail.com' OR name ILIKE '%Randhir Kumar%'
      LIMIT 1
    `);

    if (studentCheck.rows.length === 0) {
      console.log('❌ Student not found');
      return;
    }

    const student = studentCheck.rows[0];
    console.log(`Student: ${student.name} (ID: ${student.id})\n`);

    // Get all enrollments
    const enrollments = await query(`
      SELECT e.id, e.course_id, c.title, e.enrolled_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `, [student.id]);

    console.log(`Found ${enrollments.rows.length} enrollments:\n`);

    for (const enrollment of enrollments.rows) {
      console.log(`📚 ${enrollment.title} (Enrollment ID: ${enrollment.id})`);
      
      // Check for lesson completions
      const completions = await query(`
        SELECT 
          id, 
          lesson_number, 
          completed_at,
          notes
        FROM lesson_completions
        WHERE enrollment_id = $1
        ORDER BY lesson_number
      `, [enrollment.id]);

      if (completions.rows.length > 0) {
        console.log(`   ✅ ${completions.rows.length} lessons completed:`);
        completions.rows.forEach(comp => {
          console.log(`      - Lesson ${comp.lesson_number}: ${new Date(comp.completed_at).toLocaleString()}`);
          if (comp.notes) console.log(`        Notes: ${comp.notes}`);
        });
      } else {
        console.log(`   ⚠️  No lesson completions found`);
      }
      console.log('');
    }

    // Check if there are any orphaned lesson_completions
    console.log('🔍 Checking for any lesson_completions records...\n');
    const allCompletions = await query(`
      SELECT 
        lc.id,
        lc.enrollment_id,
        lc.lesson_number,
        lc.completed_at,
        e.user_id,
        u.name as student_name,
        c.title as course_title
      FROM lesson_completions lc
      LEFT JOIN enrollments e ON lc.enrollment_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = $1 OR e.user_id IS NULL
      ORDER BY lc.completed_at DESC
      LIMIT 50
    `, [student.id]);

    if (allCompletions.rows.length > 0) {
      console.log(`Found ${allCompletions.rows.length} total completion records:`);
      allCompletions.rows.forEach(comp => {
        console.log(`   - Enrollment ${comp.enrollment_id}, Lesson ${comp.lesson_number}: ${comp.course_title || 'Unknown Course'}`);
      });
    } else {
      console.log('No completion records found at all');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkLessonCompletions();
