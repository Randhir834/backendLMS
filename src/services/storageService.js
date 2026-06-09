const multer = require('multer');
const path = require('path');
const { getSupabaseClient } = require('../config/supabase');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
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

const uploadToSupabase = async (file, folder = 'general') => {
  const supabase = getSupabaseClient();
  const ext = path.extname(file.originalname);
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(fileName);

  return {
    path: data.path,
    publicUrl: urlData.publicUrl,
  };
};

const deleteFromSupabase = async (filePath) => {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
};

module.exports = {
  upload,
  uploadToSupabase,
  deleteFromSupabase,
};
