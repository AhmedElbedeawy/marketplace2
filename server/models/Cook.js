const mongoose = require('mongoose');

const cookSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Please provide cook name'],
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  storeName: {
    type: String,
    trim: true,
    required: [true, 'Please provide kitchen name']
  },
  countryCode: {
    type: String,
    required: [true, 'Please provide country code'],
    trim: true,
    uppercase: true,
    default: 'SA',
    index: true
  },
  expertise: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpertiseCategory'
  }],
  questionnaire: {
    experienceLevel: String,
    totalOrders: String,
    dailyOrders: String,
    signatureDishes: [String],
    fulfillmentMethods: [String]
  },
  // Profile photo path (stored after circular cropping)
  profilePhoto: {
    type: String,
    default: ''
  },
  // Original uploaded photo before cropping
  originalPhoto: {
    type: String,
    default: ''
  },
  // Rating system
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    // Individual ratings from users
    userRatings: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Admin override for "Top-Rated Cooks"
  isTopRated: {
    type: Boolean,
    default: false
  },
  // Cook status
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'suspended'],
    default: 'pending'
  },
  // Number of dishes offered
  dishesCount: {
    type: Number,
    default: 0
  },
  // Number of orders completed
  ordersCount: {
    type: Number,
    default: 0
  },
  // Phone number
  phone: {
    type: String,
    trim: true
  },
  // Location/Area (Deprecated: use address model)
  area: {
    type: String,
    trim: true
  },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },
  city: { type: String, trim: true, index: true, default: 'Riyadh' },
  // Bio/Description
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  // Availability status
  isAvailable: {
    type: Boolean,
    default: true
  },
  // Social links
  socialLinks: {
    instagram: String,
    facebook: String,
    twitter: String
  },
  // Suspension metadata
  suspensionReason: {
    type: String,
    enum: ['unpaid_invoice', 'policy_violation', 'quality_issues', 'other'],
    trim: true
  },
  suspendedAt: {
    type: Date
  },
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  suspensionNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
cookSchema.index({ isTopRated: 1, 'ratings.average': -1 });
cookSchema.index({ status: 1 });
cookSchema.index({ userId: 1 });

// Virtual for sorting by popularity
cookSchema.virtual('popularity').get(function() {
  // Combine rating and order count for popularity score
  return (this.ratings.average * 0.7) + (Math.log(this.ordersCount + 1) * 0.3);
});

// Method to add/update rating
cookSchema.methods.addRating = function(userId, rating, review = '') {
  // Check if user already rated this cook
  const existingRating = this.ratings.userRatings.find(r => r.userId.toString() === userId.toString());
  
  if (existingRating) {
    existingRating.rating = rating;
    existingRating.review = review;
  } else {
    this.ratings.userRatings.push({ userId, rating, review });
  }
  
  // Recalculate average
  const totalRating = this.ratings.userRatings.reduce((sum, r) => sum + r.rating, 0);
  this.ratings.average = parseFloat((totalRating / this.ratings.userRatings.length).toFixed(2));
  this.ratings.count = this.ratings.userRatings.length;
  
  return this.save();
};

// Method to get top-rated cooks
cookSchema.statics.getTopRatedCooks = function(limit = 5) {
  return this.find({ status: 'active', isAvailable: true })
    .sort({ isTopRated: -1, 'ratings.average': -1, ordersCount: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

module.exports = mongoose.model('Cook', cookSchema);
