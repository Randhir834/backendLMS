const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { 
  getLiveClasses, 
  getLiveClassById, 
  createLiveClassController, 
  updateLiveClass, 
  deleteLiveClass,
  getCoursesWithLiveClasses 
} = require('../controllers/liveClassController');

const router = express.Router();

router.get('/', authenticate, getLiveClasses);
router.get('/courses-with-classes', authenticate, getCoursesWithLiveClasses);
router.get('/:id', authenticate, getLiveClassById);
router.post('/', authenticate, authorizeRoles('instructor', 'admin'), createLiveClassController);
router.put('/:id', authenticate, authorizeRoles('instructor', 'admin'), updateLiveClass);
router.delete('/:id', authenticate, authorizeRoles('instructor', 'admin'), deleteLiveClass);

module.exports = router;
