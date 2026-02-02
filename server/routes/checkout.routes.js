const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createCheckoutSession,
  getCheckoutSession,
  updateCountry,
  updateAddress,
  applyCoupon,
  removeCoupon,
  setPaymentMethod,
  confirmOrder,
  createPaymentIntent
} = require('../controllers/checkoutController');

// @route   POST /api/checkout/session
// @desc    Create checkout session from cart
// @access  Private
router.post('/session', protect, createCheckoutSession);

// @route   GET /api/checkout/session/:id
// @desc    Get checkout session details
// @access  Private
router.get('/session/:id', protect, getCheckoutSession);

// @route   PATCH /api/checkout/session/:id/country
// @desc    Update country and recalculate pricing
// @access  Private
router.patch('/session/:id/country', protect, updateCountry);

// @route   PATCH /api/checkout/session/:id/address
// @desc    Update delivery address
// @access  Private
router.patch('/session/:id/address', protect, updateAddress);

// @route   POST /api/checkout/session/:id/coupon
// @desc    Apply coupon code
// @access  Private
router.post('/session/:id/coupon', protect, applyCoupon);

// @route   DELETE /api/checkout/session/:id/coupon
// @desc    Remove applied coupon
// @access  Private
router.delete('/session/:id/coupon', protect, removeCoupon);

// @route   PATCH /api/checkout/session/:id/payment-method
// @desc    Set payment method (CASH or CARD)
// @access  Private
router.patch('/session/:id/payment-method', protect, setPaymentMethod);

// @route   POST /api/checkout/session/:id/payment-intent
// @desc    Create Stripe payment intent for card payment
// @access  Private
router.post('/session/:id/payment-intent', protect, createPaymentIntent);

// @route   POST /api/checkout/session/:id/confirm
// @desc    Confirm and place order
// @access  Private
router.post('/session/:id/confirm', protect, confirmOrder);

module.exports = router;
