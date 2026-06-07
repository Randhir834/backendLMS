const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { updateProgress, getCourseProgress } = require('../controllers/progressController');

const router = express.Router();

router.post('/', authenticate, authorizeRoles('student'), updateProgress);
router.get('/course/:courseId', authenticate, getCourseProgress);

module.exports = router;
