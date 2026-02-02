const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema({
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actionType: {
    type: String,
    required: true,
    enum: [
      'TOGGLE_TOP_RATED',
      'APPROVE_COOK',
      'REJECT_COOK',
      'SUSPEND_COOK',
      'DELETE_COOK',
      'UPDATE_COOK',
      'DELETE_PRODUCT',
      'UPDATE_PRODUCT',
      'SEND_WARNING',
      'APPLY_RESTRICTION',
      'OTHER'
    ]
  },
  targetType: {
    type: String,
    required: true,
    enum: ['cook', 'product', 'user', 'order', 'category', 'other']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot be more than 500 characters']
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
adminActionLogSchema.index({ adminUser: 1, createdAt: -1 });
adminActionLogSchema.index({ actionType: 1, createdAt: -1 });
adminActionLogSchema.index({ targetType: 1, targetId: 1 });
adminActionLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminActionLog', adminActionLogSchema);
