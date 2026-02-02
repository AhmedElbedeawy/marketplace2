const express = require('express');
const router = express.Router();
const adminDishPublicController = require('../controllers/adminDishPublicController');

// Public consumer endpoints (Phase 3)
// No authentication required

// GET /api/admin-dishes/public - List all active dishes
router.get('/', adminDishPublicController.getPublicAdminDishes);

// GET /api/admin-dishes/public/featured - Featured/popular dishes
router.get('/featured', adminDishPublicController.getFeaturedAdminDishes);

// GET /api/admin-dishes/public/with-stats - Dishes with offer count and min price
router.get('/with-stats', adminDishPublicController.getAdminDishWithStats);

// GET /api/admin-dishes/public/:id - Single dish by ID
router.get('/:id', adminDishPublicController.getPublicAdminDishById);

module.exports = router;
