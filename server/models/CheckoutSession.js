const mongoose = require('mongoose');

const checkoutSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PRICED', 'PAYMENT_PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED'],
    default: 'DRAFT'
  },
  // Cart snapshot
  cartSnapshot: [{
    cook: {
      type: mongoose.Schema.Types.Mixed, // Allow ObjectId or String for demo/legacy data
      ref: 'User'
    },
    dish: {
      type: mongoose.Schema.Types.Mixed, // Allow ObjectId or String for demo/legacy data
      ref: 'Product'
    },
    dishName: String,
    quantity: {
      type: Number,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true
    },
    notes: String,
    fulfillmentMode: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'pickup'
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    prepTime: Number,
    prepReadyConfig: mongoose.Schema.Types.Mixed
  }],
  // Cook preferences (combine/separate timing)
  cookPreferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Address snapshot (complete address at checkout time)
  addressSnapshot: {
    addressLine1: String,
    addressLine2: String,
    city: String,
    countryCode: String,
    label: String,
    deliveryNotes: String,
    lat: Number,
    lng: Number
  },
  // Pricing breakdown
  pricingBreakdown: {
    subtotal: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    autoDiscount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    netTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    vatRate: Number,
    vatLabel: String,
    checkoutVatEnabled: Boolean,
    invoiceVatEnabled: Boolean,
    invoiceVatRate: Number,
    countryCode: String,
    currencyCode: String,
    debug: mongoose.Schema.Types.Mixed
  },
  // Coupon
  appliedCoupon: {
    code: String,
    campaignId: mongoose.Schema.Types.ObjectId,
    discountAmount: Number
  },
  // Payment
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD'],
    default: 'CASH'
  },
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PAID', 'FAILED'],
    default: 'UNPAID'
  },
  paymentIntentId: String, // Stripe payment intent ID
  // Idempotency
  idempotencyKey: String,
  // Expiration
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
  }
}, {
  timestamps: true
});

// Indexes
checkoutSessionSchema.index({ user: 1, status: 1 });
checkoutSessionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
checkoutSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CheckoutSession', checkoutSessionSchema);
