const {
  findAllUsers, findUserById, updateUserRole, updateUser, deleteUserById,
  getDashboardStats, getEnrollmentTrend, getRecentEnrollments, getRecentPayments,
} = require('../services/adminService');

const getUsers = async (req, res, next) => {
  try {
    const users = await findAllUsers(req.query.role);
    res.json({ users });
  } catch (error) { next(error); }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) { next(error); }
};

const updateUserRoleController = async (req, res, next) => {
  try {
    const user = await updateUserRole(req.params.id, req.body.role);
    res.json({ message: 'User role updated', user });
  } catch (error) { next(error); }
};

const updateUserController = async (req, res, next) => {
  try {
    console.log('Updating user ID:', req.params.id);
    console.log('Update data:', req.body);
    
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await updateUser(userId, req.body);
    
    console.log('Updated user:', user);
    
    // Emit real-time update to the specific user
    if (global.io) {
      // Send update to the specific user's room
      global.io.to(`user-${userId}`).emit('profile-updated', {
        type: 'PROFILE_UPDATED',
        user: user,
        message: 'Your profile has been updated by an administrator',
        timestamp: new Date().toISOString()
      });

      // Send update to admin room for admin dashboard updates
      global.io.to('admin-room').emit('user-updated', {
        type: 'USER_UPDATED',
        user: user,
        updatedBy: 'admin', // You can get this from req.user if you have auth
        timestamp: new Date().toISOString()
      });

      console.log(`[socket] Emitted profile update for user ${userId}`);
    }
    
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.message === 'No fields to update') {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await deleteUserById(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) { next(error); }
};

const getAnalytics = async (req, res, next) => {
  try {
    const stats = await getDashboardStats();
    const enrollmentTrend = await getEnrollmentTrend(30);
    const recentEnrollments = await getRecentEnrollments(5);
    const recentPayments = await getRecentPayments(5);
    res.json({ stats, enrollmentTrend, recentEnrollments, recentPayments });
  } catch (error) { next(error); }
};

const createAdmin = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { findUserByEmail, createUser } = require('../services/userService');
    
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password and create admin user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      date_of_birth: null,
      school: null,
      grade: null,
      parent_guardian_name: null,
      phone: null,
      location: null,
      qualifications: null,
      specialization: null
    });

    // Emit real-time update to all admins
    if (global.io) {
      global.io.to('admin-room').emit('admin-created', {
        type: 'ADMIN_CREATED',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      message: 'Admin created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, updateUserRoleController, updateUserController, deleteUser, getAnalytics, createAdmin };
