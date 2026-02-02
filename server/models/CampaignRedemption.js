const mongoose = require('mongoose');

const campaignRedemptionSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  discountAmount: {
    type: Number,
    required: true
  },
  checkoutSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CheckoutSession'
  }
}, {
  timestamps: true
});

// Indexes
campaignRedemptionSchema.index({ campaign: 1 });
campaignRedemptionSchema.index({ user: 1, campaign: 1 });
campaignRedemptionSchema.index({ coupon: 1 });

module.exports = mongoose.model('CampaignRedemption', campaignRedemptionSchema);
