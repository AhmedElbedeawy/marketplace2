const express = require('express');
const router = express.Router();
const { 
  createOrder,
  getUserOrders,
  getOrderById,
  updateSubOrderStatus,
  cancelOrder,
  getCookSalesSummary,
  getCookSalesByCategory,
  getCookOrderStats,
  getCookOrders,
  getCookOrderDetails,
  reportOrderIssue,
  updateOrderTime,
  markItemUnavailable
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

router.route('/:id/report-issue')
  .post(protect, reportOrderIssue);

router.route('/:orderId/sub-order/:subOrderId/cancel')
  .post(protect, cancelOrder);

router.route('/sub-order/:subOrderId/status')
  .put(protect, updateSubOrderStatus);

// Cook dashboard routes
router.route('/cook/sales-summary')
  .get(protect, authorize('cook'), getCookSalesSummary);

router.route('/cook/sales-by-category')
  .get(protect, authorize('cook'), getCookSalesByCategory);

router.route('/cook/order-stats')
  .get(protect, authorize('cook'), getCookOrderStats);

router.route('/cook/orders')
  .get(protect, authorize('cook'), getCookOrders);

router.route('/cook/orders/:id')
  .get(protect, authorize('cook'), getCookOrderDetails);

// Order updates (Time/Items)
router.put('/:id/scheduled-time', protect, updateOrderTime);
router.put('/:id/items/:productId/unavailable', protect, markItemUnavailable);

module.exports = router;