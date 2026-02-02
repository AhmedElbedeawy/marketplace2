const express = require('express');
const router = express.Router();
const adminDishController = require('../controllers/adminDishController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', adminDishController.getAdminDishes);
router.get('/:id', adminDishController.getAdminDishById);

// Admin-only routes (with file upload middleware)
router.post('/', protect, adminDishController.upload.single('image'), adminDishController.createAdminDish);
router.put('/:id', protect, adminDishController.upload.single('image'), adminDishController.updateAdminDish);
router.patch('/:id/toggle-popular', protect, adminDishController.togglePopular);
router.delete('/', protect, adminDishController.deleteAdminDish);
router.delete('/:id/hard', protect, adminDishController.hardDeleteAdminDish);

module.exports = router;
