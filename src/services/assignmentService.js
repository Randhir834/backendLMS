const { query } = require('../config/database');

const findAssignmentsByCourse = async (courseId) => {
  const result = await query(
    `SELECT a.*, u.name as creator_name, u.role as creator_role,
     (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count,
     (SELECT COUNT(DISTINCT student_id) FROM assignment_submissions WHERE assignment_id = a.id) as student_count
     FROM assignments a
     LEFT JOIN users u ON a.created_by = u.id
     WHERE a.course_id = $1 
     ORDER BY a.due_date ASC`,
    [courseId]
  );
  return result.rows;
};

const findAllAssignments = async () => {
  const result = await query(
    `SELECT a.*, c.title as course_title, u.name as creator_name, u.role as creator_role,
     (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count,
     (SELECT COUNT(DISTINCT student_id) FROM assignment_submissions WHERE assignment_id = a.id) as student_count
     FROM assignments a
     LEFT JOIN courses c ON a.course_id = c.id
     LEFT JOIN users u ON a.created_by = u.id
     ORDER BY a.created_at DESC`
  );
  return result.rows;
};

const findAssignmentById = async (id) => {
  const result = await query(
    `SELECT a.*, c.title as course_title, u.name as creator_name, u.role as creator_role
     FROM assignments a
     LEFT JOIN courses c ON a.course_id = c.id
     LEFT JOIN users u ON a.created_by = u.id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const createAssignment = async ({ course_id, title, description, instructions, due_date, max_score, created_by, file_requirements, allow_resubmission, allow_late_submission, is_published, submission_format }) => {
  const result = await query(
    `INSERT INTO assignments (course_id, title, description, instructions, due_date, max_score, created_by, file_requirements, allow_resubmission, allow_late_submission, is_published, submission_format) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [course_id, title, description, instructions, due_date, max_score || 100, created_by, file_requirements, allow_resubmission || false, allow_late_submission || false, is_published !== false, submission_format || 'file']
  );
  return result.rows[0];
};

const updateAssignmentById = async (id, data) => {
  const result = await query(
    `UPDATE assignments SET 
     title = COALESCE($1, title), 
     description = COALESCE($2, description), 
     instructions = COALESCE($3, instructions),
     due_date = COALESCE($4, due_date), 
     max_score = COALESCE($5, max_score),
     file_requirements = COALESCE($6, file_requirements),
     allow_resubmission = COALESCE($7, allow_resubmission),
     allow_late_submission = COALESCE($8, allow_late_submission),
     is_published = COALESCE($9, is_published),
     submission_format = COALESCE($10, submission_format),
     updated_at = NOW() 
     WHERE id = $11 RETURNING *`,
    [data.title, data.description, data.instructions, data.due_date, data.max_score, data.file_requirements, data.allow_resubmission, data.allow_late_submission, data.is_published, data.submission_format, id]
  );
  return result.rows[0];
};

// Assignment Assignment Functions
const assignAssignmentToStudents = async (assignmentId, studentIds) => {
  const values = studentIds.map((studentId, index) => 
    `($1, $${index + 2})`
  ).join(', ');
  
  const result = await query(
    `INSERT INTO assignment_assignments (assignment_id, student_id) 
     VALUES ${values}
     ON CONFLICT (assignment_id, student_id) DO NOTHING
     RETURNING *`,
    [assignmentId, ...studentIds]
  );
  return result.rows;
};

const assignAssignmentToAllEnrolled = async (assignmentId, courseId) => {
  const result = await query(
    `INSERT INTO assignment_assignments (assignment_id, student_id)
     SELECT $1, user_id 
     FROM enrollments 
     WHERE course_id = $2 AND status = 'active'
     ON CONFLICT (assignment_id, student_id) DO NOTHING
     RETURNING *`,
    [assignmentId, courseId]
  );
  return result.rows;
};

const getAssignmentAssignments = async (assignmentId) => {
  const result = await query(
    `SELECT aa.*, u.name, u.email, u.profile_photo,
     (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = aa.assignment_id AND student_id = aa.student_id) as submission_count,
     (SELECT status FROM assignment_submissions WHERE assignment_id = aa.assignment_id AND student_id = aa.student_id ORDER BY submitted_at DESC LIMIT 1) as latest_status,
     (SELECT score FROM assignment_submissions WHERE assignment_id = aa.assignment_id AND student_id = aa.student_id ORDER BY submitted_at DESC LIMIT 1) as latest_score
     FROM assignment_assignments aa
     JOIN users u ON aa.student_id = u.id
     WHERE aa.assignment_id = $1
     ORDER BY aa.assigned_at DESC`,
    [assignmentId]
  );
  return result.rows;
};

const removeAssignmentAssignment = async (assignmentId, studentId) => {
  await query(
    'DELETE FROM assignment_assignments WHERE assignment_id = $1 AND student_id = $2',
    [assignmentId, studentId]
  );
};

const deleteAssignmentById = async (id) => {
  await query('DELETE FROM assignments WHERE id = $1', [id]);
};

const submitAssignment = async ({ assignment_id, student_id, file_url, file_name, file_size, file_type, notes }) => {
  // Check if student is assigned to this assignment
  const assignmentCheck = await query(
    'SELECT * FROM assignment_assignments WHERE assignment_id = $1 AND student_id = $2',
    [assignment_id, student_id]
  );
  
  if (assignmentCheck.rows.length === 0) {
    throw new Error('You are not assigned to this assignment');
  }

  // Check if assignment allows resubmission
  const assignment = await findAssignmentById(assignment_id);
  const existingSubmission = await query(
    'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
    [assignment_id, student_id]
  );

  if (existingSubmission.rows.length > 0 && !assignment.allow_resubmission) {
    throw new Error('Resubmission is not allowed for this assignment');
  }

  // Check if deadline has passed
  const isLate = assignment.due_date && new Date(assignment.due_date) < new Date();
  if (isLate && !assignment.allow_late_submission) {
    throw new Error('Assignment deadline has passed and late submissions are not allowed');
  }

  const submissionCount = existingSubmission.rows.length + 1;

  const result = await query(
    `INSERT INTO assignment_submissions (assignment_id, student_id, file_url, file_name, file_size, file_type, notes, submission_count, is_late, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
     ON CONFLICT (assignment_id, student_id) 
     DO UPDATE SET 
       file_url = EXCLUDED.file_url,
       file_name = EXCLUDED.file_name,
       file_size = EXCLUDED.file_size,
       file_type = EXCLUDED.file_type,
       notes = EXCLUDED.notes,
       submission_count = assignment_submissions.submission_count + 1,
       is_late = EXCLUDED.is_late,
       status = 'submitted',
       submitted_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [assignment_id, student_id, file_url, file_name, file_size, file_type, notes, submissionCount, isLate, 'submitted']
  );

  // Mark assignment as submitted
  await query(
    'UPDATE assignment_assignments SET is_submitted = TRUE WHERE assignment_id = $1 AND student_id = $2',
    [assignment_id, student_id]
  );

  return result.rows[0];
};

const findSubmissionsByAssignment = async (assignmentId) => {
  const result = await query(
    `SELECT s.*, u.name AS student_name, u.email AS student_email, u.profile_photo
     FROM assignment_submissions s 
     JOIN users u ON s.student_id = u.id 
     WHERE s.assignment_id = $1 
     ORDER BY s.submitted_at DESC`,
    [assignmentId]
  );
  return result.rows;
};

const findSubmissionsByStudent = async (studentId) => {
  const result = await query(
    `SELECT s.*, a.title AS assignment_title, a.course_id, a.due_date, a.max_score, c.title AS course_title 
     FROM assignment_submissions s 
     JOIN assignments a ON s.assignment_id = a.id 
     JOIN courses c ON a.course_id = c.id 
     WHERE s.student_id = $1 
     ORDER BY s.submitted_at DESC`,
    [studentId]
  );
  return result.rows;
};

const getStudentAssignments = async (studentId) => {
  const result = await query(
    `SELECT a.*, c.title as course_title, aa.assigned_at, aa.is_submitted,
     (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND student_id = $1) as my_submissions,
     (SELECT score FROM assignment_submissions WHERE assignment_id = a.id AND student_id = $1 ORDER BY submitted_at DESC LIMIT 1) as my_score,
     (SELECT status FROM assignment_submissions WHERE assignment_id = a.id AND student_id = $1 ORDER BY submitted_at DESC LIMIT 1) as my_status
     FROM assignment_assignments aa
     JOIN assignments a ON aa.assignment_id = a.id
     JOIN courses c ON a.course_id = c.id
     WHERE aa.student_id = $1 AND a.is_published = TRUE
     ORDER BY a.due_date ASC`,
    [studentId]
  );
  return result.rows;
};

const gradeSubmission = async (id, { score, status, feedback, instructor_comments }) => {
  const result = await query(
    `UPDATE assignment_submissions SET 
     score = $1, 
     status = $2, 
     feedback = $3,
     instructor_comments = $4,
     graded_at = NOW(), 
     updated_at = NOW() 
     WHERE id = $5 RETURNING *`,
    [score, status || 'graded', feedback, instructor_comments, id]
  );
  return result.rows[0];
};

const getAssignmentStatistics = async (assignmentId) => {
  const result = await query(
    `SELECT 
     COUNT(DISTINCT student_id) as total_students_submitted,
     COUNT(*) as total_submissions,
     AVG(score) as average_score,
     MAX(score) as highest_score,
     MIN(score) as lowest_score,
     COUNT(CASE WHEN is_late = true THEN 1 END) as late_submissions
     FROM assignment_submissions
     WHERE assignment_id = $1 AND status != 'removed'`,
    [assignmentId]
  );
  
  const assignedCount = await query(
    'SELECT COUNT(*) as assigned_count FROM assignment_assignments WHERE assignment_id = $1',
    [assignmentId]
  );
  
  return {
    ...result.rows[0],
    total_assigned: parseInt(assignedCount.rows[0].assigned_count)
  };
};

module.exports = {
  findAssignmentsByCourse, findAllAssignments, findAssignmentById, createAssignment, updateAssignmentById, deleteAssignmentById,
  assignAssignmentToStudents, assignAssignmentToAllEnrolled, getAssignmentAssignments, removeAssignmentAssignment,
  submitAssignment, findSubmissionsByAssignment, findSubmissionsByStudent, getStudentAssignments, gradeSubmission,
  getAssignmentStatistics,
};
