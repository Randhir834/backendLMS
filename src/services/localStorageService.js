const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, '../../uploads/course-materials');

const ensureUploadDir = async () => {
  try {
    await fs.access(UPLOADS_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
};

/**
 * Upload file to local storage as fallback
 */
const uploadToLocal = async (file, courseId, fileType) => {
  await ensureUploadDir();
  
  const ext = path.extname(file.originalname);
  const secureFileName = `${crypto.randomUUID()}${ext}`;
  const courseDir = path.join(UPLOADS_DIR, courseId.toString(), fileType);
  
  // Create course directory
  await fs.mkdir(courseDir, { recursive: true });
  
  const filePath = path.join(courseDir, secureFileName);
  const relativePath = path.relative(path.join(__dirname, '../../'), filePath);
  
  // Write file to disk
  await fs.writeFile(filePath, file.buffer);
  
  return {
    path: relativePath,
    publicUrl: `/uploads/${relativePath.replace(/\\/g, '/')}`
  };
};

/**
 * Delete file from local storage
 */
const deleteFromLocal = async (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../../', filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Failed to delete local file:', error);
  }
};

/**
 * Generate secure URL for local file
 */
const getLocalFileUrl = (filePath) => {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Get the backend base URL from environment
  const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5001';
  
  // If path already starts with uploads/, don't add another /uploads/ prefix
  if (normalizedPath.startsWith('uploads/')) {
    return `${backendUrl}/${normalizedPath}`;
  }
  
  return `${backendUrl}/uploads/${normalizedPath}`;
};

module.exports = {
  uploadToLocal,
  deleteFromLocal,
  getLocalFileUrl
};