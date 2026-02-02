const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['COUPON', 'DISCOUNT'],
    required: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED'],
    default: 'DRAFT'
  },
  // Country targeting for notifications
  countryCode: {
    type: String,
    uppercase: true,
    default: null // null means all countries
  },
  // Schedule
  startAt: {
    type: Date,
    required: true
  },
  endAt: {
    type: Date,
    required: true
  },
  // Scope
  scope: {
    applyToAll: {
      type: Boolean,
      default: false
    },
    cookIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    categoryIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    dishIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }]
  },
  // Discount settings (for both COUPON and DISCOUNT)
  discountPercent: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  maxDiscountAmount: {
    type: Number,
    default: null // No cap if null
  },
  minOrderValue: {
    type: Number,
    default: 0
  },
  // Limits
  maxRedemptionsPerUser: {
    type: Number,
    default: 1
  },
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ status: 1, startAt: 1, endAt: 1 });
campaignSchema.index({ type: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
