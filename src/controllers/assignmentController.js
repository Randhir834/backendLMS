const {
  findAssignmentsByCourse, findAllAssignments, findAssignmentById, createAssignment, updateAssignmentById, deleteAssignmentById,
  assignAssignmentToStudents, assignAssignmentToAllEnrolled, getAssignmentAssignments, removeAssignmentAssignment,
  submitAssignment, findSubmissionsByAssignment, findSubmissionsByStudent, getStudentAssignments, gradeSubmission,
  getAssignmentStatistics,
} = require('../services/assignmentService');

const getAssignments = async (req, res, next) => {
  try {
    const { course_id } = req.query;
    let assignments;
    
    if (course_id) {
      assignments = await findAssignmentsByCourse(course_id);
    } else if (req.user.role === 'admin') {
      assignments = await findAllAssignments();
    } else if (req.user.role === 'instructor') {
      // Get assignments created by this instructor
      const { query } = require('../config/database');
      const result = await query(
        `SELECT a.*, c.title as course_title,
         (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count,
         (SELECT COUNT(DISTINCT student_id) FROM assignment_submissions WHERE assignment_id = a.id) as student_count
         FROM assignments a
         LEFT JOIN courses c ON a.course_id = c.id
         WHERE a.created_by = $1
         ORDER BY a.created_at DESC`,
        [req.user.id]
      );
      assignments = result.rows;
    } else {
      assignments = await getStudentAssignments(req.user.id);
    }
    
    res.json({ assignments });
  } catch (error) { next(error); }
};

const getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await findAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ assignment });
  } catch (error) { next(error); }
};

const createAssignmentController = async (req, res, next) => {
  try {
    const assignmentData = {
      ...req.body,
      created_by: req.user.id
    };
    const assignment = await createAssignment(assignmentData);
    
    // Handle student assignments
    if (req.body.assign_to_all) {
      await assignAssignmentToAllEnrolled(assignment.id, assignment.course_id);
    } else if (req.body.student_ids && req.body.student_ids.length > 0) {
      await assignAssignmentToStudents(assignment.id, req.body.student_ids);
    }
    
    res.status(201).json({ message: 'Assignment created successfully', assignment });
  } catch (error) { next(error); }
};

const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await updateAssignmentById(req.params.id, req.body);
    res.json({ message: 'Assignment updated successfully', assignment });
  } catch (error) { next(error); }
};

const deleteAssignment = async (req, res, next) => {
  try {
    await deleteAssignmentById(req.params.id);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) { next(error); }
};

const submitAssignmentController = async (req, res, next) => {
  try {
    const submission = await submitAssignment({ ...req.body, student_id: req.user.id });
    res.status(201).json({ message: 'Assignment submitted successfully', submission });
  } catch (error) { next(error); }
};

const getSubmissions = async (req, res, next) => {
  try {
    const submissions = await findSubmissionsByAssignment(req.params.id);
    res.json({ submissions });
  } catch (error) { next(error); }
};

const getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await findSubmissionsByStudent(req.user.id);
    res.json({ submissions });
  } catch (error) { next(error); }
};

const gradeSubmissionController = async (req, res, next) => {
  try {
    const submission = await gradeSubmission(req.params.submissionId, req.body);
    res.json({ message: 'Submission graded successfully', submission });
  } catch (error) { next(error); }
};

// New controller functions
const assignStudents = async (req, res, next) => {
  try {
    const { assignment_id } = req.params;
    const { student_ids, assign_to_all } = req.body;
    
    const assignment = await findAssignmentById(assignment_id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    
    if (assign_to_all) {
      await assignAssignmentToAllEnrolled(assignment_id, assignment.course_id);
      res.json({ message: 'Assignment assigned to all enrolled students' });
    } else if (student_ids && student_ids.length > 0) {
      await assignAssignmentToStudents(assignment_id, student_ids);
      res.json({ message: 'Assignment assigned to selected students' });
    } else {
      res.status(400).json({ error: 'No students specified' });
    }
  } catch (error) { next(error); }
};

const getAssignedStudents = async (req, res, next) => {
  try {
    const assignments = await getAssignmentAssignments(req.params.assignment_id);
    res.json({ assignments });
  } catch (error) { next(error); }
};

const removeAssignment = async (req, res, next) => {
  try {
    await removeAssignmentAssignment(req.params.assignment_id, req.params.student_id);
    res.json({ message: 'Assignment removed successfully' });
  } catch (error) { next(error); }
};

const getStatistics = async (req, res, next) => {
  try {
    const statistics = await getAssignmentStatistics(req.params.assignment_id);
    res.json({ statistics });
  } catch (error) { next(error); }
};

module.exports = {
  getAssignments, getAssignmentById, createAssignmentController, updateAssignment, deleteAssignment,
  submitAssignmentController, getSubmissions, getMySubmissions, gradeSubmissionController,
  assignStudents, getAssignedStudents, removeAssignment, getStatistics,
};
