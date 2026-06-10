const express = require('express');

const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const courseRoutes = require('./courseRoutes');
const enrollmentRoutes = require('./enrollmentRoutes');
const paymentRoutes = require('./paymentRoutes');
const storageRoutes = require('./storageRoutes');
const categoryRoutes = require('./categoryRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const quizRoutes = require('./quizRoutes');
const liveClassRoutes = require('./liveClassRoutes');
const notificationRoutes = require('./notificationRoutes');
const progressRoutes = require('./progressRoutes');
const adminRoutes = require('./adminRoutes');
const settingsRoutes = require('./settingsRoutes');
const searchRoutes = require('./searchRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const courseMaterialRoutes = require('./courseMaterialRoutes');
const trialRequestRoutes = require('./trialRequestRoutes');
const instructorRegistrationRoutes = require('./instructorRegistrationRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/payments', paymentRoutes);
router.use('/storage', storageRoutes);
router.use('/categories', categoryRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/quizzes', quizRoutes);
router.use('/live-classes', liveClassRoutes);
router.use('/notifications', notificationRoutes);
router.use('/progress', progressRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingsRoutes);
router.use('/search', searchRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/trial-requests', trialRequestRoutes);
router.use('/instructor-registrations', instructorRegistrationRoutes);
router.use('/', courseMaterialRoutes);

router.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

module.exports = router;
