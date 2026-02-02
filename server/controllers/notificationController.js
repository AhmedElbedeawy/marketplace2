const Notification = require('../models/Notification');
const { createNotification, broadcastNotification } = require('../utils/notifications');

/**
 * Get user notifications with pagination and filtering
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

/**
 * Update FCM token for push notifications
 * POST /api/notifications/fcm-token
 */
const updateFCMToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    await require('../models/User').findByIdAndUpdate(userId, { fcmToken });

    res.json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token',
      error: error.message
    });
  }
};

/**
 * Update notification preferences
 * PUT /api/notifications/settings
 */
const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { pushEnabled, emailEnabled, orderNotifications, promotionNotifications, favoriteCookNotifications, systemNotifications } = req.body;

    const updateFields = {};
    if (typeof pushEnabled === 'boolean') updateFields['notificationSettings.pushEnabled'] = pushEnabled;
    if (typeof emailEnabled === 'boolean') updateFields['notificationSettings.emailEnabled'] = emailEnabled;
    if (typeof orderNotifications === 'boolean') updateFields['notificationSettings.orderNotifications'] = orderNotifications;
    if (typeof promotionNotifications === 'boolean') updateFields['notificationSettings.promotionNotifications'] = promotionNotifications;
    if (typeof favoriteCookNotifications === 'boolean') updateFields['notificationSettings.favoriteCookNotifications'] = favoriteCookNotifications;
    if (typeof systemNotifications === 'boolean') updateFields['notificationSettings.systemNotifications'] = systemNotifications;

    await require('../models/User').findByIdAndUpdate(userId, { $set: updateFields });

    res.json({
      success: true,
      message: 'Notification settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings',
      error: error.message
    });
  }
};

/**
 * Get notification preferences
 * GET /api/notifications/settings
 */
const getNotificationSettings = async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.user._id).select('notificationSettings fcmToken');

    res.json({
      success: true,
      data: {
        settings: user.notificationSettings,
        hasFcmToken: !!user.fcmToken
      }
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification settings',
      error: error.message
    });
  }
};

/**
 * Broadcast notification to users by role/country (Admin only)
 * POST /api/notifications/broadcast
 */
const handleBroadcastNotification = async (req, res) => {
  try {
    const { title, message, type = 'announcement', role = 'all', countryCode } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    const count = await broadcastNotification({
      title,
      message,
      type,
      role,
      countryCode
    });

    res.json({
      success: true,
      message: `Broadcast sent to ${count} users`,
      data: { count }
    });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast notification',
      error: error.message
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  updateFCMToken,
  updateNotificationSettings,
  getNotificationSettings,
  broadcastNotification: handleBroadcastNotification
};
