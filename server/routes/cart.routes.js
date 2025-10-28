const express = require('express');
const router = express.Router();
const { 
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// Protected routes
router.route('/')
  .get(protect, getCart)
  .delete(protect, clearCart);

router.route('/add')
  .post(protect, addToCart);

router.route('/:itemId')
  .put(protect, updateCartItem)
  .delete(protect, removeFromCart);

module.exports = router;