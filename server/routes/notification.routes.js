const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  updateFCMToken,
  updateNotificationSettings,
  getNotificationSettings,
  broadcastNotification
} = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

// Notification management routes
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

// FCM and settings routes
router.post('/fcm-token', updateFCMToken);
router.get('/settings', getNotificationSettings);
router.put('/settings', updateNotificationSettings);

// Admin broadcast route (admin only)
router.post('/broadcast', adminOnly, broadcastNotification);

module.exports = router;
