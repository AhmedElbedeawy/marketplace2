const User = require('../models/User');
const UserContactHistory = require('../models/UserContactHistory');
const AuditLog = require('../models/AuditLog');
const Address = require('../models/Address');
const Joi = require('joi');
const { normalizeEmail, normalizePhone } = require('../utils/normalization');
const storageService = require('../services/storageService');

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
    
    // Get cook profile if user is a cook (includes location, city, country)
    let cookProfile = null;
    if (user.role_cook_status !== 'none') {
      cookProfile = await require('../models/Cook').findOne({ userId: user._id });
    }

    // Demo account bypass: Apple App Review account always returns isPhoneVerified=true
    // so the checkout OTP gate is never shown to the reviewer — even after
    // fetchUserProfile() is called following cook registration.
    const DEMO_EMAIL = 'demo@eltekkeya.com';
    const isDemoAccount = user.email && user.email.toLowerCase() === DEMO_EMAIL;

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isPhoneVerified: isDemoAccount ? true : user.isPhoneVerified,
      profilePhoto: user.profilePhoto,
      walletId: user.walletId,
      role_cook_status: user.role_cook_status,
      role: user.role,
      rejectionReason,
      storeName: user.storeName,
      expertise: user.expertise,
      questionnaire: user.questionnaire,
      bio: user.bio,
      defaultAddress,
      // Include cook location/city from Cook model
      location: cookProfile?.location || null,
      city: cookProfile?.city || null,
      country: cookProfile?.country || null,
      countryCode: cookProfile?.countryCode || null,
      cookProfilePhoto: cookProfile?.profilePhoto || null,
      // Cook address fields
      addressLine1: cookProfile?.addressLine1 || cookProfile?.area || null,
      addressLine2: cookProfile?.addressLine2 || cookProfile?.street || null,
      label: cookProfile?.label || null,
      deliveryNotes: cookProfile?.deliveryNotes || null
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

// Dedicated endpoint for profile photo upload - supports both multipart file and base64
const updateProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let profilePhotoUrl;

    // Handle multipart file upload (preferred)
    if (req.file) {
      const buffer = req.file.buffer;
      const filename = `user-${user._id}-profile-${Date.now()}.jpg`;
      
      // Upload to cloud storage via storageService
      profilePhotoUrl = await storageService.processAndSaveImage(buffer, {
        category: 'profiles',
        filename: filename,
        width: 400,
        height: 400,
        quality: 85
      });
    } 
    // Fallback: handle base64 data URL (backward compatibility)
    else if (req.body.profilePhoto) {
      const schema = Joi.object({
        profilePhoto: Joi.string().required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }

      // If it's already a cloud URL, use it directly
      if (value.profilePhoto.startsWith('http')) {
        profilePhotoUrl = value.profilePhoto;
      } 
      // If it's a base64 data URL, convert and upload
      else if (value.profilePhoto.startsWith('data:image')) {
        const base64Data = value.profilePhoto.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `user-${user._id}-profile-${Date.now()}.jpg`;
        
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
        profilePhotoUrl = value.profilePhoto;
      }
    } else {
      return res.status(400).json({ message: 'No photo provided' });
    }

    // Delete old profile photo if it exists and is a cloud URL
    if (user.profilePhoto && user.profilePhoto.includes('storage.googleapis.com')) {
      const oldPath = user.profilePhoto.replace(`https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET || 'eltekkeya.appspot.com'}/`, '');
      await storageService.deleteImage(oldPath).catch(err => {
        console.log('Warning: Could not delete old profile photo:', err.message);
      });
    }

    // Update user with new photo URL
    user.profilePhoto = profilePhotoUrl;
    const updated = await user.save();

    res.status(200).json({
      message: 'Profile photo updated successfully',
      profilePhoto: updated.profilePhoto
    });
  } catch (error) {
    console.error('updateProfilePhoto error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateProfilePhoto,
  switchUserView
};