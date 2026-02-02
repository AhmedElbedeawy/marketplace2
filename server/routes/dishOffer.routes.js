const express = require('express');
const router = express.Router();
const dishOfferController = require('../controllers/dishOfferController');
const { protect } = require('../middleware/auth');

// Cook's own offers (require authentication with file upload)
router.get('/my', protect, dishOfferController.getMyOffers);
router.post('/', protect, dishOfferController.upload.array('images', 5), dishOfferController.createOffer);
router.put('/:id', protect, dishOfferController.upload.array('images', 5), dishOfferController.updateOffer);
router.patch('/:id/stock', protect, dishOfferController.updateStock);
router.delete('/:id', protect, dishOfferController.deleteOffer);

// Single offer (public for viewing)
router.get('/:id', dishOfferController.getOfferById);

// Public endpoints (used in Phase 3 consumer flow)
router.get('/popular', dishOfferController.getPopularOffers);
router.get('/by-admin-dish/:adminDishId', dishOfferController.getOffersByAdminDish);
router.get('/by-cook/:cookId', dishOfferController.getOffersByCook);

module.exports = router;
