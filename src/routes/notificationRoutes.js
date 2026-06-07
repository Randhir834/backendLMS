const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead,
  deleteNotificationController, sendNotification,
} = require('../controllers/notificationController');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/:id/read', authenticate, markNotificationRead);
router.put('/read-all', authenticate, markAllNotificationsRead);
router.delete('/:id', authenticate, deleteNotificationController);
router.post('/send', authenticate, authorizeRoles('admin'), sendNotification);

module.exports = router;
