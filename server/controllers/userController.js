const User = require('../models/User');
const Joi = require('joi');

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      walletId: user.walletId,
      isCook: user.isCook,
      storeName: user.storeName,
      storeStatus: user.storeStatus,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      phone: Joi.string().optional(),
      profilePhoto: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { ...value },
      { new: true }
    );

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      walletId: user.walletId,
      isCook: user.isCook,
      storeName: user.storeName,
      storeStatus: user.storeStatus,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Switch user view (Foodie/Cook)
const switchUserView = async (req, res) => {
  try {
    const { view } = req.body; // 'foodie' or 'cook'
    
    if (view !== 'foodie' && view !== 'cook') {
      return res.status(400).json({ message: 'Invalid view type' });
    }
    
    // If switching to cook view, check if user is a cook
    if (view === 'cook' && !req.user.isCook) {
      return res.status(400).json({ 
        message: 'You need to register as a Cook to access this feature.' 
      });
    }
    
    // Update user's preferred view
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferredView: view },
      { new: true }
    );
    
    res.json({
      message: `Switched to ${view} view`,
      preferredView: user.preferredView
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  switchUserView
};