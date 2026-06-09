const { query } = require('../config/database');

const findAssignmentsByCourse = async (courseId) => {
  const result = await query(
    `SELECT a.*, u.name as creator_name, u.role as creator_role,
     COALESCE((SELECT COUNT(*)::INTEGER FROM assignment_submissions WHERE assignment_id = a.id), 0) as submission_count,
     COALESCE((SELECT COUNT(DISTINCT student_id)::INTEGER FROM assignment_submissions WHERE assignment_id = a.id), 0) as student_count
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
     COALESCE((SELECT COUNT(*)::INTEGER FROM assignment_submissions WHERE assignment_id = a.id), 0) as submission_count,
     COALESCE((SELECT COUNT(DISTINCT student_id)::INTEGER FROM assignment_submissions WHERE assignment_id = a.id), 0) as student_count
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

  // Get assignment details
  const assignment = await findAssignmentById(assignment_id);
  
  // Check if deadline has passed - STRICT CHECK
  const now = new Date();
  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
  const isLate = dueDate && dueDate < now;
  
  // Prevent submission if deadline has passed (unless late submissions are explicitly allowed)
  if (isLate && !assignment.allow_late_submission) {
    throw new Error('The deadline for this assignment has passed. Submissions are no longer accepted.');
  }

  // Check if assignment allows resubmission
  const existingSubmissions = await query(
    'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2 ORDER BY version DESC',
    [assignment_id, student_id]
  );

  // If there are existing submissions
  if (existingSubmissions.rows.length > 0) {
    // Check if resubmission is allowed by assignment settings
    if (!assignment.allow_resubmission) {
      throw new Error('Resubmission is not allowed for this assignment');
    }

    // Check if the latest submission has been graded
    const latestSubmission = existingSubmissions.rows[0];
    if (latestSubmission.score !== null && latestSubmission.score !== undefined) {
      throw new Error('Cannot resubmit: This assignment has already been graded. Resubmissions are locked after grading.');
    }

    // Additional check: if status is 'graded' even without a score
    if (latestSubmission.status === 'graded') {
      throw new Error('Cannot resubmit: This assignment has already been graded. Resubmissions are locked after grading.');
    }
  }

  // Calculate the next version number
  const nextVersion = existingSubmissions.rows.length > 0 ? existingSubmissions.rows[0].version + 1 : 1;
  const submissionCount = existingSubmissions.rows.length + 1;

  // Insert new submission (trigger will handle setting is_latest flags)
  const result = await query(
    `INSERT INTO assignment_submissions 
     (assignment_id, student_id, file_url, file_name, file_size, file_type, notes, 
      submission_count, version, is_late, is_latest, status, submitted_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, 'submitted', NOW()) 
     RETURNING *`,
    [assignment_id, student_id, file_url, file_name, file_size, file_type, notes, submissionCount, nextVersion, isLate]
  );

  // Mark assignment as submitted
  await query(
    'UPDATE assignment_assignments SET is_submitted = TRUE WHERE assignment_id = $1 AND student_id = $2',
    [assignment_id, student_id]
  );

  return result.rows[0];
};

const findSubmissionsByAssignment = async (assignmentId) => {
  try {
    // First, check if is_latest column exists and has data
    const result = await query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email, u.avatar_url as profile_photo
       FROM assignment_submissions s 
       JOIN users u ON s.student_id = u.id 
       WHERE s.assignment_id = $1 
       AND (s.is_latest = TRUE OR s.is_latest IS NULL)
       ORDER BY s.submitted_at DESC`,
      [assignmentId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching submissions:', error);
    // Fallback to simple query if is_latest column doesn't exist
    const result = await query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email, u.avatar_url as profile_photo
       FROM assignment_submissions s 
       JOIN users u ON s.student_id = u.id 
       WHERE s.assignment_id = $1 
       ORDER BY s.submitted_at DESC`,
      [assignmentId]
    );
    return result.rows;
  }
};

const findSubmissionHistoryByStudent = async (assignmentId, studentId) => {
  try {
    const result = await query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email, u.avatar_url as profile_photo,
       grader.name as graded_by_name
       FROM assignment_submissions s 
       JOIN users u ON s.student_id = u.id 
       LEFT JOIN users grader ON s.graded_by = grader.id
       WHERE s.assignment_id = $1 AND s.student_id = $2
       ORDER BY s.version DESC NULLS LAST, s.submitted_at DESC`,
      [assignmentId, studentId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching submission history:', error);
    // Fallback query without version ordering
    const result = await query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email, u.avatar_url as profile_photo
       FROM assignment_submissions s 
       JOIN users u ON s.student_id = u.id 
       WHERE s.assignment_id = $1 AND s.student_id = $2
       ORDER BY s.submitted_at DESC`,
      [assignmentId, studentId]
    );
    return result.rows;
  }
};

const findSubmissionsByStudent = async (studentId) => {
  try {
    const result = await query(
      `SELECT s.*, a.title AS assignment_title, a.course_id, a.due_date, a.max_score, 
       a.allow_resubmission, c.title AS course_title 
       FROM assignment_submissions s 
       JOIN assignments a ON s.assignment_id = a.id 
       JOIN courses c ON a.course_id = c.id 
       WHERE s.student_id = $1 AND (s.is_latest = TRUE OR s.is_latest IS NULL)
       ORDER BY s.submitted_at DESC`,
      [studentId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching student submissions:', error);
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
  }
};

const getStudentAssignments = async (studentId) => {
  try {
    const result = await query(
      `SELECT a.*, c.title as course_title, aa.assigned_at, aa.is_submitted,
       (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND student_id = $1) as my_submissions,
       (SELECT score FROM assignment_submissions WHERE assignment_id = a.id AND student_id = $1 AND (is_latest = TRUE OR is_latest IS NULL) ORDER BY submitted_at DESC LIMIT 1) as my_score,
       (SELECT status FROM assignment_submissions WHERE assignment_id = a.id AND student_id = $1 AND (is_latest = TRUE OR is_latest IS NULL) ORDER BY submitted_at DESC LIMIT 1) as my_status,
       (SELECT feedback FROM assignment_submissions WHERE assignment_id = a.id AND student_id = $1 AND (is_latest = TRUE OR is_latest IS NULL) ORDER BY submitted_at DESC LIMIT 1) as my_feedback,
       (SELECT graded_at FROM assignment_submissions WHERE assignment_id = a.id AND student_id = $1 AND (is_latest = TRUE OR is_latest IS NULL) ORDER BY submitted_at DESC LIMIT 1) as graded_at,
       (SELECT submitted_at FROM assignment_submissions WHERE assignment_id = a.id AND student_id = $1 AND (is_latest = TRUE OR is_latest IS NULL) ORDER BY submitted_at DESC LIMIT 1) as submitted_at
       FROM assignment_assignments aa
       JOIN assignments a ON aa.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE aa.student_id = $1 AND a.is_published = TRUE
       ORDER BY a.due_date ASC`,
      [studentId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching student assignments:', error);
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
  }
};

const gradeSubmission = async (id, { score, status, feedback, instructor_comments }, instructorId) => {
  const result = await query(
    `UPDATE assignment_submissions SET 
     score = $1, 
     status = $2, 
     feedback = $3,
     instructor_comments = $4,
     graded_by = $5,
     graded_at = NOW(), 
     updated_at = NOW() 
     WHERE id = $6 RETURNING *`,
    [score, status || 'graded', feedback, instructor_comments, instructorId, id]
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
     COUNT(CASE WHEN is_late = true THEN 1 END) as late_submissions,
     COUNT(CASE WHEN status = 'graded' THEN 1 END) as total_graded
     FROM assignment_submissions
     WHERE assignment_id = $1 AND status != 'removed'`,
    [assignmentId]
  );
  
  const assignedCount = await query(
    'SELECT COUNT(*) as assigned_count FROM assignment_assignments WHERE assignment_id = $1',
    [assignmentId]
  );
  
  const totalAssigned = parseInt(assignedCount.rows[0].assigned_count);
  const totalSubmitted = parseInt(result.rows[0].total_students_submitted || 0);
  const submissionRate = totalAssigned > 0 ? Math.round((totalSubmitted / totalAssigned) * 100) : 0;
  
  return {
    total_assigned: totalAssigned,
    total_submitted: totalSubmitted,
    total_graded: parseInt(result.rows[0].total_graded || 0),
    avg_score: parseFloat(result.rows[0].average_score || 0).toFixed(2),
    submission_rate: submissionRate,
    highest_score: parseFloat(result.rows[0].highest_score || 0),
    lowest_score: parseFloat(result.rows[0].lowest_score || 0),
    late_submissions: parseInt(result.rows[0].late_submissions || 0)
  };
};

module.exports = {
  findAssignmentsByCourse, findAllAssignments, findAssignmentById, createAssignment, updateAssignmentById, deleteAssignmentById,
  assignAssignmentToStudents, assignAssignmentToAllEnrolled, getAssignmentAssignments, removeAssignmentAssignment,
  submitAssignment, findSubmissionsByAssignment, findSubmissionHistoryByStudent, findSubmissionsByStudent, getStudentAssignments, gradeSubmission,
  getAssignmentStatistics,
};
