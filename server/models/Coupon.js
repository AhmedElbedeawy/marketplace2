const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'DISABLED'],
    default: 'ACTIVE'
  },
  redemptionsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ campaign: 1 });
couponSchema.index({ status: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
