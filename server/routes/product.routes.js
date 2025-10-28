const express = require('express');
const router = express.Router();
const { 
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.route('/')
  .get(getProducts);

router.route('/:id')
  .get(getProductById);

// Protected routes
router.route('/')
  .post(protect, createProduct);

router.route('/:id')
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

module.exports = router;