const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  getUserProfile, 
  updateUserProfile,
  updateProfilePhoto,
  switchUserView
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Configure multer for memory storage (files will be uploaded to cloud)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG images are allowed'), false);
    }
  }
});

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/profile-photo')
  .put(protect, upload.single('profilePhoto'), updateProfilePhoto);

router.route('/switch-view')
  .post(protect, switchUserView);

module.exports = router;