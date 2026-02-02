const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  console.log('=== PROTECT MIDDLEWARE ===');
  console.log('Path:', req.path);
  console.log('Headers:', req.headers.authorization);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      if (!token || token === 'undefined' || token === 'null' || token === '' || token === 'Bearer') {
        console.log('Invalid token format:', token);
        return res.status(401).json({ message: 'Not authorized, no token provided' });
      }

      console.log('Verifying token...');
      const secret = process.env.JWT_SECRET || 'marketplace-secret-key-2025-change-in-production';
      
      const decoded = jwt.verify(token, secret);
      console.log('Token decoded:', decoded.id);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        console.log('User not found for ID:', decoded.id);
        return res.status(401).json({ message: 'User not found' });
      }

      console.log('User loaded:', { id: req.user._id, role: req.user.role, isCook: req.user.isCook, status: req.user.role_cook_status });
      return next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  console.log('No authorization header found');
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('=== Authorization Check ===');
    console.log('Required roles:', roles);
    console.log('User role:', req.user.role);
    console.log('User isCook:', req.user.isCook);
    console.log('User role_cook_status:', req.user.role_cook_status);
    
    // Check if user has admin role
    if (roles.includes('admin') && req.user.role === 'admin') {
      console.log('✓ Authorized as admin');
      return next();
    }

    // Check if user has cook role (either explicit role or isCook flag with approved status)
    if (roles.includes('cook')) {
      const isCook = req.user.role === 'cook' || 
                     (req.user.isCook === true && req.user.role_cook_status === 'approved') ||
                     (req.user.isCook === true && req.user.role_cook_status === 'active');
      console.log('Is cook check result:', isCook);
      if (isCook) {
        console.log('✓ Authorized as cook');
        return next();
      }
    }

    // Check if user has foodie role
    if (roles.includes('foodie') && req.user.role === 'foodie') {
      console.log('✓ Authorized as foodie');
      return next();
    }

    console.log('✗ Authorization failed');
    return res.status(403).json({
      message: `User role ${req.user.role} is not authorized to access this route`
    });
  };
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin only' });
  }
};

module.exports = { protect, authorize, adminOnly };