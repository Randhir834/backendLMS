const {
  findNotificationsByUser, findUnreadCount, createNotification,
  markAsRead, markAllAsRead, deleteNotification, notifyAllUsers, notifyUsersByRole,
} = require('../services/notificationService');

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await findNotificationsByUser(req.user.id);
    res.json({ notifications });
  } catch (error) { next(error); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await findUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) { next(error); }
};

const markNotificationRead = async (req, res, next) => {
  try {
    await markAsRead(req.params.id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) { next(error); }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

const deleteNotificationController = async (req, res, next) => {
  try {
    await deleteNotification(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (error) { next(error); }
};

const sendNotification = async (req, res, next) => {
  try {
    const { title, message, type, target } = req.body;
    let notifications;
    if (target === 'all') {
      notifications = await notifyAllUsers({ title, message, type });
    } else if (target === 'students' || target === 'instructors') {
      notifications = await notifyUsersByRole({ title, message, type, role: target === 'students' ? 'student' : 'instructor' });
    } else {
      notifications = [await createNotification({ user_id: req.body.user_id, title, message, type })];
    }
    res.status(201).json({ message: 'Notification sent', count: notifications.length });
  } catch (error) { next(error); }
};

module.exports = {
  getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead,
  deleteNotificationController, sendNotification,
};
