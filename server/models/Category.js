const mongoose = require('mongoose');

// Old display order mapping for migration (hardcoded from frontend)
const OLD_DISPLAY_ORDER = [
  'Roasted',      // was id: '1'
  'Grilled',      // was id: '2'
  'Casseroles',   // was id: '3'
  'Traditional',  // was id: '4'
  'Fried',        // was id: '5'
  'Oven',         // was id: '6'
  'Sides'         // was id: '7'
];

const categorySchema = new mongoose.Schema({
  // Legacy name (kept for backward compatibility)
  name: {
    type: String,
    required: [true, 'Please provide a category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  // New bilingual names
  nameEn: {
    type: String,
    required: [true, 'English name is required'],
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  nameAr: {
    type: String,
    required: [true, 'Arabic name is required'],
    trim: true,
    maxlength: [50, 'Arabic category name cannot be more than 50 characters']
  },
  // Description (optional)
  description: {
    type: String,
    trim: true
  },
  descriptionAr: {
    type: String,
    trim: true
  },
  // Icons for different platforms (uploaded images)
  icons: {
    web: {
      type: String,
      default: ''
    },
    mobile: {
      type: String,
      default: ''
    }
  },
  // Legacy icon (single icon, kept for migration)
  icon: {
    type: String,
    trim: true,
    default: ''
  },
  // Display color
  color: {
    type: String,
    default: '#FFB973',
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },
  // Display order (for sorting in UI)
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for search
categorySchema.index({ name: 'text', nameEn: 'text', nameAr: 'text' });
categorySchema.index({ sortOrder: 1, isActive: 1 });

// Virtual for icon URL (fallback to legacy icon if icons.web is empty)
categorySchema.virtual('displayIcon').get(function() {
  return this.icons.web || this.icon || '';
});

// Static method to get old display order
categorySchema.statics.getOldDisplayOrder = function() {
  return OLD_DISPLAY_ORDER;
};

// Static method to get legacy name to sortOrder mapping
categorySchema.statics.getLegacyOrderMap = function() {
  const map = {};
  OLD_DISPLAY_ORDER.forEach((name, idx) => {
    map[name.toLowerCase()] = idx;
  });
  return map;
};

module.exports = mongoose.model('Category', categorySchema);