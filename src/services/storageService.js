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

// Create uploads directory for local fallback
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadToSupabase = async (file, folder = 'general') => {
  const ext = path.extname(file.originalname);
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

  try {
    // Try Supabase Storage first
    const supabase = getSupabaseClient();
    const bucket = process.env.SUPABASE_BUCKET || 'playfit-storage';

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return {
      path: fileName,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (err) {
    console.error('Supabase upload failed, falling back to local storage:', err.message);
    
    // Fallback to local storage for development
    const filePath = path.join(uploadsDir, fileName);
    const folderPath = path.dirname(filePath);
    
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    fs.writeFileSync(filePath, file.buffer);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    const publicUrl = `${backendUrl}/uploads/${fileName}`;

    return {
      path: fileName,
      publicUrl: publicUrl,
    };
  }
};

const deleteFromSupabase = async (fileUrl) => {
  try {
    // Extract path from URL
    let filePath = fileUrl;
    
    // If it's a Supabase URL
    if (fileUrl.includes('supabase.co/storage')) {
      const urlParts = fileUrl.split('/object/public/');
      if (urlParts.length > 1) {
        const pathParts = urlParts[1].split('/');
        pathParts.shift(); // Remove bucket name
        filePath = pathParts.join('/');
      }
    } else if (fileUrl.includes('/uploads/')) {
      // Local storage path
      filePath = fileUrl.split('/uploads/')[1];
    }

    // Try Supabase Storage first
    const supabase = getSupabaseClient();
    const bucket = process.env.SUPABASE_BUCKET || 'playfit-storage';

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      // Try local fallback
      const fullPath = path.join(uploadsDir, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (err) {
    console.error('Delete failed:', err.message);
    // Try local fallback
    try {
      const fullPath = path.join(uploadsDir, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (localErr) {
      console.error('Local delete also failed:', localErr.message);
    }
  }
};

module.exports = {
  upload,
  uploadToSupabase,
  deleteFromSupabase,
};
