const express = require('express');
const router = express.Router();
const { 
  getUserProfile, 
  updateUserProfile,
  switchUserView
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/switch-view')
  .post(protect, switchUserView);

module.exports = router;