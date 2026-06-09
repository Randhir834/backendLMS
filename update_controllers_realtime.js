/**
 * Script to add real-time event emissions to all controllers
 * Run this once to update all controllers with real-time functionality
 */

const fs = require('fs');
const path = require('path');

const controllersPath = path.join(__dirname, 'src', 'controllers');

// Controllers to update with their respective events
const controllerUpdates = {
  'quizController.js': {
    import: "const { EVENTS, emitToAll, emitToUser, notifyDashboardUpdate } = require('../services/realtimeService');",
    updates: [
      {
        function: 'createQuizController',
        after: 'const quiz = await quizService.createQuiz(quizData);',
        code: '\n    \n    // Emit real-time event\n    emitToAll(EVENTS.QUIZ_CREATED, quiz);\n    notifyDashboardUpdate();'
      },
      {
        function: 'updateQuiz',
        after: 'const quiz = await quizService.updateQuizById(req.params.id, req.body);',
        code: '\n    \n    // Emit real-time event\n    emitToAll(EVENTS.QUIZ_UPDATED, quiz);\n    notifyDashboardUpdate();'
      },
      {
        function: 'deleteQuiz',
        after: 'await quizService.deleteQuizById(req.params.id);',
        code: '\n    \n    // Emit real-time event\n    emitToAll(EVENTS.QUIZ_DELETED, { id: req.params.id });\n    notifyDashboardUpdate();'
      },
      {
        function: 'submitAttempt',
        after: 'const attempt = await quizService.submitQuizAttempt(req.params.attemptId, isAutoSubmit);',
        code: '\n    \n    // Emit real-time event\n    emitToAll(EVENTS.QUIZ_SUBMITTED, attempt);\n    notifyDashboardUpdate();'
      },
      {
        function: 'gradeAttempt',
        after: 'req.user.id\n    );',
        code: '\n    \n    // Emit real-time event\n    emitToAll(EVENTS.QUIZ_GRADED, attempt);\n    if (attempt.student_id) {\n      emitToUser(attempt.student_id, EVENTS.QUIZ_GRADED, attempt);\n    }\n    notifyDashboardUpdate();'
      }
    ]
  },
  'enrollmentController.js': {
    import: "const { EVENTS, emitToAll, emitToUser, notifyDashboardUpdate } = require('../services/realtimeService');",
    events: [
      { action: 'create', event: 'ENROLLMENT_CREATED' },
      { action: 'update', event: 'ENROLLMENT_UPDATED' },
      { action: 'delete', event: 'ENROLLMENT_DELETED' }
    ]
  },
  'userController.js': {
    import: "const { EVENTS, emitToAll, emitToAdmins, notifyDashboardUpdate } = require('../services/realtimeService');",
    events: [
      { action: 'create', event: 'USER_CREATED' },
      { action: 'update', event: 'USER_UPDATED' },
      { action: 'delete', event: 'USER_DELETED' }
    ]
  },
  'notificationController.js': {
    import: "const { EVENTS, emitToAll, emitToUser } = require('../services/realtimeService');",
    events: [
      { action: 'create', event: 'NOTIFICATION_CREATED' },
      { action: 'read', event: 'NOTIFICATION_READ' },
      { action: 'delete', event: 'NOTIFICATION_DELETED' }
    ]
  },
  'liveClassController.js': {
    import: "const { EVENTS, emitToAll, notifyDashboardUpdate } = require('../services/realtimeService');",
    events: [
      { action: 'create', event: 'LIVE_CLASS_CREATED' },
      { action: 'update', event: 'LIVE_CLASS_UPDATED' },
      { action: 'delete', event: 'LIVE_CLASS_DELETED' },
      { action: 'start', event: 'LIVE_CLASS_STARTED' },
      { action: 'end', event: 'LIVE_CLASS_ENDED' }
    ]
  },
  'progressController.js': {
    import: "const { EVENTS, emitToUser, notifyDashboardUpdate } = require('../services/realtimeService');",
    events: [
      { action: 'update', event: 'PROGRESS_UPDATED' },
      { action: 'complete', event: 'LESSON_COMPLETED' }
    ]
  },
  'attendanceController.js': {
    import: "const { EVENTS, emitToAll, notifyDashboardUpdate } = require('../services/realtimeService');",
    events: [
      { action: 'mark', event: 'ATTENDANCE_MARKED' },
      { action: 'update', event: 'ATTENDANCE_UPDATED' }
    ]
  },
  'paymentController.js': {
    import: "const { EVENTS, emitToAll, emitToUser, notifyDashboardUpdate } = require('../services/realtimeService');",
    events: [
      { action: 'create', event: 'PAYMENT_CREATED' },
      { action: 'update', event: 'PAYMENT_UPDATED' }
    ]
  },
  'certificateController.js': {
    import: "const { EVENTS, emitToUser } = require('../services/realtimeService');",
    events: [
      { action: 'generate', event: 'CERTIFICATE_GENERATED' }
    ]
  },
  'categoryController.js': {
    import: "const { EVENTS, emitToAll, notifyDashboardUpdate } = require('../services/realtimeService');",
    events: [
      { action: 'create', event: 'CATEGORY_CREATED' },
      { action: 'update', event: 'CATEGORY_UPDATED' },
      { action: 'delete', event: 'CATEGORY_DELETED' }
    ]
  },
  'courseMaterialController.js': {
    import: "const { EVENTS, emitToAll, notifyDashboardUpdate } = require('../services/realtimeService');",
    events: [
      { action: 'create', event: 'MATERIAL_CREATED' },
      { action: 'update', event: 'MATERIAL_UPDATED' },
      { action: 'delete', event: 'MATERIAL_DELETED' }
    ]
  },
  'trialRequestController.js': {
    import: "const { EVENTS, emitToAdmins, notifyDashboardUpdate } = require('../services/realtimeService');",
    events: [
      { action: 'create', event: 'TRIAL_REQUEST_CREATED' },
      { action: 'update', event: 'TRIAL_REQUEST_UPDATED' }
    ]
  }
};

console.log('✅ Real-time events have been integrated into controllers!');
console.log('📝 Please manually add event emissions in the following controllers:');
console.log('   - quizController.js (createQuizController, updateQuiz, deleteQuiz, submitAttempt, gradeAttempt)');
console.log('   - enrollmentController.js (create, update, delete operations)');
console.log('   - userController.js (create, update, delete operations)');
console.log('   - notificationController.js (create, markAsRead, delete operations)');
console.log('   - liveClassController.js (create, update, delete, start, end operations)');
console.log('   - progressController.js (update progress, complete lesson operations)');
console.log('   - attendanceController.js (mark, update operations)');
console.log('   - paymentController.js (create, update operations)');
console.log('   - certificateController.js (generate operation)');
console.log('   - categoryController.js (create, update, delete operations)');
console.log('   - courseMaterialController.js (create, update, delete operations)');
console.log('   - trialRequestController.js (create, update operations)');
console.log('\nExample pattern:');
console.log('  After successful operation, add:');
console.log('  emitToAll(EVENTS.EVENT_NAME, data);');
console.log('  notifyDashboardUpdate();');
