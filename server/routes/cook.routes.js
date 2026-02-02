const express = require('express');
const { 
  registerCook, 
  getTopRatedCooks, 
  getCooks,
  getCook,
  rateCook,
  updateCookPhoto,
  updateCook,
  toggleTopRated,
  getCookByUserId,
  deleteCook,
  checkKitchenName,
  updateCookProfile
} = require('../controllers/cookController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getCooks);
router.get('/top-rated', getTopRatedCooks);
router.get('/user/:userId', getCookByUserId);
router.get('/:id', getCook);

// Protected routes
router.get('/check-kitchen-name', protect, checkKitchenName);
router.put('/profile', protect, updateCookProfile);
router.post('/register', protect, registerCook);
router.post('/:id/rate', protect, rateCook);
router.put('/:id', protect, updateCook);
router.put('/:id/photo', protect, updateCookPhoto);

// Admin routes
router.put('/:id/toggle-top-rated', protect, authorize('admin', 'super_admin'), toggleTopRated);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteCook);

module.exports = router;
