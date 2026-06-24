/**
 * Real-time Service
 * Handles all Socket.IO event emissions for real-time updates
 */

/**
 * Get the Socket.IO instance
 */
const getIO = () => {
  if (!global.io) {
    throw new Error('Socket.IO not initialized');
  }
  return global.io;
};

/**
 * Real-time event types
 */
const EVENTS = {
  // User events
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_STATUS_CHANGED: 'user:status_changed',

  // Course events
  COURSE_CREATED: 'course:created',
  COURSE_UPDATED: 'course:updated',
  COURSE_DELETED: 'course:deleted',
  COURSE_PUBLISHED: 'course:published',

  // Enrollment events
  ENROLLMENT_CREATED: 'enrollment:created',
  ENROLLMENT_UPDATED: 'enrollment:updated',
  ENROLLMENT_DELETED: 'enrollment:deleted',

  // Live class events
  LIVE_CLASS_CREATED: 'live_class:created',
  LIVE_CLASS_UPDATED: 'live_class:updated',
  LIVE_CLASS_DELETED: 'live_class:deleted',
  LIVE_CLASS_STARTED: 'live_class:started',
  LIVE_CLASS_ENDED: 'live_class:ended',

  // Notification events
  NOTIFICATION_CREATED: 'notification:created',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DELETED: 'notification:deleted',

  // Progress events
  PROGRESS_UPDATED: 'progress:updated',
  LESSON_COMPLETED: 'lesson:completed',

  // Payment events
  PAYMENT_CREATED: 'payment:created',
  PAYMENT_UPDATED: 'payment:updated',

  // Certificate events
  CERTIFICATE_GENERATED: 'certificate:generated',

  // Category events
  CATEGORY_CREATED: 'category:created',
  CATEGORY_UPDATED: 'category:updated',
  CATEGORY_DELETED: 'category:deleted',

  // Course material events
  MATERIAL_CREATED: 'material:created',
  MATERIAL_UPDATED: 'material:updated',
  MATERIAL_DELETED: 'material:deleted',

  // Trial request events
  TRIAL_REQUEST_CREATED: 'trial_request:created',
  TRIAL_REQUEST_UPDATED: 'trial_request:updated',

  // Dashboard statistics update
  DASHBOARD_STATS_UPDATED: 'dashboard:stats_updated',
};

/**
 * Emit event to all connected clients
 */
const emitToAll = (event, data) => {
  try {
    const io = getIO();
    io.emit(event, data);
    console.log(`[realtime] Emitted ${event} to all clients`);
  } catch (error) {
    console.error(`[realtime] Error emitting ${event}:`, error.message);
  }
};

/**
 * Emit event to specific user
 */
const emitToUser = (userId, event, data) => {
  try {
    const io = getIO();
    io.to(`user-${userId}`).emit(event, data);
    console.log(`[realtime] Emitted ${event} to user ${userId}`);
  } catch (error) {
    console.error(`[realtime] Error emitting ${event} to user ${userId}:`, error.message);
  }
};

/**
 * Emit event to multiple users
 */
const emitToUsers = (userIds, event, data) => {
  try {
    const io = getIO();
    userIds.forEach(userId => {
      io.to(`user-${userId}`).emit(event, data);
    });
    console.log(`[realtime] Emitted ${event} to ${userIds.length} users`);
  } catch (error) {
    console.error(`[realtime] Error emitting ${event} to users:`, error.message);
  }
};

/**
 * Emit event to admin room
 */
const emitToAdmins = (event, data) => {
  try {
    const io = getIO();
    io.to('admin-room').emit(event, data);
    console.log(`[realtime] Emitted ${event} to admins`);
  } catch (error) {
    console.error(`[realtime] Error emitting ${event} to admins:`, error.message);
  }
};

/**
 * Emit event to a specific room
 */
const emitToRoom = (room, event, data) => {
  try {
    const io = getIO();
    io.to(room).emit(event, data);
    console.log(`[realtime] Emitted ${event} to room ${room}`);
  } catch (error) {
    console.error(`[realtime] Error emitting ${event} to room ${room}:`, error.message);
  }
};

/**
 * Notify about dashboard statistics update
 */
const notifyDashboardUpdate = (role = null) => {
  const event = EVENTS.DASHBOARD_STATS_UPDATED;
  const data = { timestamp: new Date().toISOString(), role };
  
  if (role === 'admin') {
    emitToAdmins(event, data);
  } else {
    emitToAll(event, data);
  }
};

module.exports = {
  EVENTS,
  emitToAll,
  emitToUser,
  emitToUsers,
  emitToAdmins,
  emitToRoom,
  notifyDashboardUpdate,
  getIO,
};
