const express = require('express');
const router = express.Router();
const { 
  createOrder,
  getUserOrders,
  getOrderById,
  updateSubOrderStatus,
  cancelOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes
router.route('/')
  .post(protect, createOrder)
  .get(protect, getUserOrders);

router.route('/:id')
  .get(protect, getOrderById);

router.route('/:orderId/cancel')
  .post(protect, cancelOrder);

router.route('/:orderId/sub-order/:subOrderId/cancel')
  .post(protect, cancelOrder);

router.route('/sub-order/:subOrderId/status')
  .put(protect, updateSubOrderStatus);

module.exports = router;