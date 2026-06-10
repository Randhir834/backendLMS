const { findUserById, updateUserById, updateUserPassword, getUserPasswordById } = require('../services/userService');
const bcrypt = require('bcryptjs');

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

module.exports = { getProfile, updateProfile, changePassword };
