const Notification = require('../models/Notification');
const User = require('../models/User');
const Message = require('../models/Message');

/**
 * Create a notification and optionally send push notification
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - User ID to send notification to
 * @param {string} params.role - Target role: 'customer', 'cook', 'admin', 'all'
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.type - Notification type: 'order', 'dish', 'promotion', 'system', 'issue', 'announcement'
 * @param {string} params.entityType - Related entity type: 'order', 'cook', 'promotion', 'issue', 'announcement', 'dish', 'general'
 * @param {mongoose.Schema.Types.ObjectId} params.entityId - Related entity ID
 * @param {string} params.deepLink - Deep link route for navigation
 * @param {string} params.countryCode - Country code for targeting (SA, EG, AE, KW, QA)
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async ({
  userId,
  role = 'foodie',
  title,
  message,
  type = 'system',
  entityType = 'general',
  entityId = null,
  deepLink = null,
  countryCode = null
}) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      entityType,
      entityId,
      deepLink,
      role,
      countryCode
    });

    console.log(`Notification created for user ${userId}: ${title}`);

    // Send push notification if user has FCM token and settings allow it
    await sendPushIfAvailable(userId, { title, message, deepLink, type });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Send push notification if user has FCM token and settings allow it
 * @param {string} userId - User ID
 * @param {Object} payload - Push notification payload
 * @param {string} payload.type - Notification type for settings check
 */
const sendPushIfAvailable = async (userId, payload) => {
  try {
    const user = await User.findById(userId).select('fcmToken notificationSettings');
    
    if (!user || !user.fcmToken) {
      return; // No FCM token
    }
    
    const settings = user.notificationSettings || {};
    
    // Check if push notifications are enabled
    if (!settings.pushEnabled) {
      return; // Push disabled globally
    }
    
    // Check type-specific settings
    const notificationType = payload.type || 'system';
    
    // Marketing notifications require explicit opt-in (promotionNotifications)
    const marketingTypes = ['marketing_cart', 'marketing_reorder', 'marketing_promo', 'marketing_favorite_activity'];
    if (marketingTypes.includes(notificationType)) {
      if (!settings.promotionNotifications) return;
    }
    
    // Order-related notifications
    else if (['order', 'order_update', 'order_issue'].includes(notificationType)) {
      if (!settings.orderNotifications) return;
    }
    
    // Favorite cook activity
    else if (notificationType === 'dish') {
      if (!settings.favoriteCookNotifications) return;
    }
    
    // System notifications (important transactional messages - not blocked by marketing settings)
    else if (
      notificationType === 'system' ||
      notificationType === 'announcement' ||
      notificationType === 'issue' ||
      notificationType === 'issue_update' ||
      notificationType === 'account_warning' ||
      notificationType === 'account_restriction' ||
      notificationType === 'support_message' ||
      notificationType === 'payout' ||
      notificationType === 'payout_failed' ||
      notificationType === 'rating' ||
      notificationType === 'rating_reply' ||
      notificationType === 'cook_performance' ||
      notificationType === 'digest_cook_weekly' ||
      notificationType === 'digest_admin_daily'
    ) {
      if (!settings.systemNotifications) return;
    }
    
    // Fallback for unknown types
    else {
      if (!settings.systemNotifications) return;
    }
    
    // Import and call FCM service (lazy import to avoid circular deps)
    try {
      const { sendPushNotification } = require('./fcmService');
      await sendPushNotification({
        token: user.fcmToken,
        title: payload.title,
        body: payload.message,
        data: { deepLink: payload.deepLink || '' }
      });
    } catch (fcmError) {
      console.log('FCM not available or configured:', fcmError.message);
    }
  } catch (error) {
    console.error('Error checking user for FCM:', error);
  }
};

/**
 * Send notification to multiple users by role and optionally country
 * @param {Object} params - Filter parameters
 * @param {string} params.role - Target role
 * @param {string} params.countryCode - Optional country filter
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.type - Notification type
 * @param {string} params.entityType - Entity type
 * @param {string} params.entityId - Entity ID
 * @param {string} params.deepLink - Deep link
 */
const broadcastNotification = async ({
  role = 'all',
  countryCode = null,
  title,
  message,
  type = 'announcement',
  entityType = 'announcement',
  entityId = null,
  deepLink = null,
  senderId = null // Admin user ID who sent broadcast
}) => {
  try {
    // Build query for users
    const query = {};
    if (role !== 'all') {
      query.role = role;
    }
    if (countryCode) {
      query.countryCode = countryCode;
    }

    const users = await User.find(query).select('_id');
    const notifications = users.map(user =>
      createNotification({
        userId: user._id,
        role,
        title,
        message,
        type,
        entityType,
        entityId,
        deepLink,
        countryCode
      })
    );

    // Also create in-app messages if senderId is provided
    if (senderId) {
      const messageRecords = users.map(user => ({
        sender: senderId,
        recipient: user._id,
        subject: title,
        body: message,
        isRead: false
      }));
      await Message.insertMany(messageRecords);
      console.log(`Created ${messageRecords.length} in-app messages for broadcast`);
    }

    await Promise.all(notifications);
    console.log(`Broadcast notification sent to ${users.length} users`);
    return users.length;
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    throw error;
  }
};

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use createNotification instead
 */
const sendNotification = async ({ userId, title, message, type = 'system' }) => {
  return createNotification({
    userId,
    title,
    message,
    type,
    entityType: 'general'
  });
};

module.exports = {
  createNotification,
  broadcastNotification,
  sendNotification,
  sendPushIfAvailable
};
