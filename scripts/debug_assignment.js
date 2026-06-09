require('dotenv').config();
const { query } = require('../src/config/database');

async function debugAssignment() {
  const assignmentId = process.argv[2];
  
  if (!assignmentId) {
    console.log('Usage: node debug_assignment.js <assignment_id>');
    process.exit(1);
  }

  console.log('\n=== Debugging Assignment ID:', assignmentId, '===\n');

  // 1. Check assignment exists
  console.log('1. Checking assignment exists:');
  const assignmentResult = await query(
    'SELECT * FROM assignments WHERE id = $1',
    [assignmentId]
  );
  console.log('Assignment:', JSON.stringify(assignmentResult.rows, null, 2));

  // 2. Check assignment_assignments (students assigned)
  console.log('\n2. Checking assignment_assignments:');
  const assignmentsResult = await query(
    'SELECT * FROM assignment_assignments WHERE assignment_id = $1',
    [assignmentId]
  );
  console.log('Assignment Assignments:', JSON.stringify(assignmentsResult.rows, null, 2));

  // 3. Check assignment_submissions
  console.log('\n3. Checking assignment_submissions:');
  const submissionsResult = await query(
    'SELECT * FROM assignment_submissions WHERE assignment_id = $1',
    [assignmentId]
  );
  console.log('Submissions:', JSON.stringify(submissionsResult.rows, null, 2));

  // 4. Check statistics query
  console.log('\n4. Statistics Query:');
  const statsResult = await query(
    `SELECT 
     COUNT(DISTINCT student_id) as total_students_submitted,
     COUNT(*) as total_submissions
     FROM assignment_submissions
     WHERE assignment_id = $1 AND status != 'removed'`,
    [assignmentId]
  );
  console.log('Stats:', JSON.stringify(statsResult.rows, null, 2));

  const assignedCount = await query(
    'SELECT COUNT(*) as assigned_count FROM assignment_assignments WHERE assignment_id = $1',
    [assignmentId]
  );
  console.log('Assigned Count:', JSON.stringify(assignedCount.rows, null, 2));

  // 5. Check joined query for students
  console.log('\n5. Joined Query for Students (getAssignmentAssignments):');
  const studentsResult = await query(
    `SELECT aa.*, u.name, u.email, u.avatar_url as profile_photo,
     (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = aa.assignment_id AND student_id = aa.student_id) as submission_count,
     (SELECT status FROM assignment_submissions WHERE assignment_id = aa.assignment_id AND student_id = aa.student_id ORDER BY submitted_at DESC LIMIT 1) as latest_status,
     (SELECT score FROM assignment_submissions WHERE assignment_id = aa.assignment_id AND student_id = aa.student_id ORDER BY submitted_at DESC LIMIT 1) as latest_score
     FROM assignment_assignments aa
     JOIN users u ON aa.student_id = u.id
     WHERE aa.assignment_id = $1
     ORDER BY aa.assigned_at DESC`,
    [assignmentId]
  );
  console.log('Students (Joined):', JSON.stringify(studentsResult.rows, null, 2));

  // 6. Check joined query for submissions
  console.log('\n6. Joined Query for Submissions (findSubmissionsByAssignment):');
  const submissionsJoinedResult = await query(
    `SELECT s.*, u.name AS student_name, u.email AS student_email, u.avatar_url as profile_photo
     FROM assignment_submissions s 
     JOIN users u ON s.student_id = u.id 
     WHERE s.assignment_id = $1 
     ORDER BY s.submitted_at DESC`,
    [assignmentId]
  );
  console.log('Submissions (Joined):', JSON.stringify(submissionsJoinedResult.rows, null, 2));

  process.exit(0);
}

debugAssignment().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
