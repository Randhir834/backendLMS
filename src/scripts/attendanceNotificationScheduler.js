const cron = require('node-cron');
const { checkLowAttendanceAndNotify } = require('../services/attendanceNotificationService');

// Schedule attendance notifications to run daily at 9 AM
const scheduleAttendanceNotifications = () => {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily attendance notification check...');
    
    try {
      const result = await checkLowAttendanceAndNotify();
      console.log(`Attendance notifications completed:`, result);
    } catch (error) {
      console.error('Error in attendance notification scheduler:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust timezone as needed
  });

  // Also run weekly summary on Sundays at 10 AM
  cron.schedule('0 10 * * 0', async () => {
    console.log('Running weekly attendance summary...');
    
    try {
      // You can add weekly summary logic here
      console.log('Weekly attendance summary completed');
    } catch (error) {
      console.error('Error in weekly attendance summary:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York"
  });

  console.log('Attendance notification scheduler initialized');
};

module.exports = {
  scheduleAttendanceNotifications,
};