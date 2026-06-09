require('dotenv').config();
const { query } = require('../src/config/database');

async function listAssignments() {
  console.log('\n=== Listing All Assignments with Statistics ===\n');

  const result = await query(`
    SELECT 
      a.id,
      a.title,
      a.course_id,
      c.title as course_title,
      a.created_by,
      u.name as creator_name,
      (SELECT COUNT(*) FROM assignment_assignments WHERE assignment_id = a.id) as total_assigned,
      (SELECT COUNT(DISTINCT student_id) FROM assignment_submissions WHERE assignment_id = a.id) as total_submitted
    FROM assignments a
    LEFT JOIN courses c ON a.course_id = c.id
    LEFT JOIN users u ON a.created_by = u.id
    ORDER BY a.created_at DESC
    LIMIT 20
  `);

  console.table(result.rows);
  
  console.log('\nTo debug a specific assignment, run:');
  console.log('node scripts/debug_assignment.js <assignment_id>');
  
  process.exit(0);
}

listAssignments().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
