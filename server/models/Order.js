const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.Mixed, // Allow ObjectId or String for demo/legacy data
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity cannot be less than 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  notes: {
    type: String,
    trim: true
  },
  isUnavailable: {
    type: Boolean,
    default: false
  },
  // Product snapshot at order time
  productSnapshot: {
    name: { type: String },
    image: { type: String },
    description: { type: String }
  }
});

const subOrderSchema = new mongoose.Schema({
  cook: {
    type: mongoose.Schema.Types.Mixed, // Allow ObjectId or String for demo/legacy data
    ref: 'User',
    required: true
  },
  pickupAddress: {
    type: String,
    required: true,
    trim: true
  },
  cookLocationSnapshot: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['order_received', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'order_received'
  },
  prepTime: {
    type: Number // in minutes
  },
  scheduledTime: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  // Combine/Separate delivery/pickup logic
  fulfillmentMode: {
    type: String,
    enum: ['pickup', 'delivery'],
    default: 'pickup'
  },
  timingPreference: {
    type: String,
    enum: ['combined', 'separate'],
    default: 'separate'
  },
  combinedReadyTime: {
    type: Date
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  items: [orderItemSchema]
}, {
  timestamps: true
});

const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkoutSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CheckoutSession'
  },
  // Address snapshot (immutable copy at order time)
  deliveryAddress: {
    addressLine1: {
      type: String,
      required: true,
      trim: true
    },
    addressLine2: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    countryCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'SA'
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    deliveryNotes: {
      type: String,
      trim: true,
      default: ''
    },
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  subOrders: [subOrderSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'partially_delivered', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  // Rating system fields
  hasDispute: {
    type: Boolean,
    default: false
  },
  // Issue/Problem tracking
  hasIssue: {
    type: Boolean,
    default: false
  },
  issue: {
    reportedBy: {
      type: String,
      enum: ['customer', 'cook', 'admin']
    },
    reportedAt: {
      type: Date,
      default: null
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed']
    },
    adminNotes: {
      type: String,
      trim: true,
      default: ''
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  ratingReminderScheduled: {
    type: Boolean,
    default: false
  },
  ratingReminderSentAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
    // VAT Snapshot (immutable copy at order time)
    vatSnapshot: {
      countryCode: String,
      checkoutVatEnabledAtOrder: Boolean,
      checkoutVatRateAtOrder: Number,
      invoiceVatEnabledAtOrder: Boolean,
      invoiceVatRateAtOrder: Number,
      vatAmount: {
        type: Number,
        default: 0
      },
      subtotal: Number,
      total: Number,
      vatLabel: String
    },
    scheduledTime: {
      type: Date
    }
}, {
  timestamps: true
});

// Create indexes for search
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = {
  Order: mongoose.model('Order', orderSchema),
  SubOrder: mongoose.model('SubOrder', subOrderSchema),
  OrderItem: mongoose.model('OrderItem', orderItemSchema)
};