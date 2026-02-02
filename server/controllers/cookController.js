const Cook = require('../models/Cook');
const User = require('../models/User');
const Address = require('../models/Address');
const AuditLog = require('../models/AuditLog');
const { getDistance, isValidCoordinate } = require('../utils/geo');

// @desc    Register a cook
// @route   POST /api/cooks/register
// @access  Private
exports.registerCook = async (req, res) => {
  try {
    const { expertise, area, bio, profilePhoto, storeName, questionnaire, countryCode, location, city } = req.body;
    const userId = req.user.id;
    const activeCountry = countryCode || req.headers['x-country-code'] || 'SA';

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
      cook = await Cook.create({
        userId,
        name: user.name,
        email: user.email,
        storeName: storeName || user.name,
        expertise,
        phone: user.phone,
        area: city || 'Riyadh',
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
      cook.area = city || cook.area;
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
    const { storeName, expertise, questionnaire, location, city } = req.body;
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

    res.status(200).json({ 
      success: true, 
      message: 'Cook profile updated successfully',
      data: updatedUser
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

    let cooks = await Cook.find({ 
      status: 'active', 
      countryCode: countryCode.toUpperCase(),
      'location.lat': { $ne: 0 },
      'location.lng': { $ne: 0 }
    })
      .populate('userId', 'name email phone')
      .populate('expertise');
    
    if (isValidCoordinate(lat, lng)) {
      cooks = cooks.filter(cook => {
        if (!cook.location || !isValidCoordinate(cook.location.lat, cook.location.lng)) return false;
        const distance = getDistance(lat, lng, cook.location.lat, cook.location.lng);
        return distance <= 25;
      });
    } else {
      // If no location provided and no default address, but location is required for searching/filtering
      if (req.query.requireLocation === 'true') {
        return res.status(400).json({ 
          success: false, 
          message: 'Location required to show nearby cooks',
          errorCode: 'LOCATION_REQUIRED'
        });
      }
    }

    res.status(200).json({ success: true, count: cooks.length, data: cooks });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all top-rated cooks
// @route   GET /api/cooks/top-rated
// @access  Public
exports.getTopRatedCooks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
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

    let cooks = await Cook.find({ 
      status: 'active', 
      isAvailable: true, 
      countryCode: countryCode.toUpperCase(),
      'location.lat': { $ne: 0 },
      'location.lng': { $ne: 0 }
    })
      .sort({ isTopRated: -1, 'ratings.average': -1, ordersCount: -1 })
      .populate('userId', 'name email');
    
    if (isValidCoordinate(lat, lng)) {
      cooks = cooks.filter(cook => {
        if (!cook.location || !isValidCoordinate(cook.location.lat, cook.location.lng)) return false;
        const distance = getDistance(lat, lng, cook.location.lat, cook.location.lng);
        return distance <= 25;
      });
    }

    // Apply limit after filtering
    cooks = cooks.slice(0, limit);

    res.status(200).json({ success: true, count: cooks.length, data: cooks });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get single cook by ID
// @route   GET /api/cooks/:id
// @access  Public
exports.getCook = async (req, res) => {
  try {
    const countryCode = req.headers['x-country-code'] || 'SA';
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

// @desc    Delete cook profile (Admin only)
// @route   DELETE /api/cooks/:id
// @access  Private/Admin
exports.deleteCook = async (req, res) => {
  try {
    const cook = await Cook.findByIdAndDelete(req.params.id);

    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook not found' });
    }

    res.status(200).json({ success: true, message: 'Cook deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
