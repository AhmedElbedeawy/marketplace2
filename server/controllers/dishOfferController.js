const DishOffer = require('../models/DishOffer');
const AdminDish = require('../models/AdminDish');
const Cook = require('../models/Cook');
const Joi = require('joi');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Configure upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR, 'offers')
  : path.join(__dirname, '../uploads/offers');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPG, and WEBP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter
});

// Process and save image (800×600, JPG quality 85)
const processAndSaveImage = async (buffer, cookId, index) => {
  const filename = `offer-${cookId}-${index}-${Date.now()}.jpg`;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  await sharp(buffer)
    .resize(800, 600, {
      position: 'center',
      fit: 'cover'
    })
    .jpeg({ quality: 85, progressive: true })
    .toFile(filepath);
  
  return `/uploads/offers/${filename}`;
};

// Delete offer image file
const deleteOfferImage = async (imageUrl) => {
  if (!imageUrl) return;
  
  const filepath = path.join(__dirname, '..', imageUrl);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
};

// Delete all images for an offer
const deleteAllOfferImages = async (images) => {
  for (const imageUrl of images) {
    await deleteOfferImage(imageUrl);
  }
};

// Validation schema for prep ready config
const prepReadyConfigSchema = Joi.object({
  optionType: Joi.string().valid('fixed', 'range', 'cutoff').default('fixed'),
  prepTimeMinutes: Joi.number().min(5).max(720).when('optionType', {
    is: 'fixed',
    then: Joi.required()
  }),
  prepTimeMinMinutes: Joi.number().min(5).max(720).when('optionType', {
    is: 'range',
    then: Joi.required()
  }),
  prepTimeMaxMinutes: Joi.number().min(5).max(720).when('optionType', {
    is: 'range',
    then: Joi.required()
  }),
  cutoffTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).when('optionType', {
    is: 'cutoff',
    then: Joi.required()
  }),
  beforeCutoffReadyTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).when('optionType', {
    is: 'cutoff',
    then: Joi.required()
  }),
  afterCutoffDayOffset: Joi.number().min(0).default(0)
});

// Validation schema for dish offer
const dishOfferSchema = Joi.object({
  adminDishId: Joi.string().hex().length(24).required(),
  price: Joi.number().min(1).max(10000).required(),
  stock: Joi.number().min(0).default(0),
  portionSize: Joi.string().valid('single', 'small', 'medium', 'large', 'family').default('medium'),
  prepReadyConfig: prepReadyConfigSchema.default({ optionType: 'fixed', prepTimeMinutes: 45 }),
  fulfillmentModes: Joi.object({
    pickup: Joi.boolean().default(true),
    delivery: Joi.boolean().default(false)
  }).default({ pickup: true, delivery: false }),
  deliveryFee: Joi.number().min(0).default(0),
  isActive: Joi.boolean().default(true)
});

// GET cook's own offers
const getMyOffers = async (req, res) => {
  try {
    // Look up Cook by userId (the User's _id)
    const cook = await Cook.findOne({ userId: req.user._id });
    
    if (!cook) {
      return res.status(400).json({ message: 'Cook profile not found' });
    }
    
    const { active, adminDishId } = req.query;
    const filter = { cook: cook._id };
    
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    
    if (adminDishId) {
      filter.adminDishId = adminDishId;
    }
    
    const offers = await DishOffer.find(filter)
      .sort({ createdAt: -1 })
      .populate('adminDish', 'nameEn nameAr imageUrl category')
      .populate('cook', 'storeName profilePhoto ratings');
    
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single offer
const getOfferById = async (req, res) => {
  try {
    const offer = await DishOffer.findById(req.params.id)
      .populate('adminDish', 'nameEn nameAr descriptionEn descriptionAr imageUrl category')
      .populate('cook', 'storeName profilePhoto ratings');
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to get Cook profile from authenticated user
const getCookFromUser = async (userId) => {
  // Handle both ObjectId and string IDs (for demo/legacy data)
  const mongoose = require('mongoose');
  
  // Try exact match first
  let cook = await Cook.findOne({ userId: userId });
  
  // If not found and userId is a valid ObjectId string, try with ObjectId
  if (!cook && typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)) {
    cook = await Cook.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  }
  
  // If still not found, the user might be a demo cook with string ID
  // Try finding by _id if userId matches cook _id pattern
  if (!cook && typeof userId === 'string') {
    cook = await Cook.findOne({ _id: userId });
  }
  
  return cook;
};

// Helper to safely parse JSON fields from FormData
const parseJsonField = (value, fieldName) => {
  if (!value) return undefined;
  if (typeof value === 'object') return value; // Already parsed
  try {
    return JSON.parse(value);
  } catch (e) {
    throw new Error(`${fieldName} must be valid JSON`);
  }
};

// POST create new offer
const createOffer = async (req, res) => {
  // IMMEDIATE LOG - before anything else
  console.log('\n\n🔥🔥🔥 CREATE OFFER ENDPOINT HIT 🔥🔥🔥');
  console.log('Timestamp:', new Date().toISOString());
  console.log('req.files:', req.files);
  console.log('req.files?.length:', req.files?.length);
  console.log('req.body keys:', Object.keys(req.body));
  
  try {
    console.log('🔄 DishOfferController: createOffer called');
    console.log('📋 Request body:', {
      adminDishId: req.body.adminDishId,
      price: req.body.price,
      stock: req.body.stock,
      portionSize: req.body.portionSize
    });
    console.log('📁 Files received:', req.files?.length || 0);
    
    // Look up Cook by userId
    const cook = await getCookFromUser(req.user._id);
    
    if (!cook) {
      console.log('❌ Cook not found for userId:', req.user._id);
      return res.status(400).json({ message: 'Cook profile not found' });
    }
    
    console.log('✅ Cook found:', cook.storeName || cook.name, cook._id);

    // Parse JSON fields from FormData (they come as strings)
    const prepReadyConfig = parseJsonField(req.body.prepReadyConfig, 'prepReadyConfig');
    const fulfillmentModes = parseJsonField(req.body.fulfillmentModes, 'fulfillmentModes');
    
    // Build validated data object
    const offerData = {
      adminDishId: req.body.adminDishId,
      price: parseFloat(req.body.price),
      stock: req.body.stock !== undefined ? parseInt(req.body.stock) : 0,
      portionSize: req.body.portionSize || 'medium',
      prepReadyConfig,
      fulfillmentModes,
      isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' || req.body.isActive : true
    };
    
    // Validate input
    const { error, value } = dishOfferSchema.validate(offerData);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    // Verify admin dish exists
    const adminDish = await AdminDish.findById(value.adminDishId);
    if (!adminDish) {
      return res.status(404).json({ message: 'Admin dish not found' });
    }
    
    // Check if cook already has an offer for this admin dish
    const existingOffer = await DishOffer.findOne({
      cook: cook._id,
      adminDishId: value.adminDishId
    });
    
    if (existingOffer) {
      return res.status(400).json({ message: 'You already have an offer for this dish. Please edit the existing offer.' });
    }
    
    // Process uploaded images (max 5)
    const images = [];
    console.log('📁 Processing images:', req.files?.length || 0, 'files received');
    if (req.files && req.files.length > 0) {
      const maxImages = Math.min(req.files.length, 5);
      for (let i = 0; i < maxImages; i++) {
        const imageUrl = await processAndSaveImage(req.files[i].buffer, cook._id, i);
        images.push(imageUrl);
        console.log('  ✓ Saved image', i, ':', imageUrl);
      }
    }
    console.log('📁 Total images to save:', images.length);
    
    // Build final offer data
    const finalOfferData = {
      adminDishId: value.adminDishId,
      cook: cook._id,
      price: value.price,
      stock: value.stock || 0,
      portionSize: value.portionSize,
      prepReadyConfig: value.prepReadyConfig,
      fulfillmentModes: value.fulfillmentModes,
      deliveryFee: parseFloat(req.body.deliveryFee) || 0,
      isActive: value.isActive !== undefined ? value.isActive : true,
      images
    };
    
    const offer = await DishOffer.create(finalOfferData);
    
    console.log('✅ DishOffer created successfully:', offer._id);
    console.log('   Images saved:', offer.images);
    
    const populatedOffer = await DishOffer.findById(offer._id)
      .populate('adminDish', 'nameEn nameAr descriptionEn descriptionAr imageUrl category')
      .populate('cook', 'storeName profilePhoto ratings');
    
    console.log('📤 Sending response with populated offer');
    res.status(201).json(populatedOffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT update offer
const updateOffer = async (req, res) => {
  try {
    // Look up Cook by userId
    const cook = await getCookFromUser(req.user._id);
    
    if (!cook) {
      return res.status(400).json({ message: 'Cook profile not found' });
    }
    
    // Validate input (all fields optional except stock which might be separate endpoint)
    const updateSchema = Joi.object({
      adminDishId: Joi.string().hex().length(24),
      price: Joi.number().min(1).max(10000),
      stock: Joi.number().min(0),
      portionSize: Joi.string().valid('single', 'small', 'medium', 'large', 'family'),
      prepReadyConfig: prepReadyConfigSchema,
      fulfillmentModes: Joi.object({
        pickup: Joi.boolean(),
        delivery: Joi.boolean()
      }),
      isActive: Joi.boolean()
    });
    
    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    const offer = await DishOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Verify ownership
    if (offer.cook.toString() !== cook._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this offer' });
    }
    
    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      // Delete old images
      if (offer.images && offer.images.length > 0) {
        await deleteAllOfferImages(offer.images);
      }
      
      // Process new images (max 5)
      const newImages = [];
      const maxImages = Math.min(req.files.length, 5);
      for (let i = 0; i < maxImages; i++) {
        const imageUrl = await processAndSaveImage(req.files[i].buffer, cook._id, i);
        newImages.push(imageUrl);
      }
      offer.images = newImages;
    }
    
    // Update fields
    if (value.adminDishId) offer.adminDishId = value.adminDishId;
    if (value.price !== undefined) offer.price = value.price;
    if (value.stock !== undefined) offer.stock = value.stock;
    if (value.portionSize) offer.portionSize = value.portionSize;
    if (value.prepReadyConfig) offer.prepReadyConfig = value.prepReadyConfig;
    if (value.fulfillmentModes) offer.fulfillmentModes = value.fulfillmentModes;
    if (req.body.deliveryFee !== undefined) offer.deliveryFee = parseFloat(req.body.deliveryFee) || 0;
    if (value.isActive !== undefined) offer.isActive = value.isActive;
    
    await offer.save();
    
    const populatedOffer = await DishOffer.findById(offer._id)
      .populate('adminDish', 'nameEn nameAr descriptionEn descriptionAr imageUrl category')
      .populate('cook', 'storeName profilePhoto ratings');
    
    res.json(populatedOffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH update stock only
const updateStock = async (req, res) => {
  try {
    // Look up Cook by userId
    const cook = await getCookFromUser(req.user._id);
    
    if (!cook) {
      return res.status(400).json({ message: 'Cook profile not found' });
    }
    
    const { stock } = req.body;
    
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ message: 'Valid stock value is required' });
    }
    
    const offer = await DishOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Verify ownership
    if (offer.cook.toString() !== cook._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this offer' });
    }
    
    offer.stock = stock;
    await offer.save();
    
    res.json({ message: 'Stock updated', stock: offer.stock });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE soft delete offer
const deleteOffer = async (req, res) => {
  try {
    // Look up Cook by userId
    const cook = await getCookFromUser(req.user._id);
    
    if (!cook) {
      return res.status(400).json({ message: 'Cook profile not found' });
    }
    
    const offer = await DishOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Verify ownership
    if (offer.cook.toString() !== cook._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this offer' });
    }
    
    // Soft delete - just mark as inactive
    offer.isActive = false;
    await offer.save();
    
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUBLIC ENDPOINTS (used in Phase 3)

// GET popular offers
const getPopularOffers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // For now, get offers from popular admin dishes
    const popularDishes = await AdminDish.findPopular(parseInt(limit));
    const dishIds = popularDishes.map(d => d._id);
    
    const offers = await DishOffer.find({ 
      adminDishId: { $in: dishIds },
      isActive: true,
      stock: { $gt: 0 }
    })
      .sort({ 'ratings.average': -1, 'ratings.count': -1 })
      .limit(parseInt(limit) * 3)
      .populate('adminDish', 'nameEn nameAr imageUrl')
      .populate('cook', 'storeName profilePhoto ratings');
    
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET offers by admin dish
const getOffersByAdminDish = async (req, res) => {
  try {
    const { adminDishId } = req.params;
    const { lat, lng } = req.query;
    
    const filter = { 
      adminDishId,
      isActive: true,
      stock: { $gt: 0 }
    };
    
    const offers = await DishOffer.find(filter)
      .sort({ price: 1, 'ratings.average': -1 })
      .populate('adminDish', 'nameEn nameAr imageUrl descriptionEn descriptionAr')
      .populate('cook', 'storeName profilePhoto ratings expertise city');
    
    console.log('🔍 getOffersByAdminDish - Found', offers.length, 'offers');
    offers.forEach((offer, i) => {
      console.log(`  Offer ${i}: _id=${offer._id}, images=`, offer.images);
    });
    
    // Add prepReadyDisplay for both languages to each offer
    const offersWithPrepDisplay = offers.map(offer => {
      const offerObj = offer.toObject();
      offerObj.prepReadyDisplay = {
        en: offer.getPrepTimeDisplay('en'),
        ar: offer.getPrepTimeDisplay('ar')
      };
      return offerObj;
    });
    
    res.json({ success: true, offers: offersWithPrepDisplay });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET offers by cook
const getOffersByCook = async (req, res) => {
  try {
    const { cookId } = req.params;
    
    const offers = await DishOffer.find({ 
      cook: cookId,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .populate('adminDish', 'nameEn nameAr imageUrl category');
    
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyOffers,
  getOfferById,
  createOffer,
  updateOffer,
  updateStock,
  deleteOffer,
  getPopularOffers,
  getOffersByAdminDish,
  getOffersByCook,
  upload,
  UPLOAD_DIR
};
