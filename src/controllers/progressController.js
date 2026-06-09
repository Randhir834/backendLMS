const { updateLessonProgress, findProgressByStudentAndCourse, getCourseProgressPercentage } = require('../services/progressService');
const { getCertificateByCourseAndUser } = require('../services/certificateService');

const updateProgress = async (req, res, next) => {
  try {
    const progress = await updateLessonProgress({ ...req.body, student_id: req.user.id });
    
    // Get updated progress percentage
    const courseId = req.body.course_id || 'unknown';
    const summary = await getCourseProgressPercentage(req.user.id, courseId);
    
    // Check if certificate was issued
    let certificate = null;
    if (summary.percentage === 100) {
      certificate = await getCertificateByCourseAndUser(req.user.id, courseId);
    }

    res.json({ 
      message: 'Progress updated', 
      progress,
      summary,
      certificate: certificate ? { id: certificate.id, certificate_number: certificate.certificate_number } : null
    });
  } catch (error) { next(error); }
};

const getCourseProgress = async (req, res, next) => {
  try {
    const progress = await findProgressByStudentAndCourse(req.user.id, req.params.courseId);
    const summary = await getCourseProgressPercentage(req.user.id, req.params.courseId);
    
    // Get certificate if course is completed
    let certificate = null;
    if (summary.percentage === 100) {
      certificate = await getCertificateByCourseAndUser(req.user.id, req.params.courseId);
    }

    res.json({ 
      progress, 
      summary,
      certificate: certificate ? { id: certificate.id, certificate_number: certificate.certificate_number } : null
    });
  } catch (error) { next(error); }
};

module.exports = { updateProgress, getCourseProgress };
