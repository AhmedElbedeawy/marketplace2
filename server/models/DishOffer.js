const mongoose = require('mongoose');

const prepReadyConfigSchema = new mongoose.Schema({
  optionType: {
    type: String,
    enum: ['fixed', 'range', 'cutoff'],
    default: 'fixed'
  },
  prepTimeMinutes: {
    type: Number,
    min: [5, 'Prep time must be at least 5 minutes'],
    max: [720, 'Prep time cannot exceed 12 hours']
  },
  prepTimeMinMinutes: {
    type: Number,
    min: [5, 'Minimum prep time must be at least 5 minutes']
  },
  prepTimeMaxMinutes: {
    type: Number,
    max: [720, 'Maximum prep time cannot exceed 12 hours']
  },
  cutoffTime: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: null
  },
  beforeCutoffReadyTime: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: null
  },
  afterCutoffDayOffset: {
    type: Number,
    min: [0, 'Day offset cannot be negative'],
    default: 0
  }
}, { _id: false });

const dishOfferSchema = new mongoose.Schema({
  adminDishId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminDish',
    required: [true, 'Admin dish reference is required'],
    index: true
  },
  cook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cook',
    required: [true, 'Cook reference is required'],
    index: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Price must be at least 1'],
    max: [10000, 'Price cannot exceed 10000']
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  images: [{
    type: String,
    default: []
  }],
  portionSize: {
    type: String,
    enum: ['single', 'small', 'medium', 'large', 'family'],
    default: 'medium'
  },
  prepReadyConfig: {
    type: prepReadyConfigSchema,
    default: () => ({ optionType: 'fixed', prepTimeMinutes: 45 })
  },
  fulfillmentModes: {
    pickup: {
      type: Boolean,
      default: true
    },
    delivery: {
      type: Boolean,
      default: false
    }
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: [0, 'Delivery fee cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index: each cook can only offer each admin dish once
dishOfferSchema.index({ cook: 1, adminDishId: 1 }, { unique: true });

// Index for consumer queries
dishOfferSchema.index({ adminDishId: 1, isActive: 1, price: 1 });

// Index for cook's offers
dishOfferSchema.index({ cook: 1, isActive: 1, createdAt: -1 });

// Virtual for admin dish details
dishOfferSchema.virtual('adminDish', {
  ref: 'AdminDish',
  localField: 'adminDishId',
  foreignField: '_id',
  justOne: true
});

// Virtual for cook details
dishOfferSchema.virtual('cookDetails', {
  ref: 'Cook',
  localField: 'cook',
  foreignField: '_id',
  justOne: true
});

// Pre-save validation for prepReadyConfig
dishOfferSchema.pre('save', function(next) {
  if (this.prepReadyConfig) {
    const { optionType, prepTimeMinutes, prepTimeMinMinutes, prepTimeMaxMinutes, cutoffTime } = this.prepReadyConfig;
    
    if (optionType === 'fixed' && (!prepTimeMinutes || prepTimeMinutes < 5)) {
      return next(new Error('Fixed prep time must be at least 5 minutes'));
    }
    
    if (optionType === 'range') {
      if (!prepTimeMinMinutes || !prepTimeMaxMinutes) {
        return next(new Error('Range prep time requires both min and max values'));
      }
      if (prepTimeMinMinutes >= prepTimeMaxMinutes) {
        return next(new Error('Minimum prep time must be less than maximum'));
      }
    }
    
    if (optionType === 'cutoff' && !cutoffTime) {
      return next(new Error('Cutoff time is required for cutoff option type'));
    }
  }
  
  // Ensure at least one fulfillment mode is enabled
  if (!this.fulfillmentModes.pickup && !this.fulfillmentModes.delivery) {
    return next(new Error('At least one fulfillment mode must be enabled'));
  }
  
  next();
});

// Static method to check stock
dishOfferSchema.statics.hasStock = function(offerId) {
  return this.findById(offerId).then(offer => {
    return offer && offer.stock > 0 && offer.isActive;
  });
};

// Static method for cook's active offers
dishOfferSchema.statics.findCookOffers = function(cookId, filter = {}) {
  return this.find({ cook: cookId, ...filter })
    .sort({ createdAt: -1 })
    .populate('adminDish');
};

// Instance method to get display string for prep time
dishOfferSchema.methods.getPrepTimeDisplay = function(language = 'en') {
  const config = this.prepReadyConfig;
  if (!config) return '';
  
  const formatMinutes = (mins) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0) {
      return hours > 1 
        ? `${hours}h ${minutes}m` 
        : `1h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  const formatMinutesAr = (mins) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0) {
      return hours > 1 
        ? `${hours}س ${minutes}د` 
        : `1س ${minutes}د`;
    }
    return `${minutes}د`;
  };
  
  switch (config.optionType) {
    case 'fixed':
      return language === 'ar' ? formatMinutesAr(config.prepTimeMinutes) : formatMinutes(config.prepTimeMinutes);
    case 'range':
      if (language === 'ar') {
        return `${formatMinutesAr(config.prepTimeMinMinutes)} - ${formatMinutesAr(config.prepTimeMaxMinutes)}`;
      }
      return `${formatMinutes(config.prepTimeMinMinutes)} - ${formatMinutes(config.prepTimeMaxMinutes)}`;
    case 'cutoff':
      if (language === 'ar') {
        return `جاهز بحلول ${config.beforeCutoffReadyTime} (طلبات قبل ${config.cutoffTime})`;
      }
      return `Ready by ${config.beforeCutoffReadyTime} (orders before ${config.cutoffTime})`;
    default:
      return '';
  }
};

const DishOffer = mongoose.model('DishOffer', dishOfferSchema);

module.exports = DishOffer;
