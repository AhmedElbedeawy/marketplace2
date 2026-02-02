const mongoose = require('mongoose');

// Hero image schema
const heroImageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  orderIndex: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Per-country VAT configuration schema
const countryVATSchema = new mongoose.Schema({
  countryCode: {
    type: String,
    required: true,
    uppercase: true
  },
  countryName: {
    type: String,
    required: true
  },
  currencyCode: {
    type: String,
    required: true,
    uppercase: true,
    default: 'SAR'
  },
  // Checkout VAT (applied at order time)
  checkoutVatEnabled: {
    type: Boolean,
    default: false
  },
  checkoutVatRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Invoice VAT (applied to cook invoices)
  invoiceVatEnabled: {
    type: Boolean,
    default: false
  },
  invoiceVatRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  vatLabel: {
    type: String,
    default: 'VAT'
  }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  heroImages: {
    type: [heroImageSchema],
    default: []
  },
  heroAdsCount: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  enableCardPayment: {
    type: Boolean,
    default: false,
  },
  stripePublicKey: {
    type: String,
    default: '',
  },
  stripeSecretKey: {
    type: String,
    default: '',
  },
  // VAT Settings (Per Country)
  vatByCountry: [countryVATSchema],
  
  // Legacy VAT Settings (deprecated - kept for backward compatibility)
  enableVAT: {
    type: Boolean,
    default: false,
  },
  vatRate: {
    type: Number,
    default: 15,
    min: 0,
    max: 100,
  },
  vatLabel: {
    type: String,
    default: 'VAT',
  },
  // Add more settings fields as needed in the future
}, {
  timestamps: true,
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
    console.log('🆕 Created default settings');
  }
  console.log('📖 Fetched settings. VAT Countries count:', settings.vatByCountry?.length || 0);
  console.log('📖 Fetched settings. Hero images count:', settings.heroImages?.length || 0);
  return settings;
};

// Get active hero images sorted by orderIndex
settingsSchema.statics.getActiveHeroImages = async function() {
  const settings = await this.getSettings();
  return settings.heroImages
    .filter(img => img.isActive)
    .sort((a, b) => a.orderIndex - b.orderIndex);
};

// Add new hero image
settingsSchema.statics.addHeroImage = async function(heroImageData) {
  const settings = await this.getSettings();
  const newHeroImage = {
    id: heroImageData.id || `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    imageUrl: heroImageData.imageUrl,
    orderIndex: heroImageData.orderIndex !== undefined ? heroImageData.orderIndex : settings.heroImages.length,
    isActive: heroImageData.isActive !== undefined ? heroImageData.isActive : true,
    updatedAt: new Date()
  };
  
  settings.heroImages.push(newHeroImage);
  await settings.save();
  return newHeroImage;
};

// Update hero image
settingsSchema.statics.updateHeroImage = async function(imageId, updateData) {
  const settings = await this.getSettings();
  const imageIndex = settings.heroImages.findIndex(img => img.id === imageId);
  
  if (imageIndex === -1) {
    throw new Error('Hero image not found');
  }
  
  // Update fields
  if (updateData.imageUrl !== undefined) {
    settings.heroImages[imageIndex].imageUrl = updateData.imageUrl;
  }
  if (updateData.orderIndex !== undefined) {
    settings.heroImages[imageIndex].orderIndex = updateData.orderIndex;
  }
  if (updateData.isActive !== undefined) {
    settings.heroImages[imageIndex].isActive = updateData.isActive;
  }
  
  settings.heroImages[imageIndex].updatedAt = new Date();
  await settings.save();
  return settings.heroImages[imageIndex];
};

// Delete hero image
settingsSchema.statics.deleteHeroImage = async function(imageId) {
  const settings = await this.getSettings();
  const imageIndex = settings.heroImages.findIndex(img => img.id === imageId);
  
  if (imageIndex === -1) {
    throw new Error('Hero image not found');
  }
  
  const deletedImage = settings.heroImages.splice(imageIndex, 1)[0];
  
  // Reorder remaining images
  settings.heroImages.forEach((img, index) => {
    img.orderIndex = index;
  });
  
  await settings.save();
  return deletedImage;
};

// Reorder hero images
settingsSchema.statics.reorderHeroImages = async function(reorderedIds) {
  const settings = await this.getSettings();
  
  // Create a map of current images
  const imageMap = {};
  settings.heroImages.forEach(img => {
    imageMap[img.id] = img;
  });
  
  // Rebuild array with new order
  const reorderedImages = reorderedIds.map((id, index) => ({
    ...imageMap[id],
    orderIndex: index,
    updatedAt: new Date()
  }));
  
  settings.heroImages = reorderedImages;
  await settings.save();
  return reorderedImages;
};

settingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
