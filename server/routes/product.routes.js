const express = require('express');
const router = express.Router();
const { 
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getPopularDishes,
  togglePopular,
  getPublicStats,
  getOffersByDish,
  getOfferById,
  getOffersByKitchen,
  rateDishOffer
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.route('/')
  .get(getProducts);

router.route('/stats')
  .get(getPublicStats);

router.route('/popular')
  .get(getPopularDishes);

router.route('/:id')
  .get(getProductById);

// Protected routes
router.route('/')
  .post(protect, createProduct);

router.route('/:id')
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

// Admin routes
router.route('/:id/toggle-popular')
  .patch(protect, togglePopular);

// Offer-specific routes
router.route('/offers/by-dish/:dishName')
  .get(getOffersByDish);

router.route('/offers/:offerId')
  .get(getOfferById);

router.route('/offers/:offerId/rate')
  .post(protect, rateDishOffer);

router.route('/kitchens/:kitchenId/offers')
  .get(getOffersByKitchen);

module.exports = router;