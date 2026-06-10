const {
  findAllUsers, findUserById, updateUserRole, updateUser, deleteUserById,
  getDashboardStats, getEnrollmentTrend, getRecentEnrollments, getRecentPayments,
  createInstructor
} = require('../services/adminService');

const {
  broadcastUserUpdate,
  broadcastUserDelete,
  broadcastUserRoleChange,
  broadcastAnalyticsUpdate
} = require('../services/adminSyncService');

const userDeletionService = require('../services/userDeletionService');

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
    
    // Broadcast role change to all admins
    broadcastUserRoleChange(user.id, user.role, user.name);
    
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
    
    // Broadcast user update to all admins
    broadcastUserUpdate(user.id, user);
    
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
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { force = false, dryRun = false } = req.query;

    // Use the new user deletion service
    const result = await userDeletionService.deleteUser(userId, {
      force: force === 'true',
      dryRun: dryRun === 'true'
    });

    if (!result.success) {
      if (result.requiresConfirmation) {
        return res.status(200).json({
          success: false,
          requiresConfirmation: true,
          message: result.message,
          user: result.user,
          impact: result.impact,
          totalAffectedRecords: result.totalAffectedRecords
        });
      }
      return res.status(400).json({ error: result.message });
    }

    // If it's a dry run, return the impact analysis
    if (result.dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        message: result.message,
        user: result.user,
        impact: result.impact
      });
    }

    // Broadcast user deletion to all admins
    broadcastUserDelete(result.user.id, result.user.name);
    
    res.json({
      success: true,
      message: result.message,
      user: result.user,
      impact: result.impact
    });
  } catch (error) {
    console.error('Delete user error:', error);
    next(error);
  }
};

// New endpoint to get user deletion impact
const getUserDeletionImpact = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const userInfo = await userDeletionService.getUserInfo(userId);
    if (!userInfo) {
      return res.status(404).json({ error: 'User not found' });
    }

    const impact = await userDeletionService.getUserDeletionImpact(userId);
    
    res.json({
      user: userInfo,
      impact: impact,
      totalAffectedRecords: impact.reduce((sum, item) => sum + parseInt(item.record_count), 0)
    });
  } catch (error) {
    console.error('Get user deletion impact error:', error);
    next(error);
  }
};

// New endpoint to archive user instead of deleting
const archiveUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const result = await userDeletionService.archiveUser(userId);
    
    res.json({
      success: true,
      message: result.message,
      user: result.user
    });
  } catch (error) {
    console.error('Archive user error:', error);
    next(error);
  }
};

// New endpoint to delete multiple users
const deleteMultipleUsers = async (req, res, next) => {
  try {
    const { userIds, force = false } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }

    // Validate all user IDs are numbers
    const validUserIds = userIds.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    if (validUserIds.length !== userIds.length) {
      return res.status(400).json({ error: 'All user IDs must be valid numbers' });
    }

    const result = await userDeletionService.deleteMultipleUsers(validUserIds, { force });
    
    res.json({
      success: true,
      message: `Batch deletion completed: ${result.successCount} successful, ${result.failureCount} failed`,
      results: result
    });
  } catch (error) {
    console.error('Delete multiple users error:', error);
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const stats = await getDashboardStats();
    const enrollmentTrend = await getEnrollmentTrend(30);
    const recentEnrollments = await getRecentEnrollments(5);
    const recentPayments = await getRecentPayments(5);
    
    const analyticsData = { stats, enrollmentTrend, recentEnrollments, recentPayments };
    
    // Broadcast analytics update to all admins
    broadcastAnalyticsUpdate(analyticsData);
    
    res.json(analyticsData);
  } catch (error) { next(error); }
};

const createInstructorAccount = async (req, res, next) => {
  try {
    const { name, email, phone, location, qualifications, specialization } = req.body;

    // Validation
    if (!name || !email || !phone || !location || !qualifications || !specialization) {
      return res.status(400).json({ error: 'All fields are required: name, email, phone, location, qualifications, specialization' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await createInstructor({
      name,
      email,
      phone,
      location,
      qualifications,
      specialization
    });

    res.status(201).json({
      message: 'Instructor account created successfully',
      instructor: result
    });
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(error);
  }
};

module.exports = { 
  getUsers, 
  getUserById, 
  updateUserRoleController, 
  updateUserController, 
  deleteUser, 
  getUserDeletionImpact,
  archiveUser,
  deleteMultipleUsers,
  getAnalytics, 
  createInstructorAccount 
};
