const CheckoutSession = require('../models/CheckoutSession');
const { Order } = require('../models/Order');
const Product = require('../models/Product');
const Cook = require('../models/Cook');
const pricingService = require('../services/pricingService');
const { getDistance, isValidCoordinate } = require('../utils/geo');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
let stripe;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'dummy_key');
} catch (err) {
  console.error('⚠️ Stripe initialization failed. Payment intent creation will fail.', err.message);
}

/**
 * @desc    Create checkout session from cart
 * @route   POST /api/checkout/session
 * @access  Private
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { cartItems, countryCode, cookPreferences } = req.body; // Array of { dishId, cookId, quantity, unitPrice, notes }
    const userId = req.user.id;
    const normalizedCountry = (countryCode || 'SA').toUpperCase().trim();

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Build cart snapshot
    const cartSnapshot = await Promise.all(
      cartItems.map(async (item) => {
        // Handle both ObjectId and string dish IDs gracefully
        let product = null;
        try {
          // Only attempt DB lookup if dishId looks like a valid ObjectId (24 hex chars)
          if (item.dishId && /^[0-9a-fA-F]{24}$/.test(item.dishId)) {
            product = await Product.findById(item.dishId);
          }
        } catch (err) {
          // Invalid ObjectId format, product remains null
          console.log(`Product lookup skipped for invalid dishId: ${item.dishId}`);
        }
        return {
          cook: item.cookId,
          dish: item.dishId,
          dishName: product ? product.name : (item.dishName || 'Unknown Dish'),
          dishImage: product?.image || item.dishImage || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || '',
          fulfillmentMode: item.fulfillmentMode || 'pickup',
          deliveryFee: item.deliveryFee || 0,
          prepTime: item.prepTime,
          prepReadyConfig: item.prepReadyConfig
        };
      })
    );

    // Calculate initial pricing
    console.log('💰 [DEBUG] Creating session with country:', normalizedCountry);
    const pricingResult = await pricingService.calculatePricing(cartSnapshot, null, userId, normalizedCountry);

    // Create session
    const session = await CheckoutSession.create({
      user: userId,
      status: 'PRICED',
      cartSnapshot,
      cookPreferences: cookPreferences || {},
      pricingBreakdown: pricingResult.pricingBreakdown,
      addressSnapshot: {
        countryCode: normalizedCountry
      }
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
 * @desc    Update country in checkout session
 * @route   PATCH /api/checkout/session/:id/country
 * @access  Private
 */
exports.updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { countryCode } = req.body;
    const userId = req.user.id;
    const normalizedCountry = (countryCode || 'SA').toUpperCase().trim();

    const session = await CheckoutSession.findById(id);

    if (!session || session.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (!session.addressSnapshot) {
      session.addressSnapshot = {};
    }
    session.addressSnapshot.countryCode = normalizedCountry;

    // Recalculate pricing
    const pricingResult = await pricingService.calculatePricing(
      session.cartSnapshot,
      session.appliedCoupon?.code,
      userId,
      normalizedCountry
    );

    session.pricingBreakdown = pricingResult.pricingBreakdown;
    await session.save();

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Update country error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating country',
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
      console.warn('⚠️ Checkout session not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Checkout session not found'
      });
    }

    console.log('📖 Fetched session:', id, 'VAT Amount:', session.pricingBreakdown?.vatAmount);
    
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
  console.log('📦 updateAddress called for session:', req.params.id);
  console.log('📦 Payload:', JSON.stringify(req.body, null, 2));
  try {
    const { id } = req.params;
    const { addressLine1, fullAddress, addressLine2, city, label, deliveryNotes, lat, lng } = req.body;
    const userId = req.user.id;

    const session = await CheckoutSession.findById(id);

    if (!session || session.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Update address snapshot with new structure
    const resolvedCountry = req.body.countryCode || session.addressSnapshot?.countryCode || 'SA';
    
    session.addressSnapshot = {
      addressLine1: addressLine1 || fullAddress || '',
      addressLine2: addressLine2 || '',
      city,
      countryCode: resolvedCountry.toUpperCase().trim(),
      label: label || 'Home',
      deliveryNotes: deliveryNotes || '',
      lat: lat !== undefined ? lat : (req.body.coordinates?.lat ?? null),
      lng: lng !== undefined ? lng : (req.body.coordinates?.lng ?? null)
    };

    // CROSS-CITY AND DISTANCE VALIDATION
    const deliveryLat = session.addressSnapshot.lat;
    const deliveryLng = session.addressSnapshot.lng;
    const deliveryCity = session.addressSnapshot.city;

    if (!isValidCoordinate(deliveryLat, deliveryLng)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_LOCATION',
        message: 'Delivery address must have a valid location selected on the map.'
      });
    }

    if (deliveryCity) {
      for (const item of session.cartSnapshot) {
        // Skip cook validation for demo/legacy string IDs (not valid ObjectIds)
        if (!item.cook || !/^[0-9a-fA-F]{24}$/.test(item.cook)) {
          console.log(`Skipping cook validation for demo cook ID: ${item.cook}`);
          continue;
        }
        
        const cook = await Cook.findOne({ userId: item.cook });
        if (cook) {
          // Check Cook Location Validity
          if (!cook.location || !isValidCoordinate(cook.location.lat, cook.location.lng)) {
            return res.status(400).json({
              success: false,
              errorCode: 'COOK_LOCATION_INVALID',
              message: `Cook ${cook.storeName} has an invalid location. Please contact support.`
            });
          }

          // Check City Match
          if (cook.city && cook.city.toLowerCase() !== deliveryCity.toLowerCase()) {
            return res.status(400).json({
              success: false,
              errorCode: 'CITY_MISMATCH',
              message: `Some items are from a different city (${cook.city}). Please change your delivery address or modify your cart.`
            });
          }

          // Check 25km Distance Rule
          const distance = getDistance(deliveryLat, deliveryLng, cook.location.lat, cook.location.lng);
          if (distance > 25) {
            return res.status(400).json({
              success: false,
              errorCode: 'DISTANCE_EXCEEDED',
              message: `Kitchen ${cook.storeName} is too far away (${Math.round(distance)}km). Maximum delivery distance is 25km.`
            });
          }
        }
      }
    }

    // Recalculate pricing with resolved country code
    console.log('💰 Recalculating pricing for country:', session.addressSnapshot.countryCode);
    const pricingResult = await pricingService.calculatePricing(
      session.cartSnapshot,
      session.appliedCoupon?.code,
      userId,
      session.addressSnapshot.countryCode
    );
    console.log('💰 Pricing Result:', JSON.stringify(pricingResult.pricingBreakdown, null, 2));

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
      userId,
      session.addressSnapshot?.countryCode || 'SA'
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
      userId,
      session.addressSnapshot?.countryCode || 'SA'
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
      userId,
      session.addressSnapshot?.countryCode || 'SA'
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

    // FINAL VALIDATION: CITY AND DISTANCE
    const deliveryLat = session.addressSnapshot.lat;
    const deliveryLng = session.addressSnapshot.lng;
    const deliveryCity = session.addressSnapshot.city;

    if (!isValidCoordinate(deliveryLat, deliveryLng) || !deliveryCity) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address with valid coordinates and city is required'
      });
    }

    for (const item of session.cartSnapshot) {
      // Skip cook validation for demo/legacy string IDs (not valid ObjectIds)
      if (!item.cook || !/^[0-9a-fA-F]{24}$/.test(item.cook)) {
        console.log(`Skipping cook validation for demo cook ID: ${item.cook}`);
        continue;
      }
      
      const cook = await Cook.findOne({ userId: item.cook });
      if (cook) {
        // Strict location check
        if (!cook.location || !isValidCoordinate(cook.location.lat, cook.location.lng)) {
          return res.status(400).json({
            success: false,
            message: `Kitchen ${cook.storeName} has an invalid location.`
          });
        }

        // City Match
        if (cook.city && cook.city.toLowerCase() !== deliveryCity.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: 'Order contains items from a different city'
          });
        }

        // Distance Check
        const distance = getDistance(deliveryLat, deliveryLng, cook.location.lat, cook.location.lng);
        if (distance > 25) {
          return res.status(400).json({
            success: false,
            message: 'Delivery distance exceeds 25km limit'
          });
        }
      }
    }

    // Final pricing recalculation
    const pricingResult = await pricingService.calculatePricing(
      session.cartSnapshot,
      session.appliedCoupon?.code,
      userId,
      session.addressSnapshot?.countryCode || 'SA'
    );

    session.pricingBreakdown = pricingResult.pricingBreakdown;
    session.idempotencyKey = idempotencyKey;

    const subOrders = [];
    // Group cart items by cook
    const itemsByCook = session.cartSnapshot.reduce((acc, item) => {
      if (!acc[item.cook]) acc[item.cook] = [];
      acc[item.cook].push(item);
      return acc;
    }, {});

    for (const [cookUserId, items] of Object.entries(itemsByCook)) {
      // Skip cook lookup for demo/legacy string IDs (not valid ObjectIds)
      let cook = null;
      if (/^[0-9a-fA-F]{24}$/.test(cookUserId)) {
        cook = await Cook.findOne({ userId: cookUserId });
      } else {
        console.log(`Skipping cook lookup for demo cook ID: ${cookUserId}`);
      }
      
      const subOrderTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      
      // Get cook preference for combine/separate
      const cookPref = session.cookPreferences?.[cookUserId] || {};
      const timingPreference = cookPref.timingPreference || 'separate';
      
      // Determine fulfillment mode (delivery if any item is delivery)
      const hasDelivery = items.some(item => item.fulfillmentMode === 'delivery');
      const fulfillmentMode = hasDelivery ? 'delivery' : 'pickup';
      
      // Calculate delivery fee based on preference
      let deliveryFee = 0;
      if (hasDelivery) {
        if (timingPreference === 'combined') {
          // Combined: use highest fee
          const fees = items
            .filter(item => item.fulfillmentMode === 'delivery')
            .map(item => item.deliveryFee || 0);
          deliveryFee = fees.length > 0 ? Math.max(...fees) : 0;
        } else {
          // Separate: sum all fees
          deliveryFee = items
            .filter(item => item.fulfillmentMode === 'delivery')
            .reduce((sum, item) => sum + (item.deliveryFee || 0), 0);
        }
      }
      
      // Calculate combined ready time (latest prep time if combined)
      let combinedReadyTime = null;
      if (timingPreference === 'combined') {
        const prepTimes = items.map(item => {
          if (item.prepReadyConfig?.optionType === 'fixed') {
            return item.prepReadyConfig.prepTimeMinutes;
          } else if (item.prepReadyConfig?.optionType === 'range') {
            return item.prepReadyConfig.prepTimeMaxMinutes;
          }
          return item.prepTime || 0;
        });
        const maxPrepTime = Math.max(...prepTimes);
        combinedReadyTime = new Date(Date.now() + maxPrepTime * 60000);
      }
      
      const cookAddress = cook ? `${cook.city || 'N/A'}, ${cook.area || ''}` : 'N/A';
      subOrders.push({
        cook: cookUserId,
        pickupAddress: cookAddress,
        cookLocationSnapshot: {
          lat: cook?.location?.lat || 0,
          lng: cook?.location?.lng || 0,
          address: cookAddress,
          city: cook?.city || 'Unknown'
        },
        totalAmount: subOrderTotal,
        status: 'order_received',
        fulfillmentMode,
        timingPreference,
        combinedReadyTime,
        deliveryFee,
        items: items.map(item => ({
          product: item.dish,
          quantity: item.quantity,
          price: item.unitPrice,
          notes: item.notes,
          productSnapshot: {
            name: item.dishName,
            image: item.dishImage,
            description: ''
          }
        }))
      });
    }

    // Create order from session with delivery address snapshot and VAT snapshot
    const order = await Order.create({
      customer: userId,
      checkoutSession: session._id,
      deliveryAddress: {
        addressLine1: session.addressSnapshot.addressLine1 || '',
        addressLine2: session.addressSnapshot.addressLine2 || '',
        city: session.addressSnapshot.city || '',
        countryCode: session.addressSnapshot.countryCode || 'SA',
        label: session.addressSnapshot.label || 'Home',
        deliveryNotes: session.addressSnapshot.deliveryNotes || '',
        lat: session.addressSnapshot.lat || 0,
        lng: session.addressSnapshot.lng || 0
      },
      subOrders,
      totalAmount: session.pricingBreakdown.total,
      vatSnapshot: {
        countryCode: session.addressSnapshot?.countryCode || 'SA',
        checkoutVatEnabledAtOrder: session.pricingBreakdown.checkoutVatEnabled,
        checkoutVatRateAtOrder: session.pricingBreakdown.vatRate,
        invoiceVatEnabledAtOrder: session.pricingBreakdown.invoiceVatEnabled,
        invoiceVatRateAtOrder: session.pricingBreakdown.invoiceVatRate,
        vatAmount: session.pricingBreakdown.vatAmount,
        subtotal: session.pricingBreakdown.subtotal,
        total: session.pricingBreakdown.total,
        vatLabel: session.pricingBreakdown.vatLabel
      },
      status: 'pending'
    });

    // Record redemptions if any
    if (session.appliedCoupon) {
      const Campaign = require('../models/Campaign');
      const Coupon = require('../models/Coupon');
      
      const campaign = await Campaign.findById(session.appliedCoupon.campaignId);
      const coupon = await Coupon.findOne({ code: session.appliedCoupon.code });
      
      // Only record redemption if campaign exists
      if (campaign) {
        await pricingService.recordRedemption(
          campaign,
          coupon,
          { _id: userId },
          order,
          session.appliedCoupon.discountAmount,
          session
        );
      } else {
        console.log(`Campaign ${session.appliedCoupon.campaignId} not found, skipping redemption recording`);
      }
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

/**
 * @desc    Create Stripe payment intent
 * @route   POST /api/checkout/session/:id/payment-intent
 * @access  Private
 */
exports.createPaymentIntent = async (req, res) => {
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

    if (!session.addressSnapshot || !session.addressSnapshot.lat) {
      return res.status(400).json({
        success: false,
        message: 'Address required before creating payment intent'
      });
    }

    // Calculate amount in cents (Stripe expects smallest currency unit)
    const amount = Math.round(session.pricingBreakdown.total * 100);
    const currency = (session.pricingBreakdown.currencyCode || 'SAR').toLowerCase();

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        sessionId: session._id.toString(),
        userId: userId,
        orderDescription: `Order for ${session.cartSnapshot.length} items`
      }
    });

    // Save payment intent ID to session
    session.paymentIntentId = paymentIntent.id;
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent',
      error: error.message
    });
  }
};
