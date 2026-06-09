const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const profilePhotosDir = path.join(__dirname, '../../uploads/profile-photos');
if (!fs.existsSync(profilePhotosDir)) {
  fs.mkdirSync(profilePhotosDir, { recursive: true });
}

// Configure storage for profile photos
const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePhotosDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId-timestamp.ext
    const uniqueSuffix = `${req.user.id}-${Date.now()}`;
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

// File filter to accept only images
const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

// Multer instance for profile photos
const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

module.exports = { upload: uploadProfilePhoto, uploadProfilePhoto };
