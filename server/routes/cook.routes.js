const express = require('express');
const { 
  registerCook, 
  getTopRatedCooks, 
  getCooks,
  getCook,
  rateCook,
  updateCookPhoto,
  updateCookProfilePhoto,
  updateCook,
  toggleTopRated,
  getCookByUserId,
  deleteCook,
  checkKitchenName,
  updateCookProfile
} = require('../controllers/cookController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Static-path routes MUST come before any /:id wildcards ──

// GET – static
router.get('/', getCooks);
router.get('/top-rated', getTopRatedCooks);
router.get('/check-kitchen-name', protect, checkKitchenName);
router.get('/user/:userId', getCookByUserId);

// PUT – static
router.put('/profile', protect, updateCookProfile);
router.put('/profile-photo', protect, updateCookProfilePhoto);

// POST – static
router.post('/register', protect, registerCook);

// ── Parameterized routes LAST ──
router.get('/:id', getCook);
router.post('/:id/rate', protect, rateCook);
router.put('/:id/photo', protect, updateCookPhoto);
router.put('/:id/toggle-top-rated', protect, authorize('admin', 'super_admin'), toggleTopRated);
router.put('/:id', protect, updateCook);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteCook);

module.exports = router;
