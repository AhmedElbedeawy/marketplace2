const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const Cook = require('../models/Cook');
const UserContactHistory = require('../models/UserContactHistory');
const { sendNotification } = require('../utils/notifications');
const { normalizeEmail, normalizePhone, normalizeCountry, ALLOWED_COUNTRIES } = require('../utils/normalization');
const { ErrorCodes, sendError } = require('../utils/errorHandler');
const { checkFinancialHold } = require('../utils/financialHold');

// Apple App Review / demo account — always returns isPhoneVerified=true so the
// reviewer can place orders without going through phone OTP.
const DEMO_EMAIL = 'demo@eltekkeya.com';

// Utility function to check if string is a valid email
const isValidEmail = (str) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
};

// Utility function to check if string is a valid phone number
const isValidPhone = (str) => {
  const cleanedPhone = str.replace(/[\s\-()]/g, '');
  // International or local format
  if (str.startsWith('+')) {
    return /^\d{10,}$/.test(cleanedPhone);
  }
  return /^\d{7,15}$/.test(cleanedPhone);
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'marketplace-secret-key-2025-change-in-production', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Register user
const registerUser = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: Joi.string().required(), // Can be email or phone
      phone: Joi.string().optional(),
      password: Joi.string().min(6).required(),
      role: Joi.string().valid('foodie').default('foodie'),
      requestCook: Joi.boolean().default(false),
      storeName: Joi.string().when('requestCook', { is: true, then: Joi.required(), otherwise: Joi.optional() }),
      expertise: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).when('requestCook', { is: true, then: Joi.required(), otherwise: Joi.optional() }),
      bio: Joi.string().optional(),
      city: Joi.string().optional(),
      addressLine1: Joi.string().optional(),
      addressLine2: Joi.string().optional(),
      label: Joi.string().optional(),
      deliveryNotes: Joi.string().optional(),
      // Legacy — still accepted for backward compat but not stored long-term
      area: Joi.string().optional(),
      street: Joi.string().optional(),
      building: Joi.string().optional(),
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
      questionnaire: Joi.object().unknown(true).optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return sendError(res, 400, ErrorCodes.VALIDATION_REQUIRED, error.details[0].message);
    }

    const { name, email, phone, password, requestCook, storeName, expertise, bio, city, addressLine1, addressLine2, label, deliveryNotes, area, street, building, lat, lng, questionnaire } = value;
    
    // Check store name uniqueness if requestCook is true
    if (requestCook && storeName) {
      const normalizedStoreName = storeName.trim().replace(/\s+/g, ' ');
      const existingStore = await User.findOne({ 
        storeName: { $regex: new RegExp(`^${normalizedStoreName}$`, 'i') } 
      });
      if (existingStore) {
        return res.status(400).json({ message: 'Kitchen name already exists' });
      }
    }

    const credential = email.trim();

    // Validate that credential is either email or phone
    if (!isValidEmail(credential) && !isValidPhone(credential)) {
      return res.status(400).json({ message: 'Invalid email or phone number' });
    }

    const isEmail = isValidEmail(credential);
    const isPhone = isValidPhone(credential);

    const rawEmail = isEmail ? credential : (email || '');
    // Only treat the extra phone field as a phone if it actually looks like one.
    // This prevents mobile clients that send phone=email from producing phone:"".
    const rawPhoneCandidate = isPhone ? credential : (phone || null);
    const rawPhone = rawPhoneCandidate && isValidPhone(rawPhoneCandidate) ? rawPhoneCandidate : null;

    const normalizedEmail = normalizeEmail(rawEmail);
    const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;

    // Check if email or phone is already reserved in history
    const reservedContact = await UserContactHistory.findOne({
      $or: [
        { type: 'email', value: normalizedEmail, status: 'reserved' },
        { type: 'phone', value: normalizedPhone, status: 'reserved' }
      ].filter(q => q.value)
    });

    if (reservedContact) {
      return res.status(400).json({ 
        message: `This ${reservedContact.type} is already in use or reserved.` 
      });
    }

    // Check if user already exists (by email or phone)
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: normalizedPhone }
      ].filter(q => q.email || q.phone)
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already registered with this email or phone number' });
    }

    // Create user
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      phone: normalizedPhone || undefined,
      password,
      role: 'foodie',
      role_cook_status: requestCook ? 'pending' : 'none',
      storeName: requestCook ? storeName : undefined,
      expertise: requestCook ? (Array.isArray(expertise) ? expertise : [expertise]) : [],
      bio: bio || ''
    });

    // Create contact history records
    if (normalizedEmail) {
      await UserContactHistory.create({
        userId: newUser._id,
        type: 'email',
        value: normalizedEmail,
        status: 'reserved'
      });
    }
    if (normalizedPhone) {
      await UserContactHistory.create({
        userId: newUser._id,
        type: 'phone',
        value: normalizedPhone,
        status: 'reserved'
      });
    }

    // Generate token
    const token = generateToken(newUser._id);

    if (requestCook) {
      // Create Cook document so questionnaire + location are stored for admin review
      try {
        const normalizedExpertise = Array.isArray(expertise) ? expertise : (expertise ? [expertise] : []);
        // Prefer body countryCode over header — normalize and validate
        const rawCountry = req.body.countryCode || req.headers['x-country-code'] || 'SA';
        const activeCountry = normalizeCountry(rawCountry) || 'SA';
        // Resolve modern fields with legacy fallbacks
        const resolvedAddressLine1 = addressLine1 || area || '';
        const resolvedAddressLine2 = addressLine2 || (building ? `${street || ''} ${building}`.trim() : street || '');
        await Cook.create({
          userId: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          storeName: storeName || newUser.name,
          expertise: normalizedExpertise,
          bio: bio || '',
          city: city || '',
          // Modern address fields (source of truth)
          addressLine1: resolvedAddressLine1,
          addressLine2: resolvedAddressLine2,
          label: label || 'Home',
          deliveryNotes: deliveryNotes || '',
          location: (lat && lng) ? { lat, lng } : { lat: 0, lng: 0 },
          questionnaire: questionnaire || {},
          status: 'pending',
          countryCode: activeCountry,
        });
      } catch (cookErr) {
        console.error('Cook doc creation during signup error:', cookErr);
        // Non-blocking: user account is already created
      }

      sendNotification({
        userId: newUser._id,
        title: 'Cook Request Submitted',
        message: 'Your request to join as a cook has been submitted and is awaiting admin approval.'
      });
    }

    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        isPhoneVerified: newUser.isPhoneVerified,
        role_cook_status: newUser.role_cook_status,
        role: newUser.role,
        profilePhoto: newUser.profilePhoto,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || '';
      const label = field === 'phone' ? 'phone number' : field === 'email' ? 'email' : 'credential';
      return res.status(400).json({ message: `This ${label} is already registered.` });
    }
    res.status(500).json({ message: error.message });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const schema = Joi.object({
      email: Joi.string().optional(), // Can be email or phone
      phone: Joi.string().optional(),
      password: Joi.string().required()
    }).or('email', 'phone'); // At least one must be provided

    const { error, value } = schema.validate(req.body);
    if (error) {
      return sendError(res, 400, ErrorCodes.VALIDATION_REQUIRED, error.details[0].message);
    }

    const { email, phone, password } = value;
    const credential = (email || phone).trim();

    const isEmail = isValidEmail(credential);
    const isPhone = isValidPhone(credential);

    if (!isEmail && !isPhone) {
      return res.status(400).json({ message: 'Invalid email or phone number' });
    }

    const normalizedCredential = isEmail ? normalizeEmail(credential) : normalizePhone(credential);

    // Intentionally search without isDeleted filter so we can distinguish
    // a deleted account (restore signal) from a wrong credential (generic 401).
    const user = await User.findOne({
      $or: [
        { email: normalizedCredential },
        { phone: normalizedCredential }
      ]
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return sendError(res, 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    if (user.isDeleted) {
      return res.status(403).json({
        message: 'This account has been deleted.',
        code: 'ACCOUNT_DELETED',
        restoreAvailable: true
      });
    }

    const token = generateToken(user._id);

    // Demo account bypass: Apple App Review account always returns isPhoneVerified=true
    // so the checkout OTP gate is never shown to the reviewer.
    const isDemoAccount = user.email && user.email.toLowerCase() === DEMO_EMAIL;

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isPhoneVerified: isDemoAccount ? true : user.isPhoneVerified,
        role_cook_status: user.role_cook_status,
        role: user.role,
        profilePhoto: user.profilePhoto,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Become a cook (Request)
const becomeCook = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role_cook_status !== 'none') {
      return res.status(400).json({ message: 'A cook request already exists or you are already a cook' });
    }

    const schema = Joi.object({
      storeName: Joi.string().min(2).max(100).required(),
      expertise: Joi.string().required(),
      bio: Joi.string().optional(),
      city: Joi.string().optional(),
      lat: Joi.number().optional(),
      lng: Joi.number().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return sendError(res, 400, ErrorCodes.VALIDATION_REQUIRED, error.details[0].message);
    }

    const { storeName, expertise, bio, city, lat, lng } = value;

    // Check store name uniqueness
    const normalizedStoreName = storeName.trim().replace(/\s+/g, ' ');
    const existingStore = await User.findOne({ 
      storeName: { $regex: new RegExp(`^${normalizedStoreName}$`, 'i') },
      _id: { $ne: req.user._id }
    });
    if (existingStore) {
      return res.status(400).json({ message: 'Kitchen name already exists' });
    }

    user.role_cook_status = 'pending';
    user.storeName = normalizedStoreName;
    user.expertise = Array.isArray(expertise) ? expertise : [expertise];
    user.bio = bio || user.bio;

    await user.save();

    // Also Create/Update Cook document to keep in sync
    const Cook = require('../models/Cook');
    let cook = await Cook.findOne({ userId: user._id });
    if (!cook) {
      await Cook.create({
        userId: user._id,
        name: user.name,
        email: user.email,
        storeName: normalizedStoreName,
        expertise: user.expertise,
        addressLine1: req.body.addressLine1 || req.body.area || '',
        addressLine2: req.body.addressLine2 || req.body.street || '',
        label: req.body.label || 'Home',
        deliveryNotes: req.body.deliveryNotes || '',
        city: city || 'Riyadh',
        location: { lat: lat || 0, lng: lng || 0 },
        bio: user.bio,
        status: 'pending'
      });
    } else {
      cook.storeName = normalizedStoreName;
      cook.expertise = user.expertise;
      if (req.body.addressLine1) cook.addressLine1 = req.body.addressLine1;
      else if (city && !cook.addressLine1) cook.addressLine1 = city;
      if (req.body.addressLine2) cook.addressLine2 = req.body.addressLine2;
      if (req.body.label) cook.label = req.body.label;
      if (req.body.deliveryNotes !== undefined) cook.deliveryNotes = req.body.deliveryNotes;
      if (city) cook.city = city;
      if (lat !== undefined) cook.location.lat = lat;
      if (lng !== undefined) cook.location.lng = lng;
      cook.bio = user.bio;
      cook.status = 'pending';
      await cook.save();
    }

    sendNotification({
      userId: user._id,
      title: 'Cook Request Submitted',
      message: 'Your request to become a cook has been submitted and is awaiting admin approval.'
    });

    // Always include isPhoneVerified so the mobile client never sees an absent
    // field and defaults to false. Apply the same demo bypass as login.
    const isDemoAccount = user.email && user.email.toLowerCase() === DEMO_EMAIL;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isPhoneVerified: isDemoAccount ? true : user.isPhoneVerified,
        role_cook_status: user.role_cook_status,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Social Login (Google, Facebook, Apple)
const socialLogin = async (req, res) => {
  try {
    const schema = Joi.object({
      id: Joi.string().required(),
      name: Joi.string().min(2).max(100).required(),
      // Apple only returns email on the very first authorization; subsequent logins omit it.
      // Email is optional when provider === 'apple' so repeat logins don't get rejected.
      email: Joi.when('provider', {
        is: 'apple',
        then: Joi.string().email().allow('', null).optional().default(''),
        otherwise: Joi.string().email().required()
      }),
      profileImage: Joi.string().optional(),
      provider: Joi.string().valid('facebook', 'google', 'apple').required(),
      accessToken: Joi.string().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return sendError(res, 400, ErrorCodes.VALIDATION_REQUIRED, error.details[0].message);
    }

    const { id, name, email, profileImage, provider, accessToken } = value;

    // Step 1: Match by provider + providerId — strongest signal, survives email changes.
    // This correctly handles Apple "hide my email" relay address rotation.
    let user = await User.findOne({ provider, providerId: id });

    // Step 2: Fallback to email lookup — only when a non-empty email is available.
    // Apple omits email on repeat logins; skipping this guard would query { email: '' }
    // and could match the wrong user or throw a Mongoose validation error.
    if (!user && email) {
      user = await User.findOne({ email });
    }

    if (user) {
      // Reject deleted accounts — return restore signal instead of a token
      if (user.isDeleted) {
        return res.status(403).json({
          message: 'This account has been deleted.',
          code: 'ACCOUNT_DELETED',
          restoreAvailable: true
        });
      }

      // Backfill provider/providerId if this user was found via email and had none stored
      if (!user.providerId || user.provider === 'local') {
        user.provider = provider;
        user.providerId = id;
        await user.save();
      }

      const token = generateToken(user._id);
      return res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isPhoneVerified: user.isPhoneVerified,
          profilePhoto: user.profilePhoto,
          role_cook_status: user.role_cook_status,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    }

    // No existing user — create new social account
    const newUser = await User.create({
      name,
      email,
      profilePhoto: profileImage || '',
      provider,
      providerId: id,
      password: require('crypto').randomBytes(20).toString('hex'),
      role: 'foodie',
      role_cook_status: 'none'
    });

    const token = generateToken(newUser._id);

    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        isPhoneVerified: newUser.isPhoneVerified,
        profilePhoto: newUser.profilePhoto,
        role_cook_status: newUser.role_cook_status,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || '';
      const label = field === 'phone' ? 'phone number' : field === 'email' ? 'email' : 'credential';
      return res.status(400).json({ message: `This ${label} is already registered.` });
    }
    res.status(500).json({ message: error.message });
  }
};

// Demo Bypass Registration (Dev Only)
const demoBypass = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role_cook_status = 'active';
    user.isCook = true;  // FIX: Set isCook flag for authorization
    user.storeName = user.name + "'s Kitchen";
    user.expertise = 'multi_specialty';
    user.bio = 'This is a demo account created using the bypass button.';
    await user.save();

    // Create/Update Cook profile
    let cook = await Cook.findOne({ userId: user._id });
    if (!cook) {
      await Cook.create({
        userId: user._id,
        name: user.name,
        email: user.email,
        expertise: user.expertise,
        phone: user.phone || '0000000000',
        area: 'Demo Area',
        city: 'Riyadh',
        status: 'approved'
      });
    } else {
      cook.status = 'approved';
      await cook.save();
    }

    res.json({
      success: true,
      message: 'Demo bypass successful. You are now an approved cook.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role_cook_status: user.role_cook_status,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Demo Login (Dev Only)
const demoLogin = async (req, res) => {
  try {
    const { role, cookNumber } = req.body;
    let email;
    if (role === 'admin') email = 'admin@test.com';
    else if (role === 'cook') {
      email = cookNumber === 2 ? 'cooksecond@test.com' : 'cook@test.com';
    }
    else email = 'foodie@test.com';

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: cookNumber === 2 ? 'Second Test Cook' : `Demo ${role}`,
        email,
        password: 'test123',
        role: role === 'admin' ? 'admin' : 'foodie',
        role_cook_status: role === 'cook' ? 'active' : 'none',
        isCook: role === 'cook',
        countryCode: 'EG'
      });
      
      // Create cook profile for second cook
      if (role === 'cook' && cookNumber === 2) {
        const Cook = require('../models/Cook');
        const cook = await Cook.create({
          userId: user._id,
          name: 'Second Test Cook',
          email: 'cooksecond@test.com',
          storeName: 'Second Test Kitchen',
          storeStatus: 'approved',
          city: 'Cairo',
          pickupAddress: 'Cairo, Egypt',
          countryCode: 'EG',
          expertise: [],
          bio: 'Second test cook for multi-cook testing',
          rating: 4.5,
          reviewCount: 10,
          isAvailable: true
        });
        user.role_cook = cook._id;
        await user.save();
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'marketplace-secret-key-2025-change-in-production', {
      expiresIn: '30d'
    });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isCook: user.isCook,
        role_cook_status: user.role_cook_status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify Firebase Phone Auth token and mark phone as verified on the user profile.
// Protected route — caller must be authenticated (JWT).
// Body: { idToken: string }
// On success updates user.phone + user.isPhoneVerified.
// Old phone is preserved unchanged if verification fails.
const verifyPhone = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ message: 'Firebase idToken is required.' });
    }

    const { getFirebaseAdmin } = require('../utils/firebaseAdmin');
    const firebaseAdmin = getFirebaseAdmin();

    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    } catch (fbErr) {
      return res.status(400).json({ message: 'Invalid or expired Firebase token.' });
    }

    const verifiedPhone = decodedToken.phone_number;
    if (!verifiedPhone) {
      return res.status(400).json({ message: 'Firebase token does not contain a verified phone number.' });
    }

    // Normalise the phone from Firebase (already in E.164 format)
    const { normalizePhone } = require('../utils/normalization');
    const normalizedPhone = normalizePhone(verifiedPhone);

    // Ensure no OTHER user already owns this phone
    const conflict = await User.findOne({
      phone: normalizedPhone,
      _id: { $ne: req.user._id }
    });
    if (conflict) {
      return res.status(400).json({ message: 'This phone number is already registered to another account.' });
    }

    // Persist — old phone is only replaced once the update succeeds here
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { phone: normalizedPhone, isPhoneVerified: true },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      message: 'Phone verified successfully.',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        isPhoneVerified: updatedUser.isPhoneVerified,
        role_cook_status: updatedUser.role_cook_status,
        role: updatedUser.role,
        profilePhoto: updatedUser.profilePhoto,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete the authenticated user's own account (Apple Guideline 5.1.1 compliance).
// Performs a soft-delete by setting isDeleted=true and clearing PII fields.
// Protected route — requires valid JWT.
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Soft-delete: mark as deleted and strip PII so data is not retained.
    await User.findByIdAndUpdate(userId, {
      isDeleted: true,
      email: `deleted_${userId}@deleted.invalid`,
      phone: null,
      name: 'Deleted User',
      password: undefined,
      profilePhoto: null,
    });

    res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Restore a deleted account (self-service, public route).
// Identity is verified via password. Financial hold blocks restoration if unpaid invoices exist.
// NEVER creates a new account — only restores the existing deleted account.
// Does NOT change Cook.status or User.role_cook_status — cook operational state is independent.
const restoreAccount = async (req, res) => {
  try {
    const schema = Joi.object({
      email: Joi.string().optional(),
      phone: Joi.string().optional(),
      password: Joi.string().min(6).required(),
      name: Joi.string().min(2).max(100).optional()
    }).or('email', 'phone');

    const { error, value } = schema.validate(req.body);
    if (error) {
      return sendError(res, 400, ErrorCodes.VALIDATION_REQUIRED, error.details[0].message);
    }

    const { email, phone, password, name } = value;
    const credential = (email || phone).trim();
    const isEmail = isValidEmail(credential);
    const isPhone = isValidPhone(credential);

    if (!isEmail && !isPhone) {
      return res.status(400).json({ message: 'Invalid email or phone number.' });
    }

    const normalizedCredential = isEmail ? normalizeEmail(credential) : normalizePhone(credential);

    // Find the contact history entry to locate the deleted account
    const contactEntry = await UserContactHistory.findOne({
      type: isEmail ? 'email' : 'phone',
      value: normalizedCredential,
      status: 'reserved'
    });

    if (!contactEntry) {
      return res.status(404).json({ message: 'No account found for this identity.' });
    }

    const user = await User.findById(contactEntry.userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (!user.isDeleted) {
      return res.status(400).json({ message: 'This account is already active. Please log in normally.' });
    }

    // Verify password before doing anything else
    const passwordMatch = await user.matchPassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    // Financial hold check — blocks restore if unpaid invoices exist
    const hold = await checkFinancialHold(user._id);
    if (hold.blocked) {
      return res.status(403).json({
        message: 'Account restoration is blocked by outstanding invoices.',
        code: 'UNPAID_INVOICES',
        invoices: hold.invoices,
        totalOwed: hold.totalOwed
      });
    }

    // Restore PII from contact history
    const emailEntry = await UserContactHistory.findOne({ userId: user._id, type: 'email', status: 'reserved' });
    const phoneEntry = await UserContactHistory.findOne({ userId: user._id, type: 'phone', status: 'reserved' });

    const restoredEmail = emailEntry ? emailEntry.value : user.email;
    const restoredPhone = phoneEntry ? phoneEntry.value : user.phone;

    // Restore User access only — Cook status and role_cook_status remain untouched
    await User.findByIdAndUpdate(user._id, {
      isDeleted: false,
      email: restoredEmail,
      phone: restoredPhone,
      ...(name ? { name } : {})
    });

    const restoredUser = await User.findById(user._id);
    const token = generateToken(restoredUser._id);

    res.json({
      message: 'Account restored successfully.',
      token,
      user: {
        _id: restoredUser._id,
        name: restoredUser.name,
        email: restoredUser.email,
        phone: restoredUser.phone,
        isPhoneVerified: restoredUser.isPhoneVerified,
        role_cook_status: restoredUser.role_cook_status,
        role: restoredUser.role,
        profilePhoto: restoredUser.profilePhoto,
        createdAt: restoredUser.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin restore — bypasses financial hold (admin confirms payment settled offline).
// Does NOT change Cook status or role_cook_status.
const adminRestoreAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!user.isDeleted) {
      return res.status(400).json({ message: 'Account is already active.' });
    }

    // Restore PII from contact history
    const emailEntry = await UserContactHistory.findOne({ userId: user._id, type: 'email', status: 'reserved' });
    const phoneEntry = await UserContactHistory.findOne({ userId: user._id, type: 'phone', status: 'reserved' });

    const restoredEmail = emailEntry ? emailEntry.value : user.email;
    const restoredPhone = phoneEntry ? phoneEntry.value : null;

    await User.findByIdAndUpdate(user._id, {
      isDeleted: false,
      email: restoredEmail,
      phone: restoredPhone
    });

    res.json({ message: 'Account restored by admin. Cook status unchanged — use approve/unsuspend flows to restore cook access.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  socialLogin,
  becomeCook,
  demoBypass,
  deleteAccount,
  demoLogin,
  verifyPhone,
  restoreAccount,
  adminRestoreAccount
};
