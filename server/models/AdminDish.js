const mongoose = require('mongoose');

const adminDishSchema = new mongoose.Schema({
  nameEn: {
    type: String,
    required: [true, 'English name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  nameAr: {
    type: String,
    required: [true, 'Arabic name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  descriptionEn: {
    type: String,
    required: [true, 'English description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  descriptionAr: {
    type: String,
    required: [true, 'Arabic description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  longDescriptionEn: {
    type: String,
    trim: true,
    maxlength: [5000, 'Long description cannot exceed 5000 characters'],
    default: ''
  },
  longDescriptionAr: {
    type: String,
    trim: true,
    maxlength: [5000, 'Long description cannot exceed 5000 characters'],
    default: ''
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  imageUrl: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPopular: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Text index for search
adminDishSchema.index(
  { nameEn: 'text', nameAr: 'text', 'descriptionEn': 'text', 'descriptionAr': 'text' },
  { default_language: 'english' }
);

// Compound indexes
adminDishSchema.index({ category: 1, isActive: 1 });
adminDishSchema.index({ isPopular: 1, isActive: 1 });

// Virtual for offers count (populated separately)
adminDishSchema.virtual('offersCount', {
  ref: 'DishOffer',
  localField: '_id',
  foreignField: 'adminDishId',
  count: true
});

// Virtual for category name (populated)
adminDishSchema.virtual('categoryName', {
  ref: 'Category',
  localField: 'category',
  foreignField: '_id',
  justOne: true
});

// Pre-save validation
adminDishSchema.pre('save', async function(next) {
  // Ensure category exists
  if (this.isModified('category')) {
    const Category = mongoose.model('Category');
    const category = await Category.findById(this.category);
    if (!category) {
      return next(new Error('Invalid category reference'));
    }
  }
  next();
});

// Static method to find active dishes
adminDishSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isActive: true });
};

// Static method to find popular dishes
adminDishSchema.statics.findPopular = function(limit = 10) {
  return this.find({ isPopular: true, isActive: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('category');
};

const AdminDish = mongoose.model('AdminDish', adminDishSchema);

module.exports = AdminDish;
