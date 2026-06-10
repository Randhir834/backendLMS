const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { upload, uploadToSupabase } = require('../services/storageService');
const {
  getAssignments, getAssignmentById, createAssignmentController, updateAssignment, deleteAssignment,
  submitAssignmentController, getSubmissions, getMySubmissions, gradeSubmissionController,
  assignStudents, getAssignedStudents, removeAssignment, getStatistics,
} = require('../controllers/assignmentController');

const router = express.Router();

// Assignment CRUD
router.get('/', authenticate, getAssignments);
router.get('/my-submissions', authenticate, authorizeRoles('student'), getMySubmissions);
router.get('/:id', authenticate, getAssignmentById);
router.post('/', authenticate, authorizeRoles('instructor', 'admin'), createAssignmentController);
router.put('/:id', authenticate, authorizeRoles('instructor', 'admin'), updateAssignment);
router.delete('/:id', authenticate, authorizeRoles('instructor', 'admin'), deleteAssignment);

// Student assignment
router.post('/:assignment_id/assign', authenticate, authorizeRoles('instructor', 'admin'), assignStudents);
router.get('/:assignment_id/assignments', authenticate, authorizeRoles('instructor', 'admin'), getAssignedStudents);
router.delete('/:assignment_id/assignments/:student_id', authenticate, authorizeRoles('instructor', 'admin'), removeAssignment);

// Submission
router.post('/:id/submit', authenticate, authorizeRoles('student'), upload.single('file'), async (req, res, next) => {
  try {
    let file_url = req.body.file_url;
    let file_name = req.body.file_name;
    let file_size = req.body.file_size;
    let file_type = req.body.file_type;
    
    if (req.file) {
      const result = await uploadToSupabase(req.file, 'assignments');
      file_url = result.publicUrl;
      file_name = req.file.originalname;
      file_size = req.file.size;
      file_type = req.file.mimetype;
    }
    
    req.body.file_url = file_url;
    req.body.file_name = file_name;
    req.body.file_size = file_size;
    req.body.file_type = file_type;
    submitAssignmentController(req, res, next);
  } catch (error) { next(error); }
});

router.get('/:id/submissions', authenticate, authorizeRoles('instructor', 'admin'), getSubmissions);
router.put('/:id/submissions/:submissionId/grade', authenticate, authorizeRoles('instructor', 'admin'), gradeSubmissionController);

// Statistics
router.get('/:assignment_id/statistics', authenticate, authorizeRoles('instructor', 'admin'), getStatistics);

module.exports = router;
