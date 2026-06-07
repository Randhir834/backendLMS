const { updateLessonProgress, findProgressByStudentAndCourse, getCourseProgressPercentage } = require('../services/progressService');

const updateProgress = async (req, res, next) => {
  try {
    const progress = await updateLessonProgress({ ...req.body, student_id: req.user.id });
    res.json({ message: 'Progress updated', progress });
  } catch (error) { next(error); }
};

const getCourseProgress = async (req, res, next) => {
  try {
    const progress = await findProgressByStudentAndCourse(req.user.id, req.params.courseId);
    const summary = await getCourseProgressPercentage(req.user.id, req.params.courseId);
    res.json({ progress, summary });
  } catch (error) { next(error); }
};

module.exports = { updateProgress, getCourseProgress };
