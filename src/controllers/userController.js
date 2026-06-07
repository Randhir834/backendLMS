const { findUserById, updateUserById, updateUserPassword, getUserPasswordById, updateUserAvatar } = require('../services/userService');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const getProfile = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization } = req.body;
    const user = await updateUserById(req.user.id, { name, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization });
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Old password, new password, and confirm password are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const currentHashedPassword = await getUserPasswordById(req.user.id);
    if (!currentHashedPassword) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(oldPassword, currentHashedPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect old password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await updateUserPassword(req.user.id, hashedPassword, true);

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete old profile photo if it exists
    if (user.avatar_url) {
      const oldPhotoPath = path.join(__dirname, '../../uploads', user.avatar_url.replace('/uploads/', ''));
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update user with new avatar URL
    const avatarUrl = `/uploads/profile-photos/${req.file.filename}`;
    const updatedUser = await updateUserAvatar(req.user.id, avatarUrl);

    res.json({ 
      message: 'Profile photo uploaded successfully.', 
      avatar_url: avatarUrl,
      user: updatedUser 
    });
  } catch (error) {
    next(error);
  }
};

const deleteProfilePhoto = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete old profile photo if it exists
    if (user.avatar_url) {
      const oldPhotoPath = path.join(__dirname, '../../uploads', user.avatar_url.replace('/uploads/', ''));
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update user to remove avatar URL
    const updatedUser = await updateUserAvatar(req.user.id, null);

    res.json({ 
      message: 'Profile photo deleted successfully.', 
      user: updatedUser 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, changePassword, uploadProfilePhoto, deleteProfilePhoto };
