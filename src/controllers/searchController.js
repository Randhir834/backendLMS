const { searchAll, searchCourses } = require('../services/searchService');
const { catchAsync } = require('../utils/catchAsync');

/**
 * Universal search across all entities with context-aware prioritization
 * GET /api/search?q=searchTerm&context=courses&contextId=123
 */
const globalSearch = catchAsync(async (req, res) => {
  const { q, context, contextId } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.json({
      success: true,
      results: {
        courses: [],
        lessons: [],
        sections: [],
        assignments: [],
        quizzes: [],
        liveClasses: [],
        users: [],
        categories: [],
        enrollments: [],
      },
      totalResults: 0,
    });
  }

  const userRole = req.user?.role || null;
  const userId = req.user?.id || null;

  // Pass context information for prioritization
  const searchContext = {
    type: context || null,
    id: contextId ? parseInt(contextId) : null,
  };

  const results = await searchAll(q, userRole, userId, searchContext);

  // Calculate total results
  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  res.json({
    success: true,
    query: q,
    results,
    totalResults,
    userRole,
    context: searchContext,
  });
});

/**
 * Search courses specifically with filters
 * GET /api/search/courses?q=searchTerm&status=published&category_id=1
 */
const searchCoursesOnly = catchAsync(async (req, res) => {
  const { q, status, category_id, instructor_id } = req.query;

  if (!q || q.trim().length === 0) {
    return res.json({
      success: true,
      courses: [],
    });
  }

  const filters = {};
  if (status) filters.status = status;
  if (category_id) filters.category_id = parseInt(category_id);
  if (instructor_id) filters.instructor_id = parseInt(instructor_id);

  const courses = await searchCourses(q, filters);

  res.json({
    success: true,
    query: q,
    courses,
  });
});

module.exports = {
  globalSearch,
  searchCoursesOnly,
};
