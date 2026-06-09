const quizService = require('../services/quizService');
const { EVENTS, emitToAll, emitToUser, notifyDashboardUpdate } = require('../services/realtimeService');

// ==================== QUIZ CRUD ====================

const getQuizzes = async (req, res, next) => {
  try {
    const { course_id } = req.query;
    let quizzes;
    
    if (course_id) {
      quizzes = await quizService.findQuizzesByCourse(course_id);
    } else if (req.user.role === 'admin') {
      quizzes = await quizService.findAllQuizzes();
    } else if (req.user.role === 'instructor') {
      // Get quizzes created by this instructor
      const { query } = require('../config/database');
      const result = await query(
        `SELECT q.*, c.title as course_title,
         COALESCE((SELECT COUNT(*)::INTEGER FROM quiz_attempts WHERE quiz_id = q.id), 0) as attempt_count,
         COALESCE((SELECT COUNT(DISTINCT student_id)::INTEGER FROM quiz_attempts WHERE quiz_id = q.id), 0) as student_count,
         COALESCE((SELECT COUNT(*)::INTEGER FROM quiz_questions WHERE quiz_id = q.id), 0) as question_count
         FROM quizzes q
         LEFT JOIN courses c ON q.course_id = c.id
         WHERE q.created_by = $1
         ORDER BY q.created_at DESC`,
        [req.user.id]
      );
      quizzes = result.rows;
    } else {
      quizzes = await quizService.getStudentQuizzes(req.user.id);
    }
    
    res.json({ quizzes });
  } catch (error) {
    next(error);
  }
};

const getQuizById = async (req, res, next) => {
  try {
    const quiz = await quizService.findQuizById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json({ quiz });
  } catch (error) {
    next(error);
  }
};

const createQuizController = async (req, res, next) => {
  try {
    const quizData = {
      ...req.body,
      created_by: req.user.id
    };
    const quiz = await quizService.createQuiz(quizData);
    
    // Handle student assignments
    if (req.body.assign_to_all) {
      await quizService.assignQuizToAllEnrolled(quiz.id, quiz.course_id);
    } else if (req.body.student_ids && req.body.student_ids.length > 0) {
      await quizService.assignQuizToStudents(quiz.id, req.body.student_ids);
    }
    
    // Emit real-time event
    emitToAll(EVENTS.QUIZ_CREATED, quiz);
    notifyDashboardUpdate();
    
    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (error) {
    next(error);
  }
};

const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await quizService.updateQuizById(req.params.id, req.body);
    
    // Emit real-time event
    emitToAll(EVENTS.QUIZ_UPDATED, quiz);
    notifyDashboardUpdate();
    
    res.json({ message: 'Quiz updated successfully', quiz });
  } catch (error) {
    next(error);
  }
};

const deleteQuiz = async (req, res, next) => {
  try {
    await quizService.deleteQuizById(req.params.id);
    
    // Emit real-time event
    emitToAll(EVENTS.QUIZ_DELETED, { id: req.params.id });
    notifyDashboardUpdate();
    
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== QUESTION MANAGEMENT ====================

const addQuestionController = async (req, res, next) => {
  try {
    const question = await quizService.addQuestion({
      quiz_id: req.params.id,
      ...req.body
    });
    res.status(201).json({ message: 'Question added successfully', question });
  } catch (error) {
    next(error);
  }
};

const getQuestions = async (req, res, next) => {
  try {
    const includeAnswers = req.query.include_answers === 'true';
    const questions = await quizService.getQuizQuestions(req.params.id, includeAnswers);
    res.json({ questions });
  } catch (error) {
    next(error);
  }
};

const updateQuestionController = async (req, res, next) => {
  try {
    const question = await quizService.updateQuestion(req.params.questionId, req.body);
    
    // Update options if provided
    if (req.body.options) {
      await quizService.updateQuestionOptions(req.params.questionId, req.body.options);
    }
    
    res.json({ message: 'Question updated successfully', question });
  } catch (error) {
    next(error);
  }
};

const deleteQuestionController = async (req, res, next) => {
  try {
    await quizService.deleteQuestion(req.params.questionId);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== QUIZ ASSIGNMENT ====================

const assignStudents = async (req, res, next) => {
  try {
    const { quiz_id } = req.params;
    const { student_ids, assign_to_all } = req.body;
    
    const quiz = await quizService.findQuizById(quiz_id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    if (assign_to_all) {
      await quizService.assignQuizToAllEnrolled(quiz_id, quiz.course_id);
      res.json({ message: 'Quiz assigned to all enrolled students' });
    } else if (student_ids && student_ids.length > 0) {
      await quizService.assignQuizToStudents(quiz_id, student_ids);
      res.json({ message: 'Quiz assigned to selected students' });
    } else {
      res.status(400).json({ error: 'No students specified' });
    }
  } catch (error) {
    next(error);
  }
};

const getAssignedStudents = async (req, res, next) => {
  try {
    const assignments = await quizService.getQuizAssignments(req.params.quiz_id);
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
};

const removeAssignment = async (req, res, next) => {
  try {
    await quizService.removeQuizAssignment(req.params.quiz_id, req.params.student_id);
    res.json({ message: 'Quiz assignment removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ==================== QUIZ ATTEMPTS (STUDENT) ====================

const startAttempt = async (req, res, next) => {
  try {
    const attempt = await quizService.startQuizAttempt(req.params.id, req.user.id);
    
    // Get questions for the attempt (without answers)
    const questions = await quizService.getQuizQuestions(req.params.id, false);
    
    res.json({ 
      message: 'Quiz attempt started successfully', 
      attempt,
      questions 
    });
  } catch (error) {
    next(error);
  }
};

const saveResponse = async (req, res, next) => {
  try {
    const response = await quizService.saveQuizResponse(
      req.params.attemptId,
      req.body.question_id,
      req.body
    );
    res.json({ message: 'Response saved successfully', response });
  } catch (error) {
    next(error);
  }
};

const submitAttempt = async (req, res, next) => {
  try {
    const isAutoSubmit = req.body.auto_submit === true;
    const attempt = await quizService.submitQuizAttempt(req.params.attemptId, isAutoSubmit);
    
    // Emit real-time event
    emitToAll(EVENTS.QUIZ_SUBMITTED, attempt);
    notifyDashboardUpdate();
    
    res.json({ message: 'Quiz submitted successfully', attempt });
  } catch (error) {
    next(error);
  }
};

const getAttempt = async (req, res, next) => {
  try {
    const includeResponses = req.query.include_responses === 'true';
    const attempt = await quizService.getQuizAttempt(req.params.attemptId, includeResponses);
    
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    
    res.json({ attempt });
  } catch (error) {
    next(error);
  }
};

const getMyAttempts = async (req, res, next) => {
  try {
    // This route is for getting all attempts for the current student across all quizzes
    const attempts = await quizService.getAllStudentAttempts(req.user.id);
    res.json({ attempts });
  } catch (error) {
    next(error);
  }
};

const getMyQuizAttempts = async (req, res, next) => {
  try {
    // This route is for getting attempts for a specific quiz
    const attempts = await quizService.getStudentAttempts(req.params.id, req.user.id);
    res.json({ attempts });
  } catch (error) {
    next(error);
  }
};

// ==================== GRADING (INSTRUCTOR/ADMIN) ====================

const getAllAttempts = async (req, res, next) => {
  try {
    const attempts = await quizService.getAllQuizAttempts(req.params.id);
    res.json({ attempts });
  } catch (error) {
    next(error);
  }
};

const gradeAttempt = async (req, res, next) => {
  try {
    const attempt = await quizService.gradeQuizAttempt(
      req.params.attemptId,
      req.body,
      req.user.id
    );
    
    // Emit real-time event
    emitToAll(EVENTS.QUIZ_GRADED, attempt);
    if (attempt.student_id) {
      emitToUser(attempt.student_id, EVENTS.QUIZ_GRADED, attempt);
    }
    notifyDashboardUpdate();
    
    res.json({ message: 'Quiz attempt graded successfully', attempt });
  } catch (error) {
    next(error);
  }
};

// ==================== STATISTICS ====================

const getStatistics = async (req, res, next) => {
  try {
    const statistics = await quizService.getQuizStatistics(req.params.quiz_id);
    res.json({ statistics });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuizzes,
  getQuizById,
  createQuizController,
  updateQuiz,
  deleteQuiz,
  addQuestionController,
  getQuestions,
  updateQuestionController,
  deleteQuestionController,
  assignStudents,
  getAssignedStudents,
  removeAssignment,
  startAttempt,
  saveResponse,
  submitAttempt,
  getAttempt,
  getMyAttempts,
  getMyQuizAttempts,
  getAllAttempts,
  gradeAttempt,
  getStatistics,
};
