const mongoose = require('mongoose');

// Cart item schema - CONTENT + DISPLAY SNAPSHOT (no pricing logic)
const cartItemSchema = new mongoose.Schema({
  offerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DishOffer', 
    required: true 
  },
  adminDishId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdminDish' 
  },
  cookId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  portionKey: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  fulfillmentMode: { 
    type: String, 
    enum: ['delivery', 'pickup'], 
    default: 'delivery' 
  },
  countryCode: { 
    type: String, 
    required: true, 
    default: 'SA' 
  },
  // Display snapshot (for cross-platform rendering)
  dishName: { type: String },
  photoUrl: { type: String },
  cookName: { type: String },
  priceAtAdd: { type: Number },
  deliveryFee: { type: Number, default: 0 },
  prepTime: { type: Number, default: 30 }
}, { _id: false }); // No auto _id for subdocuments

// Cart schema - one cart per user per country
const cartSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  countryCode: { 
    type: String, 
    required: true, 
    default: 'SA' 
  },
  items: [cartItemSchema]
}, {
  timestamps: true // createdAt, updatedAt
});

// Unique compound index: one cart per user per country
cartSchema.index({ user: 1, countryCode: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);
