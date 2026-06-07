const express = require('express');
const router = express.Router();
const { globalSearch, searchCoursesOnly } = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

// Universal search endpoint (requires authentication to determine user role)
router.get('/', authenticate, globalSearch);

// Course-specific search with filters
router.get('/courses', authenticate, searchCoursesOnly);

module.exports = router;
