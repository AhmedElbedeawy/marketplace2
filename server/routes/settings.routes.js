const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

// Hero image upload middleware
const { heroUpload } = settingsController;

// Public route - get settings
router.get('/', settingsController.getSettings);

// Admin only - update settings
router.put('/', protect, settingsController.updateSettings);

// Hero image management routes
router.get('/hero-images', settingsController.getHeroImages);
router.post('/hero-images', protect, heroUpload.single('image'), settingsController.addHeroImage);
router.put('/hero-images/:id', protect, heroUpload.single('image'), settingsController.updateHeroImage);
router.delete('/hero-images/:id', protect, settingsController.deleteHeroImage);
router.put('/hero-images/reorder', protect, settingsController.reorderHeroImages);

module.exports = router;
