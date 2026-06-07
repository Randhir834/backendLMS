const { query } = require('../config/database');
const { getSupabaseClient } = require('../config/supabase');
const { uploadToLocal, deleteFromLocal, getLocalFileUrl } = require('./localStorageService');
const crypto = require('crypto');
const path = require('path');

// Allowed file types for course materials
const ALLOWED_MATERIAL_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'ppt',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'text/plain': 'document'
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for course materials

/**
 * Upload course material to secure storage
 */
const uploadCourseMaterial = async (file, courseId, uploadedBy, materialData) => {
  // Validate file type
  if (!ALLOWED_MATERIAL_TYPES[file.mimetype]) {
    throw new Error(`File type ${file.mimetype} is not allowed for course materials`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  const fileType = ALLOWED_MATERIAL_TYPES[file.mimetype];
  let uploadData, isLocal = false;

  try {
    // Try Supabase upload first
    const supabase = getSupabaseClient();
    const ext = path.extname(file.originalname);
    const secureFileName = `${crypto.randomUUID()}${ext}`;
    const filePath = `course-materials/${courseId}/${fileType}/${secureFileName}`;

    try {
      // Attempt private bucket upload
      const { data, error } = await supabase.storage
        .from('course-materials-private')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
          cacheControl: 'no-cache, no-store, must-revalidate'
        });
      
      if (error) throw error;
      uploadData = { path: data.path };
    } catch (privateError) {
      // Fallback to public bucket
      const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET || 'playfit-storage')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
          cacheControl: 'no-cache, no-store, must-revalidate'
        });
      
      if (error) throw error;
      uploadData = { path: data.path };
    }
  } catch (supabaseError) {
    console.log('Supabase upload failed, using local storage:', supabaseError.message);
    
    // Fallback to local storage
    uploadData = await uploadToLocal(file, courseId, fileType);
    isLocal = true;
  }

  try {
    // Save material metadata to database
    const materialResult = await query(`
      INSERT INTO course_materials (
        course_id, title, description, file_type, file_name, 
        file_path, file_size, mime_type, upload_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      courseId,
      materialData.title || file.originalname,
      materialData.description || '',
      fileType,
      file.originalname,
      uploadData.path,
      file.size,
      file.mimetype,
      uploadedBy
    ]);

    return materialResult.rows[0];
  } catch (error) {
    // Clean up uploaded file if database insert fails
    if (isLocal) {
      await deleteFromLocal(uploadData.path);
    } else {
      try {
        const supabase = getSupabaseClient();
        await supabase.storage
          .from(process.env.SUPABASE_BUCKET || 'playfit-storage')
          .remove([uploadData.path]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }
    throw error;
  }
};

/**
 * Get course materials for a specific course
 */
const getCourseMaterials = async (courseId, userId, userRole) => {
  let sql = `
    SELECT cm.*, u.name as uploaded_by_name
    FROM course_materials cm
    LEFT JOIN users u ON cm.upload_by = u.id
    WHERE cm.course_id = $1
  `;
  
  const params = [courseId];

  // Only instructors assigned to the course can see materials
  if (userRole === 'instructor') {
    sql += ` AND EXISTS (
      SELECT 1 FROM course_instructors ci 
      WHERE ci.course_id = cm.course_id AND ci.instructor_id = $2
    )`;
    params.push(userId);
  }

  sql += ` ORDER BY cm.created_at DESC`;

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Generate secure access token for viewing a material
 */
const generateSecureToken = async (materialId, userId) => {
  // Check if user has access to this material
  const accessCheck = await query(`
    SELECT cm.*, ci.instructor_id
    FROM course_materials cm
    LEFT JOIN course_instructors ci ON ci.course_id = cm.course_id
    WHERE cm.id = $1 AND (ci.instructor_id = $2 OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = $2 AND u.role = 'admin'
    ))
  `, [materialId, userId]);

  if (accessCheck.rows.length === 0) {
    throw new Error('Access denied to this material');
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await query(`
    INSERT INTO secure_file_tokens (material_id, user_id, token, expires_at)
    VALUES ($1, $2, $3, $4)
  `, [materialId, userId, token, expiresAt]);

  return { token, expiresAt };
};

/**
 * Validate and consume secure token
 */
const validateSecureToken = async (token) => {
  const result = await query(`
    SELECT sft.*, cm.file_path, cm.mime_type, cm.file_name
    FROM secure_file_tokens sft
    JOIN course_materials cm ON sft.material_id = cm.id
    WHERE sft.token = $1 AND sft.expires_at > NOW() AND sft.is_used = FALSE
  `, [token]);

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired token');
  }

  const tokenData = result.rows[0];

  // Mark token as used
  await query(`
    UPDATE secure_file_tokens 
    SET is_used = TRUE 
    WHERE id = $1
  `, [tokenData.id]);

  return tokenData;
};

/**
 * Log material access attempt
 */
const logMaterialAccess = async (materialId, userId, accessType, ipAddress, userAgent, accessGranted = true, blockedReason = null) => {
  await query(`
    INSERT INTO course_material_access_logs (
      material_id, user_id, access_type, ip_address, user_agent, access_granted, blocked_reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [materialId, userId, accessType, ipAddress, userAgent, accessGranted, blockedReason]);
};

/**
 * Get signed URL for secure file access
 */
const getSecureFileUrl = async (filePath, expiresIn = 1800) => {
  // Check if it's a local file path (starts with uploads/)
  if (filePath.startsWith('uploads/')) {
    // Local file - return the local URL
    return getLocalFileUrl(filePath);
  }

  // Otherwise, it's a Supabase file - try to get signed URL
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.storage
      .from('course-materials-private')
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (privateError) {
    // Fallback to public bucket
    try {
      const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET || 'playfit-storage')
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (publicError) {
      // If signed URL fails, try getting public URL (less secure but functional)
      const { data } = supabase.storage
        .from(process.env.SUPABASE_BUCKET || 'playfit-storage')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    }
  }
};

/**
 * Delete course material
 */
const deleteCourseMaterial = async (materialId, userId, userRole) => {
  // Check permissions
  const material = await query(`
    SELECT cm.*, c.title as course_title
    FROM course_materials cm
    JOIN courses c ON cm.course_id = c.id
    WHERE cm.id = $1
  `, [materialId]);

  if (material.rows.length === 0) {
    throw new Error('Material not found');
  }

  const materialData = material.rows[0];

  // Only admin or the uploader can delete
  if (userRole !== 'admin' && materialData.upload_by !== userId) {
    throw new Error('Permission denied');
  }

  // Delete from storage - try both buckets
  const supabase = getSupabaseClient();
  
  try {
    // Try private bucket first
    await supabase.storage
      .from('course-materials-private')
      .remove([materialData.file_path]);
  } catch (privateError) {
    // Fallback to public bucket
    try {
      await supabase.storage
        .from(process.env.SUPABASE_BUCKET || 'playfit-storage')
        .remove([materialData.file_path]);
    } catch (publicError) {
      console.error('Failed to delete file from storage:', publicError);
      // Continue with database deletion even if file deletion fails
    }
  }

  // Delete from database (cascade will handle related records)
  await query(`DELETE FROM course_materials WHERE id = $1`, [materialId]);

  return materialData;
};

/**
 * Get material access logs for admin
 */
const getMaterialAccessLogs = async (materialId, limit = 100) => {
  const result = await query(`
    SELECT mal.*, u.name as user_name, u.email as user_email, cm.title as material_title
    FROM course_material_access_logs mal
    JOIN users u ON mal.user_id = u.id
    JOIN course_materials cm ON mal.material_id = cm.id
    WHERE mal.material_id = $1
    ORDER BY mal.accessed_at DESC
    LIMIT $2
  `, [materialId, limit]);

  return result.rows;
};

module.exports = {
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
};