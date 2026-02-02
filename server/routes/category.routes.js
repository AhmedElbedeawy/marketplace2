const express = require('express');
const router = express.Router();
const { 
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  updateCategoryIcons,
  deleteCategory,
  upload
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

// Public routes (no authentication required)
router.route('/')
  .get(getCategories);

router.route('/:id')
  .get(getCategoryById);

// Protected admin routes
// Create category with optional icon uploads
router.route('/')
  .post(
    protect, 
    authorize('admin', 'super_admin'),
    upload.fields([
      { name: 'iconWeb', maxCount: 1 },
      { name: 'iconMobile', maxCount: 1 }
    ]),
    createCategory
  );

// Update category (text fields only)
router.route('/:id')
  .put(
    protect, 
    authorize('admin', 'super_admin'),
    updateCategory
  )
  .delete(
    protect, 
    authorize('admin', 'super_admin'),
    deleteCategory
  );

// Update category icons only
router.route('/:id/icons')
  .patch(
    protect, 
    authorize('admin', 'super_admin'),
    upload.fields([
      { name: 'iconWeb', maxCount: 1 },
      { name: 'iconMobile', maxCount: 1 }
    ]),
    updateCategoryIcons
  );

module.exports = router;
