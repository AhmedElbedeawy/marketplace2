const express = require('express');
const router = express.Router();
const { 
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,
  validateCartStock,
  refreshCartStock
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// Protected routes
router.route('/')
  .get(protect, getCart)
  .delete(protect, clearCart);

router.route('/add')
  .post(protect, addToCart);

// CRITICAL: Sync entire cart for cross-platform unification
router.route('/sync')
  .post(protect, syncCart);

// CRITICAL: Refresh cart stock on cart open (adjusts quantities, removes out-of-stock)
router.route('/refresh-stock')
  .post(protect, refreshCartStock);

// CRITICAL: Validate cart stock before checkout (blocks if insufficient)
router.route('/validate-stock')
  .post(protect, validateCartStock);

router.route('/:itemId')
  .put(protect, updateCartItem)
  .delete(protect, removeFromCart);

module.exports = router;
