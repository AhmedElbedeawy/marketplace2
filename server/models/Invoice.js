const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ['payoneer', 'bank_transfer', 'other']
  },
  referenceId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: true });

const lineItemSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  subOrder: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  gross: {
    type: Number,
    required: true,
    min: 0
  },
  commission: {
    type: Number,
    required: true,
    min: 0
  },
  vat: {
    type: Number,
    default: 0,
    min: 0
  },
  net: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  cook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cook',
    required: true,
    index: true
  },
  periodMonth: {
    type: String,
    required: true,
    trim: true,
    // Format: YYYY-MM
    match: /^\d{4}-\d{2}$/
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'issued', 'locked', 'paid', 'void'],
    default: 'draft',
    index: true
  },
  // Amounts
  grossAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    default: 0
  },
  vatAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'SAR',
    trim: true
  },
  // Dates
  issuedAt: {
    type: Date,
    index: true
  },
  dueAt: {
    type: Date
  },
  paidAt: {
    type: Date
  },
  // Snapshot fields
  countryCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  vatSnapshot: {
    vatEnabled: Boolean,
    vatRate: Number,
    vatLabel: String
  },
  currencySnapshot: {
    type: String,
    trim: true
  },
  // Line items
  lineItems: [lineItemSchema],
  // Payment summary
  amountDue: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  // Payment link (Payoneer or other)
  paymentLink: {
    type: String,
    trim: true
  },
  paymentLinkUpdatedAt: {
    type: Date
  },
  paymentLinkUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Payout history
  payouts: [payoutSchema],
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

// Indexes for efficient queries
invoiceSchema.index({ cook: 1, periodMonth: -1 });
invoiceSchema.index({ cook: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ issuedAt: -1 });

// Virtual to check if overdue
invoiceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'void' || !this.dueAt) {
    return false;
  }
  return new Date() > this.dueAt;
});

// Virtual to calculate outstanding balance
invoiceSchema.virtual('outstandingBalance').get(function() {
  return Math.max(0, this.amountDue - this.amountPaid);
});

// Method to mark as paid
invoiceSchema.methods.markAsPaid = function(paidBy) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.amountPaid = this.amountDue;
  this.updatedBy = paidBy;
  return this.save();
};

// Static method to get latest invoice for a cook
invoiceSchema.statics.getLatestForCook = function(cookId) {
  return this.findOne({ cook: cookId })
    .sort({ periodMonth: -1, issuedAt: -1 })
    .exec();
};

module.exports = mongoose.model('Invoice', invoiceSchema);
