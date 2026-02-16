const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  cook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  countryCode: {
    type: String,
    required: [true, 'Please provide country code'],
    trim: true,
    uppercase: true,
    default: 'SA',
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a product description']
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price'],
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  prepTime: {
    type: Number,
    required: [true, 'Please provide preparation time in minutes']
  },
  photoUrl: {
    type: String,
    default: ''
  },
  // Multiple images uploaded by cook (for gallery)
  images: [{
    type: String
  }],
  portionSize: {
    type: String,
    trim: true,
    default: ''
  },
  // VARIANTS: Multi-portion support with per-variant pricing and stock
  variants: [{
    portionKey: {
      type: String,
      required: [true, 'Portion key is required']
    },
    portionLabel: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      required: [true, 'Variant price is required'],
      min: [0, 'Price cannot be negative']
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    }
  }],
  // Dish-specific ratings (order-based aggregates)
  ratingAvg: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Legacy dish ratings (keeping for backward compatibility)
  dishRatings: {
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
    // Individual ratings from users for this specific dish offer
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
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false,
    index: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create index for search
productSchema.index({ name: 'text', description: 'text' });

// Method to add/update dish rating
productSchema.methods.addDishRating = function(userId, rating, review = '') {
  // Check if user already rated this dish offer
  const existingRating = this.dishRatings.userRatings.find(r => r.userId.toString() === userId.toString());
  
  if (existingRating) {
    existingRating.rating = rating;
    existingRating.review = review;
  } else {
    this.dishRatings.userRatings.push({ userId, rating, review });
  }
  
  // Recalculate average
  const totalRating = this.dishRatings.userRatings.reduce((sum, r) => sum + r.rating, 0);
  this.dishRatings.average = parseFloat((totalRating / this.dishRatings.userRatings.length).toFixed(2));
  this.dishRatings.count = this.dishRatings.userRatings.length;
  
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);
