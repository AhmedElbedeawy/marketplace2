const mongoose = require('mongoose');

// Notification schema with support for routing, deep links, and multi-role targeting
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: null
  },
  message: {
    type: String,
    default: null
  },
  // Arabic translations (optional - for bilingual support)
  titleAr: {
    type: String,
    default: null
  },
  messageAr: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: [
      'order', 'dish', 'promotion', 'system', 'issue', 'announcement',
      'rating', 'rating_reply', 'payout', 'payout_failed', 'order_update',
      'order_issue', 'issue_update', 'account_warning', 'account_restriction',
      'support_message', 'order_issue_admin',
      // Phase 3: Marketing & Retention
      'marketing_cart', 'marketing_reorder', 'marketing_promo', 'marketing_favorite_activity',
      // Phase 3: Digests & Performance
      'digest_cook_weekly', 'cook_performance', 'digest_admin_daily'
    ],
    default: 'system'
  },
  // New fields for Phase 1
  entityType: {
    type: String,
    enum: [
      'order', 'cook', 'promotion', 'issue', 'announcement', 'dish', 'general',
      'review', 'payout', 'account_action', 'support_thread',
      // Phase 3: Marketing & Retention
      'cart', 'campaign', 'digest'
    ],
    default: 'general'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  deepLink: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['foodie', 'cook', 'admin', 'all'],
    default: 'foodie'
  },
  countryCode: {
    type: String,
    uppercase: true,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ role: 1, countryCode: 1, createdAt: -1 });
notificationSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
