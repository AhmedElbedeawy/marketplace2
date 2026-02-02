const mongoose = require('mongoose');

// Individual dish rating within an order
const dishRatingItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    trim: true,
    maxlength: [500, 'Review cannot be more than 500 characters']
  }
});

// Order-based rating schema
const orderRatingSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true // One rating per order
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Array of dish ratings for this order
  dishRatings: [dishRatingItemSchema],
  // Overall satisfaction (optional, can be derived from dish ratings)
  overallRating: {
    type: Number,
    min: 1,
    max: 5
  },
  // Edit window tracking
  editCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 2 // Maximum 2 edits allowed
  },
  // Reminder tracking
  reminderShown: {
    type: Boolean,
    default: false
  },
  reminderShownAt: {
    type: Date
  },
  // Cook reply to review
  cookReply: {
    type: String,
    trim: true,
    maxlength: [500, 'Reply cannot be more than 500 characters']
  },
  cookReplyAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Ensure one rating per order per user
orderRatingSchema.index({ order: 1 }, { unique: true });
orderRatingSchema.index({ customer: 1 });
orderRatingSchema.index({ cook: 1 });

// Method to calculate overall rating from dish ratings
orderRatingSchema.methods.calculateOverallRating = function() {
  if (this.dishRatings.length === 0) return 0;
  const sum = this.dishRatings.reduce((acc, item) => acc + item.rating, 0);
  this.overallRating = parseFloat((sum / this.dishRatings.length).toFixed(2));
  return this.overallRating;
};

// Method to check if rating can be edited
orderRatingSchema.methods.canEdit = async function() {
  // Check edit count limit
  if (this.editCount >= 2) {
    return { canEdit: false, reason: 'Maximum edit limit (2) reached' };
  }

  // Check if within 7-day edit window
  const EDIT_WINDOW_DAYS = 7;
  const editWindowEnd = new Date(this.createdAt);
  editWindowEnd.setDate(editWindowEnd.getDate() + EDIT_WINDOW_DAYS);
  
  if (new Date() > editWindowEnd) {
    return { canEdit: false, reason: 'Edit window expired (7 days from rating submission)' };
  }

  // Check if order has dispute
  const Order = mongoose.model('Order');
  const order = await Order.findById(this.order);
  if (order && order.hasDispute) {
    return { canEdit: false, reason: 'Rating editing disabled due to order dispute' };
  }

  return { canEdit: true };
};

// Method to get remaining edit window time
orderRatingSchema.methods.getEditWindowInfo = function() {
  const EDIT_WINDOW_DAYS = 7;
  const editWindowEnd = new Date(this.createdAt);
  editWindowEnd.setDate(editWindowEnd.getDate() + EDIT_WINDOW_DAYS);
  
  const now = new Date();
  const timeRemaining = editWindowEnd - now;
  const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));
  
  return {
    editWindowEnd,
    daysRemaining,
    isExpired: now > editWindowEnd,
    editsRemaining: Math.max(0, 2 - this.editCount)
  };
};

module.exports = mongoose.model('OrderRating', orderRatingSchema);
