const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getSupabaseClient } = require('../config/supabase');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  },
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadToSupabase = async (file, folder = 'general') => {
  const ext = path.extname(file.originalname);
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  try {
    // Create folder if it doesn't exist
    const folderPath = path.dirname(filePath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Save file locally
    fs.writeFileSync(filePath, file.buffer);

    // Generate public URL (assuming uploads are served from /uploads)
    const publicUrl = `${process.env.API_URL || 'http://localhost:5001'}/uploads/${fileName}`;

    return {
      path: fileName,
      publicUrl: publicUrl,
    };
  } catch (err) {
    console.error('Upload error details:', err);
    throw new Error(`Upload failed: ${err.message}`);
  }
};

const deleteFromSupabase = async (filePath) => {
  try {
    const fullPath = path.join(uploadsDir, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    throw new Error(`Delete failed: ${err.message}`);
  }
};

module.exports = {
  upload,
  uploadToSupabase,
  deleteFromSupabase,
};
