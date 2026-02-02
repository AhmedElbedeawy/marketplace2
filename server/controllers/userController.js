const User = require('../models/User');
const UserContactHistory = require('../models/UserContactHistory');
const AuditLog = require('../models/AuditLog');
const Address = require('../models/Address');
const Joi = require('joi');
const { normalizeEmail, normalizePhone } = require('../utils/normalization');

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('expertise');
    
    // Get default address
    const defaultAddress = await Address.findOne({
      user: req.user._id,
      isDefault: true,
      isDeleted: false
    });

    let rejectionReason = null;
    if (user.role_cook_status === 'none') {
      const lastRejection = await AuditLog.findOne({
        targetUserId: user._id,
        action: 'reject'
      }).sort({ createdAt: -1 });
      
      if (lastRejection) {
        rejectionReason = lastRejection.reason;
      }
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      walletId: user.walletId,
      role_cook_status: user.role_cook_status,
      role: user.role,
      rejectionReason,
      storeName: user.storeName,
      expertise: user.expertise,
      questionnaire: user.questionnaire,
      bio: user.bio,
      defaultAddress
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
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      profilePhoto: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updates = { ...value };

    // Handle email change
    if (value.email && value.email !== user.email) {
      const normalizedEmail = normalizeEmail(value.email);
      
      // Check if reserved by another user
      const reserved = await UserContactHistory.findOne({
        type: 'email',
        value: normalizedEmail,
        status: 'reserved',
        userId: { $ne: user._id }
      });

      if (reserved) {
        return res.status(400).json({ message: 'Email is already in use or reserved.' });
      }

      // In a real app, check for verification here
      
      // Reserve new email
      await UserContactHistory.findOneAndUpdate(
        { userId: user._id, type: 'email', value: normalizedEmail },
        { status: 'reserved' },
        { upsert: true, new: true }
      );
      
      updates.email = normalizedEmail;

      // Audit log for email change
      await AuditLog.create({
        targetUserId: user._id,
        action: 'change_email',
        details: { oldEmail: user.email, newEmail: normalizedEmail }
      });
    }

    // Handle phone change
    if (value.phone && value.phone !== user.phone) {
      const normalizedPhone = normalizePhone(value.phone);
      
      // Check if reserved by another user
      const reserved = await UserContactHistory.findOne({
        type: 'phone',
        value: normalizedPhone,
        status: 'reserved',
        userId: { $ne: user._id }
      });

      if (reserved) {
        return res.status(400).json({ message: 'Phone number is already in use or reserved.' });
      }

      // In a real app, check for verification here

      // Reserve new phone
      await UserContactHistory.findOneAndUpdate(
        { userId: user._id, type: 'phone', value: normalizedPhone },
        { status: 'reserved' },
        { upsert: true, new: true }
      );

      updates.phone = normalizedPhone;

      // Audit log for phone change
      await AuditLog.create({
        targetUserId: user._id,
        action: 'change_phone',
        details: { oldPhone: user.phone, newPhone: normalizedPhone }
      });
    }

    // Update user
    Object.assign(user, updates);
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      walletId: user.walletId,
      role_cook_status: user.role_cook_status,
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
    
    // If switching to cook view, check if user is an approved cook
    const user = await User.findById(req.user._id);
    if (view === 'cook' && (!user || user.role_cook_status !== 'approved')) {
      return res.status(400).json({ 
        message: 'You need an approved Cook account to access this feature.' 
      });
    }
    
    // Update user's preferred view
    user.preferredView = view;
    await user.save();
    
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