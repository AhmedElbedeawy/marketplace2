const express = require('express');
const router = express.Router();
const { 
  toggleFavoriteProduct,
  toggleFavoriteCook,
  getUserFavorites,
  getFavoriteProducts,
  getFavoriteCooks
} = require('../controllers/favoriteController');
const { protect } = require('../middleware/auth');

// Protected routes
router.route('/')
  .get(protect, getUserFavorites);

router.route('/products')
  .get(protect, getFavoriteProducts);

router.route('/cooks')
  .get(protect, getFavoriteCooks);

router.route('/product')
  .post(protect, toggleFavoriteProduct);

router.route('/cook')
  .post(protect, toggleFavoriteCook);

module.exports = router;