const Cook = require('../models/Cook');
const User = require('../models/User');
const Address = require('../models/Address');
const AuditLog = require('../models/AuditLog');
const { getDistance, isValidCoordinate } = require('../utils/geo');
const { normalizeCountry, ALLOWED_COUNTRIES } = require('../utils/normalization');
const storageService = require('../services/storageService');

// @desc    Register a cook
// @route   POST /api/cooks/register
// @access  Private
exports.registerCook = async (req, res) => {
  try {
    const { expertise, addressLine1, addressLine2, label, deliveryNotes, area, bio, profilePhoto, storeName, questionnaire, countryCode: rawCountryCode, location, city } = req.body;
    const userId = req.user.id;
    const activeCountry = normalizeCountry(rawCountryCode || req.headers['x-country-code']) || 'SA';

    // Check if user already has a pending or approved cook status
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role_cook_status !== 'none' && process.env.NODE_ENV !== 'development') {
      return res.status(400).json({ 
        success: false, 
        message: `Your cook registration status is currently: ${user.role_cook_status}` 
      });
    }

    // Check if store name is unique if provided
    let normalizedStoreName = storeName;
    if (storeName) {
      normalizedStoreName = storeName.trim().replace(/\s+/g, ' ');
      const existingUser = await User.findOne({ 
        storeName: { $regex: new RegExp(`^${normalizedStoreName}$`, 'i') }, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Kitchen name already exists' });
      }
    }

    // Update user document with cook request details
    user.role_cook_status = 'pending';
    user.expertise = expertise;
    user.bio = bio || '';
    user.storeName = normalizedStoreName;
    user.questionnaire = questionnaire;
    user.countryCode = activeCountry;
    if (profilePhoto) {
      user.profilePhoto = profilePhoto;
    }

    await user.save();

    // Also create/update Cook profile
    let cook = await Cook.findOne({ userId });
    if (!cook) {
      const resolvedAddressLine1 = addressLine1 || area || '';
      cook = await Cook.create({
        userId,
        name: user.name,
        email: user.email,
        storeName: storeName || user.name,
        expertise,
        phone: user.phone,
        addressLine1: resolvedAddressLine1,
        addressLine2: addressLine2 || '',
        label: label || 'Home',
        deliveryNotes: deliveryNotes || '',
        bio,
        location: location || { lat: 0, lng: 0 },
        city: city || 'Riyadh',
        profilePhoto: profilePhoto || user.profilePhoto,
        questionnaire,
        status: 'pending',
        countryCode: activeCountry
      });
    } else {
      cook.status = 'pending';
      cook.storeName = storeName || cook.storeName;
      cook.expertise = expertise;
      if (addressLine1 !== undefined) cook.addressLine1 = addressLine1;
      else if (area && !cook.addressLine1) cook.addressLine1 = area;
      if (addressLine2 !== undefined) cook.addressLine2 = addressLine2;
      if (label !== undefined) cook.label = label;
      if (deliveryNotes !== undefined) cook.deliveryNotes = deliveryNotes;
      cook.bio = bio;
      if (location) cook.location = location;
      if (city) cook.city = city;
      cook.questionnaire = questionnaire;
      cook.countryCode = activeCountry;
      if (profilePhoto) cook.profilePhoto = profilePhoto;
      await cook.save();
    }

    res.status(201).json({ 
      success: true, 
      message: 'Cook registration submitted successfully! Awaiting admin approval.',
      data: {
        _id: user._id,
        name: user.name,
        role_cook_status: user.role_cook_status
      }
    });
  } catch (error) {
    console.error('Register cook error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Check kitchen name availability
// @route   GET /api/cooks/check-kitchen-name
// @access  Private
exports.checkKitchenName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const existingUser = await User.findOne({ 
      storeName: { $regex: new RegExp(`^${name.trim().replace(/\s+/g, ' ')}$`, 'i') } 
    });

    res.status(200).json({ 
      success: true, 
      available: !existingUser 
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update cook profile (by Cook)
// @route   PUT /api/cooks/profile
// @access  Private
exports.updateCookProfile = async (req, res) => {
  try {
    const { storeName, expertise, questionnaire, location, city,
            addressLine1, addressLine2, label, deliveryNotes,
            area, street, building,  // legacy — accepted but not written to DB
            bio, countryCode: rawCountryCode } = req.body;
    const userId = req.user.id;

    // Check if user is an approved cook
    const user = await User.findById(userId);
    if (!user || user.role_cook_status !== 'active') {
      return res.status(403).json({ success: false, message: 'Only approved cooks can edit their profile.' });
    }

    const updates = {};
    const cookUpdates = {};

    // Validate store name uniqueness
    if (storeName && storeName !== user.storeName) {
      const normalizedStoreName = storeName.trim().replace(/\s+/g, ' ');
      const existingUser = await User.findOne({ 
        storeName: { $regex: new RegExp(`^${normalizedStoreName}$`, 'i') }, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Kitchen name already exists' });
      }
      updates.storeName = normalizedStoreName;
      cookUpdates.storeName = normalizedStoreName;
    }

    if (expertise) {
      updates.expertise = expertise;
      cookUpdates.expertise = expertise;
    }

    if (location) {
      cookUpdates.location = location;
    }

    if (city) {
      cookUpdates.city = city;
    }

    // Modern address fields — source of truth
    if (addressLine1 !== undefined) {
      cookUpdates.addressLine1 = addressLine1;
    }
    if (addressLine2 !== undefined) {
      cookUpdates.addressLine2 = addressLine2;
    }
    if (label !== undefined) {
      cookUpdates.label = label;
    }
    if (deliveryNotes !== undefined) {
      cookUpdates.deliveryNotes = deliveryNotes;
    }

    if (bio !== undefined) {
      cookUpdates.bio = bio;
    }

    if (questionnaire) {
      // Handle fulfillmentMethods and other questionnaire data
      updates.questionnaire = {
        ...user.questionnaire,
        ...questionnaire
      };
      cookUpdates.questionnaire = {
        ...updates.questionnaire
      };
    }

    // Normalize and persist countryCode if provided
    if (rawCountryCode !== undefined) {
      const normalizedCountry = normalizeCountry(rawCountryCode);
      if (!normalizedCountry) {
        return res.status(400).json({
          success: false,
          message: `Invalid countryCode. Allowed values: ${ALLOWED_COUNTRIES.join(', ')}`
        });
      }
      updates.countryCode = normalizedCountry;
      cookUpdates.countryCode = normalizedCountry;
    }

    // Update User model
    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true });

    // Update Cook model
    await Cook.findOneAndUpdate({ userId }, { $set: cookUpdates });

    // Create Audit Log
    await AuditLog.create({
      targetUserId: userId,
      action: 'update_cook_profile',
      details: {
        updates,
        timestamp: new Date()
      }
    });

    // Fetch updated Cook model to include location in response
    const updatedCook = await Cook.findOne({ userId });

    res.status(200).json({ 
      success: true, 
      message: 'Cook profile updated successfully',
      data: updatedCook
    });
  } catch (error) {
    console.error('Update cook profile error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all active cooks
// @route   GET /api/cooks
// @access  Public
exports.getCooks = async (req, res) => {
  try {
    const countryCode = req.headers['x-country-code'] || 'SA';
    let lat = parseFloat(req.query.lat);
    let lng = parseFloat(req.query.lng);

    // If coordinates not provided in query, try to get from user's default address
    if (!lat || !lng) {
      if (req.user) {
        const defaultAddress = await Address.findOne({ 
          user: req.user._id, 
          isDefault: true, 
          isDeleted: false 
        });
        if (defaultAddress) {
          lat = defaultAddress.lat;
          lng = defaultAddress.lng;
        }
      }
    }

    // Get all active, non-deleted cooks
    let cooks = await Cook.find({
      status: 'active',
      isDeleted: { $ne: true },
      countryCode: countryCode.toUpperCase()
    })
      .populate('userId', 'name email phone profilePhoto')
      .populate('expertise');

    // Apply location filter only if valid coordinates exist
    if (isValidCoordinate(lat, lng)) {
      cooks = cooks.filter(cook => {
        if (!cook.location || !isValidCoordinate(cook.location.lat, cook.location.lng)) {
          return false;
        }
        const distance = getDistance(lat, lng, cook.location.lat, cook.location.lng);
        return distance <= 25;
      });
    }

    // Compute dishesCount for each cook based on their active offers
    const DishOffer = require('../models/DishOffer');
    const cooksWithCounts = await Promise.all(cooks.map(async (cook) => {
      const cookObj = cook.toObject ? cook.toObject() : cook;

      // Count distinct admin dishes this cook has offers for
      const offerCount = await DishOffer.countDocuments({
        cook: cook._id,
        isActive: true
      });

      cookObj.dishesCount = offerCount;

      // Get profilePhoto from user if not set on cook
      if (!cookObj.profilePhoto && cook.userId && cook.userId.profilePhoto) {
        cookObj.profilePhoto = cook.userId.profilePhoto;
      }

      return cookObj;
    }));

    res.status(200).json({ success: true, count: cooksWithCounts.length, data: cooksWithCounts });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get dishes for a specific cook
// @route   GET /api/cooks/:id/dishes
// @access  Public
exports.getCookDishes = async (req, res) => {
  try {
    const { id } = req.params;
    const DishOffer = require('../models/DishOffer');
    const AdminDish = require('../models/AdminDish');
    
    // Get all active offers for this cook
    const offers = await DishOffer.find({
      cook: id,
      isActive: true
    })
    .populate('adminDishId')
    .populate('cook', 'storeName profilePhoto ratings')
    .lean();

    // Transform offers into dish cards with cook-specific data
    const dishes = offers.map(offer => {
      const adminDish = offer.adminDishId;

      return {
        // Offer-level data (cook's specific data)
        offerId: offer._id,
        // Use offer's images array (first image) - same as cart logic
        image: offer.images?.[0] || adminDish?.images?.[0] || '',
        offerPrice: offer.price,
        offerPrepTime: offer.prepReadyConfig,
        offerStock: offer.stock,
        offerVariants: offer.variants,

        // Admin dish data (shared dish info)
        adminDishId: adminDish?._id || offer.adminDishId,
        dishId: adminDish?._id || offer.adminDishId,
        name: adminDish?.nameEn || adminDish?.name || 'Unknown Dish',
        nameAr: adminDish?.nameAr || adminDish?.name || '',
        description: adminDish?.descriptionEn || adminDish?.description || '',
        descriptionAr: adminDish?.descriptionAr || '',
        images: adminDish?.images || [],

        // FIX: Include dish/offer specific ratings (not cook's ratings)
        ratings: offer.ratings || { average: 0, count: 0 },

        // Cook data
        cookId: offer.cook?._id || id,
        cookName: offer.cook?.storeName || '',
        cookProfilePhoto: offer.cook?.profilePhoto || '',
        cookRating: offer.cook?.ratings?.average || 0,
        cookRatingsCount: offer.cook?.ratings?.count || 0,

        // Platform rating from admin dish (legacy)
        rating: adminDish?.rating || 0,
        reviewCount: adminDish?.reviewCount || 0,

        // Price (use offer price)
        price: offer.price,
        minPrice: offer.price,

        // Variants
        variants: offer.variants || [],
        variantsCount: offer.variants?.length || 0,
      };
    });
    
    res.status(200).json({ 
      success: true, 
      count: dishes.length, 
      data: dishes 
    });
  } catch (error) {
    console.error('getCookDishes error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all top-rated cooks
// @route   GET /api/cooks/top-rated
// @access  Public
exports.getTopRatedCooks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const countryCode = req.query.country || req.headers['x-country-code'] || 'SA';
    let lat = parseFloat(req.query.lat);
    let lng = parseFloat(req.query.lng);

    // If coordinates not provided in query, try to get from user's default address
    if (!lat || !lng) {
      if (req.user) {
        const defaultAddress = await Address.findOne({ 
          user: req.user._id, 
          isDefault: true, 
          isDeleted: false 
        });
        if (defaultAddress) {
          lat = defaultAddress.lat;
          lng = defaultAddress.lng;
        }
      }
    }

    let cooks = await Cook.find({
      status: 'active',
      isDeleted: { $ne: true },
      isAvailable: true,
      isTopRated: true,
      countryCode: countryCode.toUpperCase()
    })
      .sort({ 'ratings.average': -1, ordersCount: -1 })
      .populate('userId', 'name email');
    
    // NO distance filter for top-rated cooks - they should be visible platform-wide

    // Apply limit
    cooks = cooks.slice(0, limit);

    res.status(200).json({ success: true, count: cooks.length, data: cooks });
  } catch (error) {
    console.error('getTopRatedCooks error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get single cook by ID
// @route   GET /api/cooks/:id
// @access  Public
exports.getCook = async (req, res) => {
  try {
    const countryCode = req.query.country || req.headers['x-country-code'] || 'SA';
    const cook = await Cook.findOne({ 
      _id: req.params.id, 
      countryCode: countryCode.toUpperCase() 
    })
      .populate('userId', 'name email phone')
      .populate('expertise')
      .populate('ratings.userRatings.userId', 'name');

    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook not found in this country' });
    }

    res.status(200).json({ success: true, data: cook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Rate a cook (1-5 stars)
// @route   POST /api/cooks/:id/rate
// @access  Private
exports.rateCook = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const userId = req.user.id;
    const cookId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook not found' });
    }

    await cook.addRating(userId, rating, review);

    res.status(200).json({ success: true, data: cook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update cook profile photo (after circular cropping)
// @route   PUT /api/cooks/:id/photo
// @access  Private
exports.updateCookPhoto = async (req, res) => {
  try {
    const { photoPath, originalPhotoPath } = req.body;
    const cookId = req.params.id;

    const cook = await Cook.findByIdAndUpdate(
      cookId,
      {
        profilePhoto: photoPath,
        originalPhoto: originalPhotoPath
      },
      { new: true, runValidators: true }
    );

    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook not found' });
    }

    res.status(200).json({ success: true, data: cook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update cook info
// @route   PUT /api/cooks/:id
// @access  Private
exports.updateCook = async (req, res) => {
  try {
    const { name, expertise, phone, area, bio, location, city } = req.body;
    const cookId = req.params.id;

    const cook = await Cook.findByIdAndUpdate(
      cookId,
      { name, expertise, phone, area, bio, location, city },
      { new: true, runValidators: true }
    );

    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook not found' });
    }

    res.status(200).json({ success: true, data: cook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Toggle top-rated status (Admin only)
// @route   PUT /api/cooks/:id/toggle-top-rated
// @access  Private/Admin
exports.toggleTopRated = async (req, res) => {
  try {
    const cookId = req.params.id;

    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook not found' });
    }

    cook.isTopRated = !cook.isTopRated;
    await cook.save();

    res.status(200).json({ success: true, data: cook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get cook by user ID
// @route   GET /api/cooks/user/:userId
// @access  Public
exports.getCookByUserId = async (req, res) => {
  try {
    const countryCode = req.headers['x-country-code'] || 'SA';
    const cook = await Cook.findOne({ 
      userId: req.params.userId,
      countryCode: countryCode.toUpperCase()
    })
      .populate('userId', 'name email phone')
      .populate('expertise');

    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook not found in this country' });
    }

    res.status(200).json({ success: true, data: cook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Update cook profile photo (by current authenticated cook user)
// @route   PUT /api/cooks/profile-photo
// @access  Private
exports.updateCookProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    let profilePhotoUrl;

    // Handle multipart file upload (preferred)
    if (req.file) {
      const buffer = req.file.buffer;
      const filename = `cook-${userId}-profile-${Date.now()}.jpg`;
      
      // Upload to cloud storage via storageService
      profilePhotoUrl = await storageService.processAndSaveImage(buffer, {
        category: 'profiles',
        filename: filename,
        width: 400,
        height: 400,
        quality: 85
      });
    } 
    // Fallback: handle base64 data URL or existing URL (backward compatibility)
    else if (req.body.profilePhoto) {
      const { profilePhoto, originalPhoto } = req.body;

      // If it's already a cloud URL, use it directly
      if (profilePhoto.startsWith('http')) {
        profilePhotoUrl = profilePhoto;
      } 
      // If it's a base64 data URL, convert and upload
      else if (profilePhoto.startsWith('data:image')) {
        const base64Data = profilePhoto.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `cook-${userId}-profile-${Date.now()}.jpg`;
        
        profilePhotoUrl = await storageService.processAndSaveImage(buffer, {
          category: 'profiles',
          filename: filename,
          width: 400,
          height: 400,
          quality: 85
        });
      } 
      // Otherwise treat as existing URL
      else {
        profilePhotoUrl = profilePhoto;
      }
    } else {
      return res.status(400).json({ success: false, message: 'No photo provided' });
    }

    const cook = await Cook.findOne({ userId });
    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook profile not found' });
    }

    // Delete old cook profile photo if it exists and is a cloud URL
    if (cook.profilePhoto && cook.profilePhoto.includes('storage.googleapis.com')) {
      const oldPath = cook.profilePhoto.replace(`https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET || 'eltekkeya.appspot.com'}/`, '');
      await storageService.deleteImage(oldPath).catch(err => {
        console.log('Warning: Could not delete old cook profile photo:', err.message);
      });
    }

    // Update cook profile
    cook.profilePhoto = profilePhotoUrl;
    if (req.body.originalPhoto) {
      cook.originalPhoto = req.body.originalPhoto;
    }
    await cook.save();

    // Also update User.profilePhoto to keep in sync
    await User.findByIdAndUpdate(userId, { profilePhoto: profilePhotoUrl });

    res.status(200).json({ 
      success: true, 
      data: cook,
      profilePhoto: profilePhotoUrl,
      cookProfilePhoto: profilePhotoUrl // Explicit field for frontend compatibility
    });
  } catch (error) {
    console.error('updateCookProfilePhoto error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Delete cook profile (Admin only)
// @route   DELETE /api/cooks/:id
// @access  Private/Admin
exports.deleteCook = async (req, res) => {
  try {
    const cook = await Cook.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook not found' });
    }

    res.status(200).json({ success: true, message: 'Cook deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};


