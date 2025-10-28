const express = require('express');
const router = express.Router();
const { 
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.route('/')
  .get(getCategories);

router.route('/:id')
  .get(getCategoryById);

// Protected admin routes
router.route('/')
  .post(protect, authorize('admin', 'super_admin'), createCategory);

router.route('/:id')
  .put(protect, authorize('admin', 'super_admin'), updateCategory)
  .delete(protect, authorize('admin', 'super_admin'), deleteCategory);

module.exports = router;