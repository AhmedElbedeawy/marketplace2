const CheckoutSession = require('../models/CheckoutSession');
const { Order } = require('../models/Order');
const Product = require('../models/Product');
const pricingService = require('../services/pricingService');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Create checkout session from cart
 * @route   POST /api/checkout/session
 * @access  Private
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { cartItems } = req.body; // Array of { dishId, cookId, quantity, unitPrice, notes }
    const userId = req.user.id;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Build cart snapshot
    const cartSnapshot = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item.dishId);
        return {
          cook: item.cookId,
          dish: item.dishId,
          dishName: product ? product.name : 'Unknown Dish',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || ''
        };
      })
    );

    // Calculate initial pricing
    const pricingResult = await pricingService.calculatePricing(cartSnapshot, null, userId);

    // Create session
    const session = await CheckoutSession.create({
      user: userId,
      status: 'PRICED',
      cartSnapshot,
      pricingBreakdown: pricingResult.pricingBreakdown
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        session
      }
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating checkout session',
      error: error.message
    });
  }
};

/**
 * @desc    Get checkout session
 * @route   GET /api/checkout/session/:id
 * @access  Private
 */
exports.getCheckoutSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await CheckoutSession.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Checkout session not found'
      });
    }

    // Verify ownership
    if (session.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Get checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching checkout session',
      error: error.message
    });
  }
};

/**
 * @desc    Update address in checkout session
 * @route   PATCH /api/checkout/session/:id/address
 * @access  Private
 */
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullAddress, city, coordinates, deliveryNotes } = req.body;
    const userId = req.user.id;

    const session = await CheckoutSession.findById(id);

    if (!session || session.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Update address snapshot
    session.addressSnapshot = {
      fullAddress,
      city,
      coordinates,
      deliveryNotes
    };

    // Recalculate pricing
    const pricingResult = await pricingService.calculatePricing(
      session.cartSnapshot,
      session.appliedCoupon?.code,
      userId
    );

    session.pricingBreakdown = pricingResult.pricingBreakdown;
    await session.save();

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating address',
      error: error.message
    });
  }
};

/**
 * @desc    Apply coupon to checkout session
 * @route   POST /api/checkout/session/:id/coupon
 * @access  Private
 */
exports.applyCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    const userId = req.user.id;

    const session = await CheckoutSession.findById(id);

    if (!session || session.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Recalculate pricing with coupon
    const pricingResult = await pricingService.calculatePricing(
      session.cartSnapshot,
      code,
      userId
    );

    if (!pricingResult.appliedCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inapplicable coupon code'
      });
    }

    session.appliedCoupon = pricingResult.appliedCoupon;
    session.pricingBreakdown = pricingResult.pricingBreakdown;
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: session
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying coupon',
      error: error.message
    });
  }
};

/**
 * @desc    Remove coupon from checkout session
 * @route   DELETE /api/checkout/session/:id/coupon
 * @access  Private
 */
exports.removeCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await CheckoutSession.findById(id);

    if (!session || session.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Recalculate pricing without coupon
    const pricingResult = await pricingService.calculatePricing(
      session.cartSnapshot,
      null,
      userId
    );

    session.appliedCoupon = null;
    session.pricingBreakdown = pricingResult.pricingBreakdown;
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Coupon removed',
      data: session
    });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing coupon',
      error: error.message
    });
  }
};

/**
 * @desc    Set payment method
 * @route   PATCH /api/checkout/session/:id/payment-method
 * @access  Private
 */
exports.setPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body; // 'CASH' or 'CARD'
    const userId = req.user.id;

    if (!['CASH', 'CARD'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    const session = await CheckoutSession.findById(id);

    if (!session || session.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.paymentMethod = method;
    
    // Recalculate pricing
    const pricingResult = await pricingService.calculatePricing(
      session.cartSnapshot,
      session.appliedCoupon?.code,
      userId
    );

    session.pricingBreakdown = pricingResult.pricingBreakdown;
    await session.save();

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Set payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting payment method',
      error: error.message
    });
  }
};

/**
 * @desc    Confirm order (place order)
 * @route   POST /api/checkout/session/:id/confirm
 * @access  Private
 */
exports.confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { idempotencyKey } = req.body;
    const userId = req.user.id;

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency key required'
      });
    }

    const session = await CheckoutSession.findById(id);

    if (!session || session.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check for duplicate with idempotency key
    if (session.idempotencyKey === idempotencyKey && session.status === 'CONFIRMED') {
      // Return existing order
      const existingOrder = await Order.findOne({ checkoutSession: session._id });
      return res.status(200).json({
        success: true,
        message: 'Order already placed',
        data: {
          orderId: existingOrder._id,
          order: existingOrder
        }
      });
    }

    // Validate payment
    if (session.paymentMethod === 'CARD' && session.paymentStatus !== 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Final pricing recalculation
    const pricingResult = await pricingService.calculatePricing(
      session.cartSnapshot,
      session.appliedCoupon?.code,
      userId
    );

    session.pricingBreakdown = pricingResult.pricingBreakdown;
    session.idempotencyKey = idempotencyKey;

    // Create order from session with address snapshot
    const order = await Order.create({
      customer: userId,
      checkoutSession: session._id,
      // Store complete address snapshot (immutable)
      deliveryAddress: {
        addressLine1: session.addressSnapshot.addressLine1 || '',
        addressLine2: session.addressSnapshot.addressLine2 || '',
        city: session.addressSnapshot.city || '',
        label: session.addressSnapshot.label || 'Home',
        deliveryNotes: session.addressSnapshot.deliveryNotes || '',
        lat: session.addressSnapshot.lat || 0,
        lng: session.addressSnapshot.lng || 0
      },
      subOrders: [{
        cook: session.cartSnapshot[0].cook,
        pickupAddress: session.cartSnapshot[0].pickupAddress || 'N/A',
        totalAmount: session.pricingBreakdown.total,
        status: 'order_received',
        items: session.cartSnapshot.map(item => ({
          product: item.dish,
          quantity: item.quantity,
          price: item.unitPrice,
          notes: item.notes
        }))
      }],
      totalAmount: session.pricingBreakdown.total,
      status: 'pending'
    });

    // Record redemptions if any
    if (session.appliedCoupon) {
      const Campaign = require('../models/Campaign');
      const Coupon = require('../models/Coupon');
      
      const campaign = await Campaign.findById(session.appliedCoupon.campaignId);
      const coupon = await Coupon.findOne({ code: session.appliedCoupon.code });
      
      await pricingService.recordRedemption(
        campaign,
        coupon,
        { _id: userId },
        order,
        session.appliedCoupon.discountAmount,
        session
      );
    }

    // Mark session as confirmed
    session.status = 'CONFIRMED';
    session.paymentStatus = session.paymentMethod === 'CASH' ? 'UNPAID' : 'PAID';
    await session.save();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: order._id,
        order
      }
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming order',
      error: error.message
    });
  }
};
