const { query } = require('../config/database');

// ==================== QUIZ CRUD OPERATIONS ====================

const findAllQuizzes = async () => {
  const result = await query(
    `SELECT q.*, c.title as course_title, u.name as creator_name, u.role as creator_role,
     COALESCE((SELECT COUNT(*)::INTEGER FROM quiz_attempts WHERE quiz_id = q.id), 0) as attempt_count,
     COALESCE((SELECT COUNT(DISTINCT student_id)::INTEGER FROM quiz_attempts WHERE quiz_id = q.id), 0) as student_count,
     COALESCE((SELECT COUNT(*)::INTEGER FROM quiz_questions WHERE quiz_id = q.id), 0) as question_count
     FROM quizzes q
     LEFT JOIN courses c ON q.course_id = c.id
     LEFT JOIN users u ON q.created_by = u.id
     ORDER BY q.created_at DESC`
  );
  return result.rows;
};

const findQuizzesByCourse = async (courseId) => {
  const result = await query(
    `SELECT q.*, u.name as creator_name, u.role as creator_role,
     COALESCE((SELECT COUNT(*)::INTEGER FROM quiz_attempts WHERE quiz_id = q.id), 0) as attempt_count,
     COALESCE((SELECT COUNT(DISTINCT student_id)::INTEGER FROM quiz_attempts WHERE quiz_id = q.id), 0) as student_count,
     COALESCE((SELECT COUNT(*)::INTEGER FROM quiz_questions WHERE quiz_id = q.id), 0) as question_count
     FROM quizzes q
     LEFT JOIN users u ON q.created_by = u.id
     WHERE q.course_id = $1 
     ORDER BY q.due_date ASC`,
    [courseId]
  );
  return result.rows;
};

const findQuizById = async (id) => {
  const result = await query(
    `SELECT q.*, c.title as course_title, u.name as creator_name, u.role as creator_role,
     COALESCE((SELECT COUNT(*)::INTEGER FROM quiz_questions WHERE quiz_id = q.id), 0) as question_count
     FROM quizzes q
     LEFT JOIN courses c ON q.course_id = c.id
     LEFT JOIN users u ON q.created_by = u.id
     WHERE q.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const createQuiz = async (quizData) => {
  const {
    course_id, title, description, instructions, quiz_type, time_limit_minutes,
    total_marks, passing_marks, allow_retake, max_attempts, show_results_immediately,
    show_correct_answers, randomize_questions, randomize_options, is_published,
    start_date, due_date, created_by
  } = quizData;

  const result = await query(
    `INSERT INTO quizzes (
      course_id, title, description, instructions, quiz_type, time_limit_minutes,
      total_marks, passing_marks, allow_retake, max_attempts, show_results_immediately,
      show_correct_answers, randomize_questions, randomize_options, is_published,
      start_date, due_date, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
    RETURNING *`,
    [
      course_id, title, description, instructions, quiz_type || 'test', time_limit_minutes,
      total_marks || 100, passing_marks || 40, allow_retake !== false, max_attempts || 1,
      show_results_immediately !== false, show_correct_answers || false,
      randomize_questions || false, randomize_options || false, is_published !== false,
      start_date, due_date, created_by
    ]
  );
  return result.rows[0];
};

const updateQuizById = async (id, data) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  const allowedFields = [
    'title', 'description', 'instructions', 'quiz_type', 'time_limit_minutes',
    'total_marks', 'passing_marks', 'allow_retake', 'max_attempts',
    'show_results_immediately', 'show_correct_answers', 'randomize_questions',
    'randomize_options', 'is_published', 'start_date', 'due_date'
  ];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${paramCount}`);
      values.push(data[field]);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE quizzes SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
};

const deleteQuizById = async (id) => {
  await query('DELETE FROM quizzes WHERE id = $1', [id]);
};

// ==================== QUESTION MANAGEMENT ====================

const addQuestion = async (questionData) => {
  const { quiz_id, question_text, question_type, marks, order_index, explanation, options } = questionData;

  // Insert question
  const questionResult = await query(
    `INSERT INTO quiz_questions (quiz_id, question_text, question_type, marks, order_index, explanation) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [quiz_id, question_text, question_type || 'multiple_choice', marks || 1, order_index || 0, explanation]
  );

  const question = questionResult.rows[0];

  // Insert options if provided
  if (options && options.length > 0) {
    for (let i = 0; i < options.length; i++) {
      await query(
        `INSERT INTO quiz_options (question_id, option_text, is_correct, order_index) 
         VALUES ($1, $2, $3, $4)`,
        [question.id, options[i].option_text, options[i].is_correct || false, i]
      );
    }
  }

  return question;
};

const getQuizQuestions = async (quizId, includeAnswers = false) => {
  let questionQuery = `
    SELECT qq.*, 
    (SELECT json_agg(json_build_object(
      'id', qo.id, 
      'option_text', qo.option_text, 
      'order_index', qo.order_index
      ${includeAnswers ? ", 'is_correct', qo.is_correct" : ''}
    ) ORDER BY qo.order_index) 
    FROM quiz_options qo WHERE qo.question_id = qq.id) as options
    FROM quiz_questions qq
    WHERE qq.quiz_id = $1
    ORDER BY qq.order_index
  `;

  const result = await query(questionQuery, [quizId]);
  return result.rows;
};

const updateQuestion = async (questionId, data) => {
  const { question_text, question_type, marks, order_index, explanation } = data;

  const result = await query(
    `UPDATE quiz_questions SET 
     question_text = COALESCE($1, question_text),
     question_type = COALESCE($2, question_type),
     marks = COALESCE($3, marks),
     order_index = COALESCE($4, order_index),
     explanation = COALESCE($5, explanation),
     updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [question_text, question_type, marks, order_index, explanation, questionId]
  );

  return result.rows[0];
};

const deleteQuestion = async (questionId) => {
  await query('DELETE FROM quiz_questions WHERE id = $1', [questionId]);
};

const updateQuestionOptions = async (questionId, options) => {
  // Delete existing options
  await query('DELETE FROM quiz_options WHERE question_id = $1', [questionId]);

  // Insert new options
  if (options && options.length > 0) {
    for (let i = 0; i < options.length; i++) {
      await query(
        `INSERT INTO quiz_options (question_id, option_text, is_correct, order_index) 
         VALUES ($1, $2, $3, $4)`,
        [questionId, options[i].option_text, options[i].is_correct || false, i]
      );
    }
  }
};

// ==================== QUIZ ASSIGNMENT ====================

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
    `SELECT qa.*, u.name, u.email, u.avatar_url as profile_photo,
     (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = qa.quiz_id AND student_id = qa.student_id) as attempt_count,
     (SELECT status FROM quiz_attempts WHERE quiz_id = qa.quiz_id AND student_id = qa.student_id ORDER BY attempt_number DESC LIMIT 1) as latest_status,
     (SELECT score FROM quiz_attempts WHERE quiz_id = qa.quiz_id AND student_id = qa.student_id ORDER BY attempt_number DESC LIMIT 1) as latest_score,
     (SELECT percentage FROM quiz_attempts WHERE quiz_id = qa.quiz_id AND student_id = qa.student_id ORDER BY attempt_number DESC LIMIT 1) as latest_percentage
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

// ==================== STUDENT QUIZ ACCESS ====================

const getStudentQuizzes = async (studentId) => {
  const result = await query(
    `SELECT q.*, c.title as course_title, qa.assigned_at, qa.is_completed,
     (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1) as my_attempts,
     (SELECT score FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1 ORDER BY attempt_number DESC LIMIT 1) as my_score,
     (SELECT percentage FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1 ORDER BY attempt_number DESC LIMIT 1) as my_percentage,
     (SELECT status FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1 ORDER BY attempt_number DESC LIMIT 1) as my_status,
     (SELECT is_passed FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1 ORDER BY attempt_number DESC LIMIT 1) as my_passed,
     (SELECT submitted_at FROM quiz_attempts WHERE quiz_id = q.id AND student_id = $1 ORDER BY attempt_number DESC LIMIT 1) as last_submitted_at
     FROM quiz_assignments qa
     JOIN quizzes q ON qa.quiz_id = q.id
     JOIN courses c ON q.course_id = c.id
     WHERE qa.student_id = $1 AND q.is_published = TRUE
     ORDER BY q.due_date ASC`,
    [studentId]
  );
  return result.rows;
};

// ==================== QUIZ ATTEMPTS ====================

const startQuizAttempt = async (quizId, studentId) => {
  // Check if student is assigned to this quiz
  const assignmentCheck = await query(
    'SELECT * FROM quiz_assignments WHERE quiz_id = $1 AND student_id = $2',
    [quizId, studentId]
  );
  
  if (assignmentCheck.rows.length === 0) {
    throw new Error('You are not assigned to this quiz');
  }

  // Get quiz details
  const quiz = await findQuizById(quizId);
  
  // Check if quiz has started
  if (quiz.start_date && new Date(quiz.start_date) > new Date()) {
    throw new Error('This quiz has not started yet');
  }

  // Check existing attempts
  const existingAttempts = await query(
    'SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2 ORDER BY attempt_number DESC',
    [quizId, studentId]
  );

  // Check if there's an in-progress attempt
  const inProgressAttempt = existingAttempts.rows.find(a => a.status === 'in_progress');
  if (inProgressAttempt) {
    return inProgressAttempt; // Return existing in-progress attempt
  }

  // Check if maximum attempts reached
  if (existingAttempts.rows.length >= quiz.max_attempts) {
    if (!quiz.allow_retake) {
      throw new Error('Maximum attempts reached for this quiz');
    }
  }

  // Create new attempt
  const attemptNumber = existingAttempts.rows.length + 1;
  const result = await query(
    `INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, status, started_at) 
     VALUES ($1, $2, $3, 'in_progress', NOW()) RETURNING *`,
    [quizId, studentId, attemptNumber]
  );

  return result.rows[0];
};

const saveQuizResponse = async (attemptId, questionId, responseData) => {
  const { selected_option_id, answer_text } = responseData;

  // Check if this is a multiple choice question and evaluate correctness
  let isCorrect = null;
  if (selected_option_id) {
    const optionResult = await query(
      'SELECT is_correct FROM quiz_options WHERE id = $1',
      [selected_option_id]
    );
    if (optionResult.rows.length > 0) {
      isCorrect = optionResult.rows[0].is_correct;
    }
  }

  const result = await query(
    `INSERT INTO quiz_responses (attempt_id, question_id, selected_option_id, answer_text, is_correct) 
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (attempt_id, question_id) 
     DO UPDATE SET 
       selected_option_id = EXCLUDED.selected_option_id,
       answer_text = EXCLUDED.answer_text,
       is_correct = EXCLUDED.is_correct,
       updated_at = NOW()
     RETURNING *`,
    [attemptId, questionId, selected_option_id, answer_text, isCorrect]
  );

  return result.rows[0];
};

const submitQuizAttempt = async (attemptId, isAutoSubmit = false) => {
  // Get attempt details
  const attemptResult = await query('SELECT * FROM quiz_attempts WHERE id = $1', [attemptId]);
  const attempt = attemptResult.rows[0];

  if (!attempt) {
    throw new Error('Attempt not found');
  }

  if (attempt.status !== 'in_progress') {
    throw new Error('This attempt has already been submitted');
  }

  // Calculate time taken
  const startedAt = new Date(attempt.started_at);
  const submittedAt = new Date();
  const timeTakenMinutes = Math.round((submittedAt - startedAt) / 60000);

  // Get quiz details
  const quiz = await findQuizById(attempt.quiz_id);

  // Check if late
  const isLate = quiz.due_date && submittedAt > new Date(quiz.due_date);

  // Calculate score for objective questions
  const responsesResult = await query(
    `SELECT qr.*, qq.marks, qq.question_type
     FROM quiz_responses qr
     JOIN quiz_questions qq ON qr.question_id = qq.id
     WHERE qr.attempt_id = $1`,
    [attemptId]
  );

  let totalScore = 0;
  let needsManualGrading = false;

  for (const response of responsesResult.rows) {
    if (response.question_type === 'multiple_choice' || response.question_type === 'true_false') {
      // Auto-graded
      if (response.is_correct) {
        totalScore += parseFloat(response.marks);
        await query(
          'UPDATE quiz_responses SET marks_obtained = $1 WHERE id = $2',
          [response.marks, response.id]
        );
      } else {
        await query(
          'UPDATE quiz_responses SET marks_obtained = 0 WHERE id = $2',
          [response.id]
        );
      }
    } else {
      // Needs manual grading
      needsManualGrading = true;
    }
  }

  // Update attempt
  const status = needsManualGrading ? 'submitted' : 'graded';
  const statusType = isAutoSubmit ? 'auto_submitted' : status;

  const result = await query(
    `UPDATE quiz_attempts SET 
     status = $1, submitted_at = NOW(), time_taken_minutes = $2, 
     score = $3, is_late = $4, updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [statusType, timeTakenMinutes, needsManualGrading ? null : totalScore, isLate, attemptId]
  );

  return result.rows[0];
};

const getQuizAttempt = async (attemptId, includeResponses = false) => {
  const attemptResult = await query(
    `SELECT qa.*, q.title as quiz_title, q.total_marks, q.passing_marks, 
     q.show_results_immediately, q.show_correct_answers,
     u.name as student_name, u.email as student_email
     FROM quiz_attempts qa
     JOIN quizzes q ON qa.quiz_id = q.id
     JOIN users u ON qa.student_id = u.id
     WHERE qa.id = $1`,
    [attemptId]
  );

  const attempt = attemptResult.rows[0];

  if (!attempt) {
    return null;
  }

  if (includeResponses) {
    const responsesResult = await query(
      `SELECT qr.*, qq.question_text, qq.question_type, qq.marks as question_marks, qq.explanation,
       qo.option_text as selected_option_text, qo.is_correct as selected_option_correct,
       (SELECT json_agg(json_build_object(
         'id', o.id, 
         'option_text', o.option_text, 
         'is_correct', o.is_correct,
         'order_index', o.order_index
       ) ORDER BY o.order_index) 
       FROM quiz_options o WHERE o.question_id = qq.id) as all_options
       FROM quiz_responses qr
       JOIN quiz_questions qq ON qr.question_id = qq.id
       LEFT JOIN quiz_options qo ON qr.selected_option_id = qo.id
       WHERE qr.attempt_id = $1
       ORDER BY qq.order_index`,
      [attemptId]
    );

    attempt.responses = responsesResult.rows;
  }

  return attempt;
};

const getStudentAttempts = async (quizId, studentId) => {
  const result = await query(
    `SELECT qa.* FROM quiz_attempts qa
     WHERE qa.quiz_id = $1 AND qa.student_id = $2
     ORDER BY qa.attempt_number DESC`,
    [quizId, studentId]
  );
  return result.rows;
};

const getAllStudentAttempts = async (studentId) => {
  const result = await query(
    `SELECT qa.*, q.title as quiz_title, c.title as course_title, c.id as course_id
     FROM quiz_attempts qa
     JOIN quizzes q ON qa.quiz_id = q.id
     JOIN courses c ON q.course_id = c.id
     WHERE qa.student_id = $1 AND qa.status IN ('submitted', 'graded', 'auto_submitted')
     ORDER BY qa.completed_at DESC NULLS LAST, qa.created_at DESC`,
    [studentId]
  );
  return result.rows;
};

const getAllQuizAttempts = async (quizId) => {
  const result = await query(
    `SELECT qa.*, u.name as student_name, u.email as student_email, u.avatar_url as profile_photo
     FROM quiz_attempts qa
     JOIN users u ON qa.student_id = u.id
     WHERE qa.quiz_id = $1 AND qa.status IN ('submitted', 'graded', 'auto_submitted')
     ORDER BY qa.submitted_at DESC`,
    [quizId]
  );
  return result.rows;
};

// ==================== MANUAL GRADING ====================

const gradeQuizAttempt = async (attemptId, gradingData, instructorId) => {
  const { responses, overall_feedback } = gradingData;

  // Update individual responses with manual scores
  let totalScore = 0;
  for (const response of responses) {
    await query(
      `UPDATE quiz_responses SET 
       marks_obtained = $1, instructor_feedback = $2, updated_at = NOW()
       WHERE id = $3`,
      [response.marks_obtained, response.instructor_feedback, response.id]
    );
    totalScore += parseFloat(response.marks_obtained || 0);
  }

  // Update attempt with total score and grading info
  const result = await query(
    `UPDATE quiz_attempts SET 
     score = $1, status = 'graded', feedback = $2, 
     graded_by = $3, graded_at = NOW(), updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [totalScore, overall_feedback, instructorId, attemptId]
  );

  return result.rows[0];
};

// ==================== STATISTICS ====================

const getQuizStatistics = async (quizId) => {
  const result = await query(
    `SELECT 
     COUNT(DISTINCT qa.student_id) as total_assigned,
     COUNT(DISTINCT CASE WHEN qat.status IN ('submitted', 'graded', 'auto_submitted') THEN qat.student_id END) as total_completed,
     COUNT(CASE WHEN qat.status = 'graded' THEN 1 END) as total_graded,
     COUNT(CASE WHEN qat.status IN ('submitted', 'auto_submitted') THEN 1 END) as pending_grading,
     AVG(CASE WHEN qat.status = 'graded' THEN qat.score END) as avg_score,
     MAX(qat.score) as highest_score,
     MIN(CASE WHEN qat.status = 'graded' THEN qat.score END) as lowest_score,
     COUNT(CASE WHEN qat.is_late = true THEN 1 END) as late_submissions,
     COUNT(CASE WHEN qat.is_passed = true THEN 1 END) as passed_count,
     COUNT(CASE WHEN qat.is_passed = false THEN 1 END) as failed_count,
     AVG(CASE WHEN qat.status IN ('submitted', 'graded', 'auto_submitted') THEN qat.time_taken_minutes END) as avg_time_taken
     FROM quiz_assignments qa
     LEFT JOIN quiz_attempts qat ON qa.quiz_id = qat.quiz_id AND qa.student_id = qat.student_id
     WHERE qa.quiz_id = $1`,
    [quizId]
  );

  const stats = result.rows[0];

  // Calculate completion rate
  if (stats.total_assigned > 0) {
    stats.completion_rate = Math.round((stats.total_completed / stats.total_assigned) * 100);
  } else {
    stats.completion_rate = 0;
  }

  return stats;
};

module.exports = {
  findAllQuizzes,
  findQuizzesByCourse,
  findQuizById,
  createQuiz,
  updateQuizById,
  deleteQuizById,
  addQuestion,
  getQuizQuestions,
  updateQuestion,
  deleteQuestion,
  updateQuestionOptions,
  assignQuizToStudents,
  assignQuizToAllEnrolled,
  getQuizAssignments,
  removeQuizAssignment,
  getStudentQuizzes,
  startQuizAttempt,
  saveQuizResponse,
  submitQuizAttempt,
  getQuizAttempt,
  getStudentAttempts,
  getAllStudentAttempts,
  getAllQuizAttempts,
  gradeQuizAttempt,
  getQuizStatistics,
};
