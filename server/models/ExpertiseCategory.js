const mongoose = require('mongoose');

const expertiseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide an expertise name'],
    trim: true,
    maxlength: [100, 'Expertise name cannot be more than 100 characters']
  },
  nameAr: {
    type: String,
    trim: true,
    maxlength: [100, 'Arabic expertise name cannot be more than 100 characters']
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create index for fast lookups
expertiseCategorySchema.index({ normalizedName: 1 });

module.exports = mongoose.model('ExpertiseCategory', expertiseCategorySchema);
