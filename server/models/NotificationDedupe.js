const mongoose = require('mongoose');

/**
 * NotificationDedupe - Tracks sent notifications to prevent spam
 * Implements cooldowns and dedupe rules per user/notification type
 */
const notificationDedupeSchema = new mongoose.Schema({
  // User who received the notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Notification type for cooldown grouping
  notificationType: {
    type: String,
    required: true,
    index: true
  },
  // Optional entity ID for specific targeting (e.g., specific campaign, cook, order)
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  // Dedupe key for custom grouping (e.g., 'cart:{cartId}', 'cook:{cookId}')
  dedupeKey: {
    type: String,
    index: true
  },
  // When the notification was sent
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Cooldown period in hours (can vary by notification type)
  cooldownHours: {
    type: Number,
    default: 24
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
notificationDedupeSchema.index({ userId: 1, notificationType: 1, sentAt: -1 });
notificationDedupeSchema.index({ userId: 1, dedupeKey: 1, sentAt: -1 });

/**
 * Check if a notification is still in cooldown period
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification
 * @param {string} dedupeKey - Optional dedupe key
 * @param {number} cooldownHours - Cooldown period in hours
 * @returns {Promise<boolean>} - True if in cooldown (should skip)
 */
notificationDedupeSchema.statics.isInCooldown = async function(userId, notificationType, dedupeKey = null, cooldownHours = 24) {
  const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

  const query = {
    userId,
    notificationType,
    sentAt: { $gte: cutoff }
  };

  // If dedupeKey is provided, also check for that specific key
  if (dedupeKey) {
    query.dedupeKey = dedupeKey;
  }

  const existing = await this.findOne(query);
  return !!existing;
};

/**
 * Record a notification was sent
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification
 * @param {string} entityId - Optional entity ID
 * @param {string} dedupeKey - Optional dedupe key
 * @param {number} cooldownHours - Cooldown period in hours
 */
notificationDedupeSchema.statics.recordNotification = async function(userId, notificationType, entityId = null, dedupeKey = null, cooldownHours = 24) {
  await this.create({
    userId,
    notificationType,
    entityId,
    dedupeKey,
    cooldownHours,
    sentAt: new Date()
  });
};

/**
 * Clean up old dedupe records (older than 30 days)
 */
notificationDedupeSchema.statics.cleanupOldRecords = async function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await this.deleteMany({ sentAt: { $lt: thirtyDaysAgo } });
};

module.exports = mongoose.model('NotificationDedupe', notificationDedupeSchema);
