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
    trim: true
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  walletId: {
    type: String,
    default: ''
  },
  isCook: {
    type: Boolean,
    default: false
  },
  storeName: {
    type: String,
    trim: true,
    maxlength: [100, 'Store name cannot be more than 100 characters']
  },
  storeStatus: {
    type: String,
    enum: ['pending', 'approved', 'active'],
    default: 'pending'
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'facebook', 'apple'],
    default: 'local'
  },
  providerId: String,
  role: {
    type: String,
    enum: ['foodie', 'cook', 'admin', 'super_admin'],
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
  pickupAddress: {
    type: String,
    trim: true
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