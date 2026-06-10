/**
 * Admin Synchronization Service
 * Handles real-time synchronization of admin operations across all connected admins
 * Ensures all admins see the same data and changes in real-time
 */

const broadcastToAllAdmins = (eventType, data) => {
  if (!global.io) {
    console.warn('[AdminSync] Socket.IO not available');
    return;
  }

  global.io.to('admin-room').emit('admin-data-updated', {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString(),
    source: 'admin-operation'
  });

  console.log(`[AdminSync] Broadcasted ${eventType} to all admins`);
};

const broadcastUserUpdate = (userId, userData) => {
  if (!global.io) return;

  // Broadcast to all admins
  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'USER_UPDATED',
    data: {
      userId,
      user: userData,
      action: 'update'
    },
    timestamp: new Date().toISOString()
  });

  // Also notify the specific user
  global.io.to(`user-${userId}`).emit('profile-updated', {
    type: 'PROFILE_UPDATED',
    user: userData,
    message: 'Your profile has been updated by an administrator',
    timestamp: new Date().toISOString()
  });
};

const broadcastUserDelete = (userId, userName) => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'USER_DELETED',
    data: {
      userId,
      userName,
      action: 'delete'
    },
    timestamp: new Date().toISOString()
  });
};

const broadcastUserRoleChange = (userId, newRole, userName) => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'USER_ROLE_CHANGED',
    data: {
      userId,
      newRole,
      userName,
      action: 'role-change'
    },
    timestamp: new Date().toISOString()
  });

  // Notify the user about role change
  global.io.to(`user-${userId}`).emit('role-changed', {
    type: 'ROLE_CHANGED',
    newRole,
    message: 'Your role has been changed by an administrator',
    timestamp: new Date().toISOString()
  });
};

const broadcastCourseUpdate = (courseId, courseData, action = 'update') => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'COURSE_UPDATED',
    data: {
      courseId,
      course: courseData,
      action
    },
    timestamp: new Date().toISOString()
  });

  // Also broadcast to course-specific room for instructors
  global.io.to(`course-${courseId}`).emit('course-updated', {
    type: 'COURSE_UPDATED',
    course: courseData,
    action,
    timestamp: new Date().toISOString()
  });
};

const broadcastCourseDelete = (courseId, courseTitle) => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'COURSE_DELETED',
    data: {
      courseId,
      courseTitle,
      action: 'delete'
    },
    timestamp: new Date().toISOString()
  });

  global.io.to(`course-${courseId}`).emit('course-deleted', {
    type: 'COURSE_DELETED',
    courseId,
    message: 'This course has been deleted',
    timestamp: new Date().toISOString()
  });
};

const broadcastLiveClassUpdate = (liveClassId, liveClassData, action = 'update') => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'LIVE_CLASS_UPDATED',
    data: {
      liveClassId,
      liveClass: liveClassData,
      action
    },
    timestamp: new Date().toISOString()
  });

  // Broadcast to all connected users
  global.io.emit('live-class-updated', {
    type: 'LIVE_CLASS_UPDATED',
    liveClass: liveClassData,
    action,
    timestamp: new Date().toISOString()
  });
};

const broadcastEnrollmentUpdate = (enrollmentId, enrollmentData, action = 'update') => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'ENROLLMENT_UPDATED',
    data: {
      enrollmentId,
      enrollment: enrollmentData,
      action
    },
    timestamp: new Date().toISOString()
  });
};

const broadcastPaymentUpdate = (paymentId, paymentData, action = 'update') => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'PAYMENT_UPDATED',
    data: {
      paymentId,
      payment: paymentData,
      action
    },
    timestamp: new Date().toISOString()
  });
};

const broadcastAssignmentUpdate = (assignmentId, assignmentData, action = 'update') => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'ASSIGNMENT_UPDATED',
    data: {
      assignmentId,
      assignment: assignmentData,
      action
    },
    timestamp: new Date().toISOString()
  });
};

const broadcastQuizUpdate = (quizId, quizData, action = 'update') => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'QUIZ_UPDATED',
    data: {
      quizId,
      quiz: quizData,
      action
    },
    timestamp: new Date().toISOString()
  });
};

const broadcastAnalyticsUpdate = (analyticsData) => {
  if (!global.io) return;

  global.io.to('admin-room').emit('admin-data-updated', {
    type: 'ANALYTICS_UPDATED',
    data: analyticsData,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  broadcastToAllAdmins,
  broadcastUserUpdate,
  broadcastUserDelete,
  broadcastUserRoleChange,
  broadcastCourseUpdate,
  broadcastCourseDelete,
  broadcastLiveClassUpdate,
  broadcastEnrollmentUpdate,
  broadcastPaymentUpdate,
  broadcastAssignmentUpdate,
  broadcastQuizUpdate,
  broadcastAnalyticsUpdate
};
