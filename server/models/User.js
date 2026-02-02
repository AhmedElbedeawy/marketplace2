const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  role_cook_status: {
    type: String,
    enum: ['none', 'pending', 'active', 'rejected', 'suspended'],
    default: 'none'
  },
  isCook: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  countryCode: {
    type: String,
    required: [true, 'Please provide country code'],
    trim: true,
    uppercase: true,
    default: 'SA',
    index: true
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  walletId: {
    type: String,
    default: ''
  },
  storeName: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    maxlength: [100, 'Store name cannot be more than 100 characters']
  },
  questionnaire: {
    experienceLevel: String,
    totalOrders: String,
    dailyOrders: String,
    signatureDishes: [String],
    fulfillmentMethods: [String]
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'facebook', 'apple'],
    default: 'local'
  },
  providerId: String,
  role: {
    type: String,
    enum: ['foodie', 'admin', 'super_admin'],
    default: 'foodie'
  },
  favorites: {
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    cooks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  preferredView: {
    type: String,
    enum: ['foodie', 'cook'],
    default: 'foodie'
  },
  pickupAddress: { // Deprecated: use Address model
    type: String,
    trim: true
  },
  expertise: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpertiseCategory'
  }],
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
    default: ''
  },
  // Cook rating aggregates (derived from dish ratings)
  cookRatingAvg: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  cookRatingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Admin boost flag (internal use only, not exposed in public API)
  adminBoost: {
    type: Boolean,
    default: false,
    index: true
  },
  // FCM Push Notification Token
  fcmToken: {
    type: String,
    default: null
  },
  // Notification preferences
  notificationSettings: {
    pushEnabled: {
      type: Boolean,
      default: true
    },
    emailEnabled: {
      type: Boolean,
      default: false
    },
    orderNotifications: {
      type: Boolean,
      default: true
    },
    promotionNotifications: {
      type: Boolean,
      default: true
    },
    favoriteCookNotifications: {
      type: Boolean,
      default: true
    },
    systemNotifications: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

module.exports = mongoose.model('User', userSchema);

