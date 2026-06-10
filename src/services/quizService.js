const { query } = require('../config/database');

const findQuizzesByCourse = async (courseId) => {
  const result = await query(
    `SELECT q.*, u.name as creator_name, u.role as creator_role,
     (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count,
     (SELECT COUNT(DISTINCT student_id) FROM quiz_attempts WHERE quiz_id = q.id) as attempt_count
     FROM quizzes q
     LEFT JOIN users u ON q.created_by = u.id
     WHERE q.course_id = $1 
     ORDER BY q.created_at DESC`,
    [courseId]
  );
  return result.rows;
};

const findAllQuizzes = async () => {
  const result = await query(
    `SELECT q.*, c.title as course_title, u.name as creator_name, u.role as creator_role,
     (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count,
     (SELECT COUNT(DISTINCT student_id) FROM quiz_attempts WHERE quiz_id = q.id) as attempt_count
     FROM quizzes q
     LEFT JOIN courses c ON q.course_id = c.id
     LEFT JOIN users u ON q.created_by = u.id
     ORDER BY q.created_at DESC`
  );
  return result.rows;
};

const findQuizById = async (id) => {
  const result = await query(
    `SELECT q.*, c.title as course_title, u.name as creator_name, u.role as creator_role,
     (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
     FROM quizzes q
     LEFT JOIN courses c ON q.course_id = c.id
     LEFT JOIN users u ON q.created_by = u.id
     WHERE q.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const createQuiz = async ({ course_id, title, description, time_limit_minutes, passing_score, created_by, deadline, max_attempts, show_correct_answers, randomize_questions }) => {
  const result = await query(
    `INSERT INTO quizzes (course_id, title, description, time_limit_minutes, passing_score, created_by, deadline, max_attempts, show_correct_answers, randomize_questions) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [course_id, title, description, time_limit_minutes || 30, passing_score || 50, created_by, deadline, max_attempts || 1, show_correct_answers !== false, randomize_questions || false]
  );
  return result.rows[0];
};

const updateQuizById = async (id, data) => {
  const result = await query(
    `UPDATE quizzes SET 
     title = COALESCE($1, title), 
     description = COALESCE($2, description), 
     time_limit_minutes = COALESCE($3, time_limit_minutes), 
     passing_score = COALESCE($4, passing_score), 
     is_published = COALESCE($5, is_published),
     deadline = COALESCE($6, deadline),
     max_attempts = COALESCE($7, max_attempts),
     show_correct_answers = COALESCE($8, show_correct_answers),
     randomize_questions = COALESCE($9, randomize_questions),
     updated_at = NOW() 
     WHERE id = $10 RETURNING *`,
    [data.title, data.description, data.time_limit_minutes, data.passing_score, data.is_published, data.deadline, data.max_attempts, data.show_correct_answers, data.randomize_questions, id]
  );
  return result.rows[0];
};

const deleteQuizById = async (id) => {
  await query('DELETE FROM quizzes WHERE id = $1', [id]);
};

const findQuestionsByQuiz = async (quizId) => {
  const result = await query(
    'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY sort_order ASC',
    [quizId]
  );
  return result.rows;
};

const createQuestion = async ({ quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, sort_order }) => {
  const result = await query(
    'INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
    [quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks || 1, sort_order || 0]
  );
  
  // Update total marks in quiz
  await query(
    'UPDATE quizzes SET total_marks = (SELECT COALESCE(SUM(marks), 0) FROM quiz_questions WHERE quiz_id = $1) WHERE id = $1',
    [quiz_id]
  );
  
  return result.rows[0];
};

const updateQuestionById = async (id, data) => {
  const result = await query(
    `UPDATE quiz_questions SET 
     question_text = COALESCE($1, question_text),
     option_a = COALESCE($2, option_a),
     option_b = COALESCE($3, option_b),
     option_c = COALESCE($4, option_c),
     option_d = COALESCE($5, option_d),
     correct_option = COALESCE($6, correct_option),
     marks = COALESCE($7, marks),
     sort_order = COALESCE($8, sort_order)
     WHERE id = $9 RETURNING *`,
    [data.question_text, data.option_a, data.option_b, data.option_c, data.option_d, data.correct_option, data.marks, data.sort_order, id]
  );
  
  if (result.rows[0]) {
    // Update total marks in quiz
    await query(
      'UPDATE quizzes SET total_marks = (SELECT COALESCE(SUM(marks), 0) FROM quiz_questions WHERE quiz_id = $1) WHERE id = $1',
      [result.rows[0].quiz_id]
    );
  }
  
  return result.rows[0];
};

const deleteQuestionById = async (id) => {
  // Get quiz_id before deleting
  const questionResult = await query('SELECT quiz_id FROM quiz_questions WHERE id = $1', [id]);
  const quizId = questionResult.rows[0]?.quiz_id;
  
  await query('DELETE FROM quiz_questions WHERE id = $1', [id]);
  
  // Update total marks in quiz
  if (quizId) {
    await query(
      'UPDATE quizzes SET total_marks = (SELECT COALESCE(SUM(marks), 0) FROM quiz_questions WHERE quiz_id = $1) WHERE id = $1',
      [quizId]
    );
  }
};

// Quiz Assignment Functions
const assignQuizToStudents = async (quizId, studentIds) => {
  const values = studentIds.map((studentId, index) => 
    `($1, $${index + 2})`
  ).join(', ');
  
  const result = await query(
    `INSERT INTO quiz_assignments (quiz_id, student_id) 
     VALUES ${values}
     ON CONFLICT (quiz_id, student_id) DO NOTHING
     RETURNING *`,
    [quizId, ...studentIds]
  );
  return result.rows;
};

const assignQuizToAllEnrolled = async (quizId, courseId) => {
  const result = await query(
    `INSERT INTO quiz_assignments (quiz_id, student_id)
     SELECT $1, user_id 
     FROM enrollments 
     WHERE course_id = $2 AND status = 'active'
     ON CONFLICT (quiz_id, student_id) DO NOTHING
     RETURNING *`,
    [quizId, courseId]
  );
  return result.rows;
};

const getQuizAssignments = async (quizId) => {
  const result = await query(
    `SELECT qa.*, u.name, u.email, u.profile_photo,
     (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = qa.quiz_id AND student_id = qa.student_id) as attempt_count,
     (SELECT MAX(score) FROM quiz_attempts WHERE quiz_id = qa.quiz_id AND student_id = qa.student_id AND status = 'completed') as best_score
     FROM quiz_assignments qa
     JOIN users u ON qa.student_id = u.id
     WHERE qa.quiz_id = $1
     ORDER BY qa.assigned_at DESC`,
    [quizId]
  );
  return result.rows;
};

const removeQuizAssignment = async (quizId, studentId) => {
  await query(
    'DELETE FROM quiz_assignments WHERE quiz_id = $1 AND student_id = $2',
    [quizId, studentId]
  );
};

const startAttempt = async ({ quiz_id, student_id }) => {
  // Check if student is assigned to this quiz
  const assignmentCheck = await query(
    'SELECT * FROM quiz_assignments WHERE quiz_id = $1 AND student_id = $2',
    [quiz_id, student_id]
  );
  
  if (assignmentCheck.rows.length === 0) {
    throw new Error('You are not assigned to this quiz');
  }
  
  // Check max attempts
  const quiz = await findQuizById(quiz_id);
  const previousAttempts = await query(
    'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
    [quiz_id, student_id]
  );
  
  const attemptNumber = parseInt(previousAttempts.rows[0].count) + 1;
  
  if (attemptNumber > quiz.max_attempts) {
    throw new Error(`Maximum attempts (${quiz.max_attempts}) reached`);
  }
  
  // Check deadline
  if (quiz.deadline && new Date(quiz.deadline) < new Date()) {
    throw new Error('Quiz deadline has passed');
  }
  
  const result = await query(
    'INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, total_marks) VALUES ($1, $2, $3, $4) RETURNING *',
    [quiz_id, student_id, attemptNumber, quiz.total_marks]
  );
  return result.rows[0];
};

const submitAnswer = async ({ attempt_id, question_id, selected_option, is_correct }) => {
  const result = await query(
    'INSERT INTO quiz_answers (attempt_id, question_id, selected_option, is_correct) VALUES ($1, $2, $3, $4) RETURNING *',
    [attempt_id, question_id, selected_option, is_correct]
  );
  return result.rows[0];
};

const completeAttempt = async (id, { score, total_marks, time_taken_seconds }) => {
  const result = await query(
    'UPDATE quiz_attempts SET score = $1, total_marks = $2, time_taken_seconds = $3, status = $4, completed_at = NOW() WHERE id = $5 RETURNING *',
    [score, total_marks, time_taken_seconds, 'completed', id]
  );
  
  // Mark assignment as completed
  if (result.rows[0]) {
    await query(
      'UPDATE quiz_assignments SET is_completed = TRUE WHERE quiz_id = $1 AND student_id = $2',
      [result.rows[0].quiz_id, result.rows[0].student_id]
    );
  }
  
  return result.rows[0];
};

const findAttemptsByStudent = async (studentId) => {
  const result = await query(
    `SELECT a.*, q.title AS quiz_title, q.course_id, q.passing_score, q.deadline, c.title AS course_title,
     q.id as quiz_id
     FROM quiz_attempts a 
     JOIN quizzes q ON a.quiz_id = q.id 
     JOIN courses c ON q.course_id = c.id 
     WHERE a.student_id = $1 
     ORDER BY a.created_at DESC`,
    [studentId]
  );
  return result.rows;
};

const findAttemptsByQuiz = async (quizId) => {
  const result = await query(
    `SELECT a.*, u.name as student_name, u.email as student_email, u.profile_photo
     FROM quiz_attempts a
     JOIN users u ON a.student_id = u.id
     WHERE a.quiz_id = $1
     ORDER BY a.completed_at DESC, a.started_at DESC`,
    [quizId]
  );
  return result.rows;
};

const getQuizStatistics = async (quizId) => {
  const result = await query(
    `SELECT 
     COUNT(DISTINCT student_id) as total_students_attempted,
     COUNT(*) as total_attempts,
     AVG(score) as average_score,
     MAX(score) as highest_score,
     MIN(score) as lowest_score,
     AVG(time_taken_seconds) as average_time_seconds
     FROM quiz_attempts
     WHERE quiz_id = $1 AND status = 'completed'`,
    [quizId]
  );
  
  const assignedCount = await query(
    'SELECT COUNT(*) as assigned_count FROM quiz_assignments WHERE quiz_id = $1',
    [quizId]
  );
  
  return {
    ...result.rows[0],
    total_assigned: parseInt(assignedCount.rows[0].assigned_count)
  };
};

const getStudentQuizzes = async (studentId) => {
  const result = await query(
    `SELECT q.*, c.title as course_title, qa.assigned_at, qa.is_completed,
     (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1) as my_attempts,
     (SELECT MAX(score) FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1 AND status = 'completed') as my_best_score,
     (SELECT status FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1 ORDER BY started_at DESC LIMIT 1) as last_attempt_status
     FROM quiz_assignments qa
     JOIN quizzes q ON qa.quiz_id = q.id
     JOIN courses c ON q.course_id = c.id
     WHERE qa.student_id = $1 AND q.is_published = TRUE
     ORDER BY qa.assigned_at DESC`,
    [studentId]
  );
  return result.rows;
};

const findAttemptById = async (id) => {
  const result = await query('SELECT * FROM quiz_attempts WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const findAnswersByAttempt = async (attemptId) => {
  const result = await query(
    'SELECT a.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option FROM quiz_answers a JOIN quiz_questions q ON a.question_id = q.id WHERE a.attempt_id = $1 ORDER BY q.sort_order ASC',
    [attemptId]
  );
  return result.rows;
};

module.exports = {
  findQuizzesByCourse, findAllQuizzes, findQuizById, createQuiz, updateQuizById, deleteQuizById,
  findQuestionsByQuiz, createQuestion, updateQuestionById, deleteQuestionById,
  assignQuizToStudents, assignQuizToAllEnrolled, getQuizAssignments, removeQuizAssignment,
  startAttempt, submitAnswer, completeAttempt, 
  findAttemptsByStudent, findAttemptsByQuiz, findAttemptById, findAnswersByAttempt,
  getQuizStatistics, getStudentQuizzes,
};
