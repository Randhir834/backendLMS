const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { upload, uploadToSupabase, deleteFromSupabase } = require('../services/storageService');

const router = express.Router();

router.post(
  '/upload',
  authenticate,
  authorizeRoles('instructor', 'admin'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const folder = req.body.folder || 'general';
      const result = await uploadToSupabase(req.file, folder);

      res.status(201).json({
        message: 'File uploaded successfully',
        file: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:path',
  authenticate,
  authorizeRoles('instructor', 'admin'),
  async (req, res, next) => {
    try {
      await deleteFromSupabase(req.params.path);
      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
