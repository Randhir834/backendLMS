const {
  findQuizzesByCourse, findAllQuizzes, findQuizById, createQuiz, updateQuizById, deleteQuizById,
  findQuestionsByQuiz, createQuestion, updateQuestionById, deleteQuestionById,
  assignQuizToStudents, assignQuizToAllEnrolled, getQuizAssignments, removeQuizAssignment,
  startAttempt, submitAnswer, completeAttempt, 
  findAttemptsByStudent, findAttemptsByQuiz, findAttemptById, findAnswersByAttempt,
  getQuizStatistics, getStudentQuizzes,
} = require('../services/quizService');

const getQuizzes = async (req, res, next) => {
  try {
    const { course_id } = req.query;
    let quizzes;
    
    if (course_id) {
      quizzes = await findQuizzesByCourse(course_id);
    } else if (req.user.role === 'admin') {
      quizzes = await findAllQuizzes();
    } else if (req.user.role === 'instructor') {
      // Get quizzes created by this instructor
      const { query } = require('../config/database');
      const result = await query(
        `SELECT q.*, c.title as course_title,
         (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count,
         (SELECT COUNT(DISTINCT student_id) FROM quiz_attempts WHERE quiz_id = q.id) as attempt_count
         FROM quizzes q
         LEFT JOIN courses c ON q.course_id = c.id
         WHERE q.created_by = $1
         ORDER BY q.created_at DESC`,
        [req.user.id]
      );
      quizzes = result.rows;
    } else {
      quizzes = await getStudentQuizzes(req.user.id);
    }
    
    res.json({ quizzes });
  } catch (error) { next(error); }
};

const getQuizById = async (req, res, next) => {
  try {
    const quiz = await findQuizById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
    let questions = await findQuestionsByQuiz(req.params.id);
    
    // Hide correct answers for students unless quiz is completed or show_correct_answers is true
    if (req.user.role === 'student') {
      const attempts = await findAttemptsByStudent(req.user.id);
      const hasCompleted = attempts.some(a => a.quiz_id === parseInt(req.params.id) && a.status === 'completed');
      
      if (!hasCompleted || !quiz.show_correct_answers) {
        questions = questions.map(q => {
          const { correct_option, ...rest } = q;
          return rest;
        });
      }
    }
    
    res.json({ quiz, questions });
  } catch (error) { next(error); }
};

const createQuizController = async (req, res, next) => {
  try {
    const quizData = {
      ...req.body,
      created_by: req.user.id
    };
    const quiz = await createQuiz(quizData);
    
    // Handle student assignments
    if (req.body.assign_to_all) {
      await assignQuizToAllEnrolled(quiz.id, quiz.course_id);
    } else if (req.body.student_ids && req.body.student_ids.length > 0) {
      await assignQuizToStudents(quiz.id, req.body.student_ids);
    }
    
    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (error) { next(error); }
};

const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await updateQuizById(req.params.id, req.body);
    res.json({ message: 'Quiz updated successfully', quiz });
  } catch (error) { next(error); }
};

const deleteQuiz = async (req, res, next) => {
  try {
    await deleteQuizById(req.params.id);
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) { next(error); }
};

const addQuestion = async (req, res, next) => {
  try {
    const question = await createQuestion({ ...req.body, quiz_id: req.params.id });
    res.status(201).json({ message: 'Question added successfully', question });
  } catch (error) { next(error); }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await updateQuestionById(req.params.questionId, req.body);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question updated successfully', question });
  } catch (error) { next(error); }
};

const deleteQuestion = async (req, res, next) => {
  try {
    await deleteQuestionById(req.params.questionId);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) { next(error); }
};

const startQuizAttempt = async (req, res, next) => {
  try {
    const attempt = await startAttempt({ quiz_id: req.params.id, student_id: req.user.id });
    res.status(201).json({ message: 'Quiz attempt started', attempt });
  } catch (error) { next(error); }
};

const submitQuizAnswer = async (req, res, next) => {
  try {
    const answer = await submitAnswer({ attempt_id: req.params.attemptId, ...req.body });
    res.status(201).json({ message: 'Answer submitted', answer });
  } catch (error) { next(error); }
};

const completeQuizAttempt = async (req, res, next) => {
  try {
    const attempt = await completeAttempt(req.params.attemptId, req.body);
    res.json({ message: 'Quiz attempt completed', attempt });
  } catch (error) { next(error); }
};

const getMyAttempts = async (req, res, next) => {
  try {
    const attempts = await findAttemptsByStudent(req.user.id);
    res.json({ attempts });
  } catch (error) { next(error); }
};

const getAttemptDetails = async (req, res, next) => {
  try {
    const attempt = await findAttemptById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    const answers = await findAnswersByAttempt(req.params.attemptId);
    res.json({ attempt, answers });
  } catch (error) { next(error); }
};

// New controller functions
const assignStudents = async (req, res, next) => {
  try {
    const { quiz_id } = req.params;
    const { student_ids, assign_to_all } = req.body;
    
    const quiz = await findQuizById(quiz_id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    
    if (assign_to_all) {
      await assignQuizToAllEnrolled(quiz_id, quiz.course_id);
      res.json({ message: 'Quiz assigned to all enrolled students' });
    } else if (student_ids && student_ids.length > 0) {
      await assignQuizToStudents(quiz_id, student_ids);
      res.json({ message: 'Quiz assigned to selected students' });
    } else {
      res.status(400).json({ error: 'No students specified' });
    }
  } catch (error) { next(error); }
};

const getAssignedStudents = async (req, res, next) => {
  try {
    const assignments = await getQuizAssignments(req.params.quiz_id);
    res.json({ assignments });
  } catch (error) { next(error); }
};

const removeAssignment = async (req, res, next) => {
  try {
    await removeQuizAssignment(req.params.quiz_id, req.params.student_id);
    res.json({ message: 'Assignment removed successfully' });
  } catch (error) { next(error); }
};

const getQuizAttempts = async (req, res, next) => {
  try {
    const attempts = await findAttemptsByQuiz(req.params.quiz_id);
    res.json({ attempts });
  } catch (error) { next(error); }
};

const getStatistics = async (req, res, next) => {
  try {
    const statistics = await getQuizStatistics(req.params.quiz_id);
    res.json({ statistics });
  } catch (error) { next(error); }
};

module.exports = {
  getQuizzes, getQuizById, createQuizController, updateQuiz, deleteQuiz,
  addQuestion, updateQuestion, deleteQuestion,
  assignStudents, getAssignedStudents, removeAssignment,
  startQuizAttempt, submitQuizAnswer, completeQuizAttempt, 
  getMyAttempts, getQuizAttempts, getAttemptDetails, getStatistics,
};
