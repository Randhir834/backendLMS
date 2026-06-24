const { findUserById, updateUserById, updateUserPassword, getUserPasswordById } = require('../services/userService');
const { uploadToSupabase, deleteFromSupabase } = require('../services/storageService');
const { query } = require('../config/database');
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

const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

    // Delete old avatar if exists
    const currentUser = await findUserById(req.user.id);
    if (currentUser.avatar_url) {
      try {
        await deleteFromSupabase(currentUser.avatar_url);
      } catch (error) {
        console.error('Error deleting old avatar:', error);
        // Continue anyway
      }
    }

    // Upload new photo
    const result = await uploadToSupabase(req.file, 'profile-photos');
    
    // Update user record
    const user = await updateUserById(req.user.id, { avatar_url: result.publicUrl });

    res.json({ 
      message: 'Profile photo uploaded successfully',
      avatar_url: result.publicUrl,
      user 
    });
  } catch (error) {
    next(error);
  }
};

const deleteProfilePhoto = async (req, res, next) => {
  try {
    const currentUser = await findUserById(req.user.id);
    
    if (!currentUser.avatar_url) {
      return res.status(400).json({ error: 'No profile photo to delete' });
    }

    // Delete from storage
    await deleteFromSupabase(currentUser.avatar_url);

    // Update user record
    const user = await updateUserById(req.user.id, { avatar_url: null });

    res.json({ 
      message: 'Profile photo deleted successfully',
      user 
    });
  } catch (error) {
    next(error);
  }
};

const getInstructorStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only allow instructors to access this endpoint
    if (userRole !== 'instructor') {
      return res.status(403).json({ error: 'Access denied. Only instructors can view these statistics.' });
    }

    // Get total number of unique students enrolled in instructor's courses
    const studentsResult = await query(
      `SELECT COUNT(DISTINCT e.user_id) as total_students
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN course_instructors ci ON c.id = ci.course_id
       WHERE ci.instructor_id = $1`,
      [userId]
    );

    // Get total number of courses the instructor is teaching
    const coursesResult = await query(
      `SELECT COUNT(DISTINCT c.id) as total_courses
       FROM courses c
       JOIN course_instructors ci ON c.id = ci.course_id
       WHERE ci.instructor_id = $1`,
      [userId]
    );

    // Get average rating across all instructor's courses (if reviews table exists)
    // For now, we'll return a placeholder since there's no reviews table
    // You can implement this when the reviews table is added
    const avgRating = null;

    // Get total hours taught (sum of all live classes duration)
    const hoursResult = await query(
      `SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
       FROM live_classes
       WHERE created_by = $1`,
      [userId]
    );

    const totalMinutes = parseInt(hoursResult.rows[0]?.total_minutes || 0);
    const totalHours = Math.floor(totalMinutes / 60);

    const stats = {
      totalStudents: parseInt(studentsResult.rows[0]?.total_students || 0),
      coursesTeaching: parseInt(coursesResult.rows[0]?.total_courses || 0),
      averageRating: avgRating || 4.8, // Default value until reviews are implemented
      totalHours: totalHours
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching instructor stats:', error);
    next(error);
  }
};

module.exports = { getProfile, updateProfile, changePassword, uploadProfilePhoto, deleteProfilePhoto, getInstructorStats };
