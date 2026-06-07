const multer = require('multer');
const {
  uploadCourseMaterial,
  getCourseMaterials,
  generateSecureToken,
  validateSecureToken,
  logMaterialAccess,
  getSecureFileUrl,
  deleteCourseMaterial,
  getMaterialAccessLogs,
  ALLOWED_MATERIAL_TYPES,
  MAX_FILE_SIZE
} = require('../services/courseMaterialService');
const { catchAsync } = require('../utils/catchAsync');
const { AppError } = require('../utils/AppError');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MATERIAL_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} is not allowed for course materials`, 400), false);
    }
  },
});

/**
 * Upload course material (Admin only)
 */
const uploadMaterial = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { title, description } = req.body;
  
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  // Verify course exists and user has permission
  if (req.user.role !== 'admin') {
    throw new AppError('Only administrators can upload course materials', 403);
  }

  const material = await uploadCourseMaterial(
    req.file,
    courseId,
    req.user.id,
    { title, description }
  );

  // Log the upload
  await logMaterialAccess(
    material.id,
    req.user.id,
    'upload',
    req.ip,
    req.get('User-Agent'),
    true
  );

  // Emit real-time notification to instructors of this course
  if (global.io) {
    // Get course instructors to notify them
    const { query } = require('../config/database');
    const instructorsResult = await query(`
      SELECT ci.instructor_id, u.name as instructor_name
      FROM course_instructors ci
      JOIN users u ON ci.instructor_id = u.id
      WHERE ci.course_id = $1
    `, [courseId]);

    // Emit to each instructor
    instructorsResult.rows.forEach(instructor => {
      global.io.to(`user-${instructor.instructor_id}`).emit('course-material-uploaded', {
        courseId: parseInt(courseId),
        material: {
          ...material,
          uploaded_by_name: req.user.name
        },
        message: `New material "${material.title}" has been uploaded to your course`
      });
    });

    // Also emit to admin room
    global.io.to('admin-room').emit('course-material-uploaded', {
      courseId: parseInt(courseId),
      material: {
        ...material,
        uploaded_by_name: req.user.name
      }
    });
  }

  res.status(201).json({
    success: true,
    message: 'Course material uploaded successfully',
    material
  });
});

/**
 * Get course materials
 */
const getMaterials = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  
  const materials = await getCourseMaterials(courseId, req.user.id, req.user.role);

  res.json({
    success: true,
    materials
  });
});

/**
 * Generate secure viewing token
 */
const getViewingToken = catchAsync(async (req, res) => {
  const { materialId } = req.params;
  
  // Log access attempt
  await logMaterialAccess(
    materialId,
    req.user.id,
    'view_request',
    req.ip,
    req.get('User-Agent'),
    true
  );

  const tokenData = await generateSecureToken(materialId, req.user.id);

  res.json({
    success: true,
    token: tokenData.token,
    expiresAt: tokenData.expiresAt
  });
});

/**
 * Serve secure file content
 */
const serveSecureFile = catchAsync(async (req, res) => {
  const { token } = req.params;
  
  try {
    const tokenData = await validateSecureToken(token);
    
    // Log successful access
    await logMaterialAccess(
      tokenData.material_id,
      tokenData.user_id,
      'view',
      req.ip,
      req.get('User-Agent'),
      true
    );

    // Get signed URL from Supabase or local file URL
    const signedUrl = await getSecureFileUrl(tokenData.file_path, 1800); // 30 minutes

    // Set security headers to prevent caching and downloading
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN', // Changed from DENY to allow iframe viewing
      'Content-Security-Policy': "default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'; media-src 'self' blob:; object-src 'self';",
      'X-Download-Options': 'noopen',
      'Content-Disposition': 'inline'
    });

    // Return the signed URL for client-side secure viewing
    res.json({
      success: true,
      secureUrl: signedUrl,
      fileName: tokenData.file_name,
      mimeType: tokenData.mime_type
    });

  } catch (error) {
    // Log failed access attempt
    await logMaterialAccess(
      null,
      req.user?.id || null,
      'view_failed',
      req.ip,
      req.get('User-Agent'),
      false,
      error.message
    );
    
    throw new AppError('Access denied or token expired', 403);
  }
});

/**
 * Delete course material (Admin only)
 */
const deleteMaterial = catchAsync(async (req, res) => {
  const { materialId } = req.params;
  
  const deletedMaterial = await deleteCourseMaterial(materialId, req.user.id, req.user.role);

  // Log deletion
  await logMaterialAccess(
    materialId,
    req.user.id,
    'delete',
    req.ip,
    req.get('User-Agent'),
    true
  );

  res.json({
    success: true,
    message: 'Course material deleted successfully',
    material: deletedMaterial
  });
});

/**
 * Get material access logs (Admin only)
 */
const getAccessLogs = catchAsync(async (req, res) => {
  const { materialId } = req.params;
  const { limit = 100 } = req.query;

  if (req.user.role !== 'admin') {
    throw new AppError('Access denied', 403);
  }

  const logs = await getMaterialAccessLogs(materialId, parseInt(limit));

  res.json({
    success: true,
    logs
  });
});

/**
 * Report screenshot attempt
 */
const reportScreenshotAttempt = catchAsync(async (req, res) => {
  const { materialId } = req.body;
  
  // Log screenshot attempt
  await logMaterialAccess(
    materialId,
    req.user.id,
    'screenshot_attempt',
    req.ip,
    req.get('User-Agent'),
    false,
    'Screenshot attempt detected and blocked'
  );

  res.json({
    success: true,
    message: 'Screenshot attempt logged'
  });
});

/**
 * Report download attempt
 */
const reportDownloadAttempt = catchAsync(async (req, res) => {
  const { materialId } = req.body;
  
  // Log download attempt
  await logMaterialAccess(
    materialId,
    req.user.id,
    'download_attempt',
    req.ip,
    req.get('User-Agent'),
    false,
    'Download attempt detected and blocked'
  );

  res.json({
    success: true,
    message: 'Download attempt logged'
  });
});

module.exports = {
  upload: upload.single('file'),
  uploadMaterial,
  getMaterials,
  getViewingToken,
  serveSecureFile,
  deleteMaterial,
  getAccessLogs,
  reportScreenshotAttempt,
  reportDownloadAttempt
};