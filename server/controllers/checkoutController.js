const CheckoutSession = require('../models/CheckoutSession');
const { Order } = require('../models/Order');
const Product = require('../models/Product');
const AdminDish = require('../models/AdminDish');
const User = require('../models/User');
const DishOffer = require('../models/DishOffer');
const Cook = require('../models/Cook');
const pricingService = require('../services/pricingService');
const { getDistance, isValidCoordinate } = require('../utils/geo');
const { createNotification } = require('../utils/notifications');
const timezoneUtils = require('../utils/timezoneUtils');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
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

    // DEBUG: Log incoming cart to verify photoUrl is sent from frontend
    console.log('[CHECKOUT] === CREATE SESSION START ===');
    console.log('[CHECKOUT] Incoming cartItems count:', cartItems.length);
    cartItems.slice(0, 2).forEach((item, idx) => {
      console.log(`[CHECKOUT] Item ${idx}: dishName=${item.dishName}, photoUrl=${item.photoUrl}, fulfillmentMode=${item.fulfillmentMode}, portionKey=${item.portionKey}`);
    });

    // Build cart snapshot
    console.log('[CHECKOUT] === CREATE SESSION DEBUG ===');
    console.log('[CHECKOUT] Items count:', cartItems.length);
    cartItems.slice(0, 2).forEach((item, idx) => {
      console.log(`[CHECKOUT] Item ${idx}: photoUrl=${item.photoUrl}, dishName=${item.dishName}`);
    });
    const cartSnapshot = await Promise.all(
      cartItems.map(async (item) => {
        // Handle both ObjectId and string dish IDs gracefully
        let product = null;
        let dishOffer = null;
        try {
          // Only attempt DB lookup if dishId looks like a valid ObjectId (24 hex chars)
          if (item.dishId && /^[0-9a-fA-F]{24}$/.test(item.dishId)) {
            // FIX #8: Try DishOffer first (frontend sends DishOffer._id as dishId)
            dishOffer = await DishOffer.findById(item.dishId);
            if (dishOffer) {
              // Found DishOffer - populate adminDish for name
              product = await AdminDish.findById(dishOffer.adminDishId);
            } else {
              // Fallback: try Product (legacy path)
              product = await Product.findById(item.dishId);
            }
          }
        } catch (err) {
          // Invalid ObjectId format, product remains null
          console.log(`Product/DishOffer lookup skipped for invalid dishId: ${item.dishId}`);
        }
        
        // Convert Cook._id (profile ID) → User._id (account ID)
        // item.cookId is Cook._id from frontend; we need Cook.userId for subOrder.cook
        let cookUserId = null;
        let cookCountryCode = null;
        
        if (item.cookId && /^[0-9a-fA-F]{24}$/.test(item.cookId)) {
          const cook = await Cook.findById(item.cookId);
          if (cook && cook.userId) {
            cookUserId = cook.userId.toString();
            console.log(`[CHECKOUT] ✅ Converted Cook._id ${item.cookId} → User._id ${cookUserId}`);
          } else {
            console.error(`[CHECKOUT] ❌ CRITICAL: Cook profile not found for Cook._id ${item.cookId}. Cannot create order without valid cook.`);
            throw new Error(`Invalid cook ID: ${item.cookId}. Cook profile not found.`);
          }
          // Get cook's countryCode for timezone calculation
          if (cook && cook.countryCode) {
            cookCountryCode = cook.countryCode;
          }
        } else {
          console.error(`[CHECKOUT] ❌ CRITICAL: Invalid cookId format: ${item.cookId}`);
          throw new Error(`Invalid cook ID format: ${item.cookId}`);
        }
        
        // Compute readyAt on backend using cook's timezone (NOT from frontend)
        let computedReadyAt = null;
        if (item.prepReadyConfig && item.prepReadyConfig.optionType === 'cutoff') {
          const readyTimeResult = timezoneUtils.calculateReadyTimeWithTimezone(
            item.prepReadyConfig,
            cookCountryCode,
            new Date()
          );
          computedReadyAt = readyTimeResult.readyAt;
        }
        
        // Get timing preference from cookPreferences (passed from cart) or item
        const cookPref = cookPreferences?.[cookUserId] || {};
        const timingPreference = item.timingPreference || cookPref.timingPreference || 'separate';
        
        // FIX #2: Resolve dishOffer ID
        // Frontend sends foodId which is DishOffer._id (see mobile checkout_screen.dart line 75)
        // So item.dishId IS the DishOffer._id, not AdminDish._id
        let resolvedDishOffer = item.dishOffer || item.offerId || null;
        
        // If dishOffer not provided, verify if dishId is actually a DishOffer._id
        if (!resolvedDishOffer && item.dishId && /^[0-9a-fA-F]{24}$/.test(item.dishId)) {
          // Try to find DishOffer by _id first (most likely scenario)
          const existingOffer = await DishOffer.findById(item.dishId);
          if (existingOffer) {
            resolvedDishOffer = item.dishId;
            console.log(`[CHECKOUT] dishId is DishOffer._id: ${resolvedDishOffer}`);
          } else {
            // Fallback: dishId might be AdminDish._id, find DishOffer by cook + adminDish
            const cookLookup = await Cook.findById(item.cookId);
            if (cookLookup) {
              const offerByAdminDish = await DishOffer.findOne({
                cook: item.cookId,
                adminDishId: item.dishId
              });
              if (offerByAdminDish) {
                resolvedDishOffer = offerByAdminDish._id.toString();
                console.log(`[CHECKOUT] Resolved dishOffer from adminDish: ${resolvedDishOffer}`);
              }
            }
          }
        }
        
        return {
          cook: cookUserId,
          dish: item.dishId,
          dishOffer: resolvedDishOffer || item.dishId, // Fallback: if dishId is DishOffer._id, use it directly
          dishName: product ? (product.nameEn || product.name) : (item.dishName || 'Unknown Dish'),
          // FIX #8: Priority chain for image - frontend photoUrl > dishOffer images > adminDish images
          dishImage: item.photoUrl || 
                     dishOffer?.images?.[0] || 
                     dishOffer?.imageUrl || 
                     product?.imageUrl || 
                     product?.images?.[0] || 
                     item.dishImage || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || '',
          portionKey: item.portionKey, // MUST preserve exact portionKey from frontend - no fallback
          fulfillmentMode: item.fulfillmentMode || 'pickup',
          deliveryFee: item.deliveryFee || 0,
          prepTime: item.prepTimeMinutes || item.prepTime || 30,
          readyAt: computedReadyAt, // Computed by backend using cook's timezone
          prepTimeText: item.prepTimeText || null,
          prepReadyConfig: item.prepReadyConfig,
          timingPreference: timingPreference,
        };
      })
    );
    
    // DEBUG: Log cartSnapshot to verify portionKey is saved
    console.log('[CHECKOUT] === CART SNAPSHOT CREATED ===');
    cartSnapshot.slice(0, 2).forEach((item, idx) => {
      console.log(`[CHECKOUT] Snapshot ${idx}: dish=${item.dish}, dishOffer=${item.dishOffer}, portionKey=${item.portionKey}, quantity=${item.quantity}`);
    });

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
    
    // DEBUG: Verify photoUrl exists in session cartSnapshot
    console.log('[CONFIRM_DEBUG] session.cartSnapshot[0]=', session.cartSnapshot[0]);

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
    
    // DEBUG: Verify photoUrl exists in session cartSnapshot
    console.log('[CONFIRM_DEBUG] session.cartSnapshot[0]=', session.cartSnapshot[0]);

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
    
    // DEBUG: Verify photoUrl exists in session cartSnapshot
    console.log('[CONFIRM_DEBUG] session.cartSnapshot[0]=', session.cartSnapshot[0]);

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
    
    // DEBUG: Verify photoUrl exists in session cartSnapshot
    console.log('[CONFIRM_DEBUG] session.cartSnapshot[0]=', session.cartSnapshot[0]);

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
    
    // DEBUG: Verify photoUrl exists in session cartSnapshot
    console.log('[CONFIRM_DEBUG] session.cartSnapshot[0]=', session.cartSnapshot[0]);

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
    
    // DEBUG: Verify photoUrl exists in session cartSnapshot
    console.log('[CONFIRM_DEBUG] session.cartSnapshot[0]=', session.cartSnapshot[0]);

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

    // STOCK VALIDATION + ATOMIC DECREMENT (Product + DishOffer variant-aware)
    const stockDecrements = [];
    for (const item of session.cartSnapshot) {
      // CRITICAL: Use dishOffer ID (DishOffer._id) which contains variants, not dish ID
      const dishId = item.dishOffer || item.dish;
      const portionKey = item.portionKey;
      
      console.log(`[STOCK_DEBUG] Cart item: dish=${item.dish}, dishOffer=${item.dishOffer}, using=${dishId}, portionKey=${portionKey}, quantity=${item.quantity}`);
      
      if (!dishId || !/^[0-9a-fA-F]{24}$/.test(dishId.toString())) {
        console.log(`Skipping stock validation for non-ObjectId dishId: ${dishId}`);
        continue;
      }
      
      // Try DishOffer FIRST (has variants), then fallback to Product (legacy)
      let dishOffer = await DishOffer.findById(dishId);
      let product = null;
      let modelType = 'DishOffer';
      
      if (!dishOffer) {
        // Fallback: try Product (legacy path - no variants support)
        product = await Product.findById(dishId);
        if (!product) {
          return res.status(400).json({ success: false, message: `Dish ${dishId} not found` });
        }
        modelType = 'Product';
      }
      
      const dish = dishOffer || product;
      console.log(`[STOCK_DEBUG] Found dish: ${dish.name || dishId}, modelType=${modelType}, hasVariants=${dish.variants && dish.variants.length > 0}, portionSize=${dish.portionSize}`);
      if (dish.variants && dish.variants.length > 0) {
        console.log(`[STOCK_DEBUG] Variants:`, dish.variants.map(v => ({ portionKey: v.portionKey, stock: v.stock })));
      }
      
      const resolvedPortionKey = item.portionKey || dish.portionSize;
      if (!resolvedPortionKey) {
        return res.status(400).json({ success: false, message: `Missing portionKey for dish ${dishId}` });
      }
      const qty = item.quantity || 1;
      
      console.log(`[STOCK_DEBUG] Using portionKey=${resolvedPortionKey}, qty=${qty}`);
      
      // Check if dish has variants
      if (dish.variants && dish.variants.length > 0) {
        // CRITICAL: Only validate variant EXISTS, don't check stock here
        // Stock will be checked atomically in the decrement operation
        const variant = dish.variants.find(v => v.portionKey === resolvedPortionKey);
        if (!variant) {
          return res.status(400).json({ 
            success: false, 
            errorCode: 'VARIANT_NOT_FOUND',
            message: `The selected size (${resolvedPortionKey}) is no longer available`,
            unavailableItems: [{
              itemId: dishId,
              name: dish.name,
              portionKey: resolvedPortionKey,
              issue: 'VARIANT_NOT_FOUND'
            }]
          });
        }
        stockDecrements.push({ dishId, portionKey: resolvedPortionKey, qty, isVariant: true, modelType });
      } else {
        // Legacy single-stock - no pre-validation needed
        stockDecrements.push({ dishId, qty, isVariant: false, modelType });
      }
    }
    
    // CRITICAL: NO pre-validation step - rely solely on atomic decrement with condition
    // Pre-validation creates race condition: Request A validates (stock=8), Request B validates (stock=8),
    // both pass, then both decrement - overselling!
    // Solution: Single atomic operation with { $gte: qty } condition
    
    // Atomic decrements with transaction rollback (Product + DishOffer variant-aware)
    const decrementedItems = []; // Track successful decrements for rollback
    
    try {
      for (const dec of stockDecrements) {
        const Model = dec.modelType === 'Product' ? Product : DishOffer;
        
        if (dec.isVariant) {
          const result = await Model.updateOne(
            { _id: dec.dishId, 'variants.portionKey': dec.portionKey, 'variants.stock': { $gte: dec.qty } },
            { $inc: { 'variants.$.stock': -dec.qty } }
          );
          if (result.modifiedCount !== 1) {
            // FAILED: Insufficient stock or race condition - rollback ALL previous decrements
            console.log(`❌ [CHECKOUT] Stock decrement failed for ${dec.dishId} (${dec.portionKey}). Rolling back ${decrementedItems.length} items.`);
            
            // Rollback all previously decremented items
            for (const rolledBack of decrementedItems) {
              const RollbackModel = rolledBack.modelType === 'Product' ? Product : DishOffer;
              if (rolledBack.isVariant) {
                await RollbackModel.updateOne(
                  { _id: rolledBack.dishId, 'variants.portionKey': rolledBack.portionKey },
                  { $inc: { 'variants.$.stock': rolledBack.qty } } // INCREMENT to restore
                );
              } else {
                await RollbackModel.updateOne(
                  { _id: rolledBack.dishId },
                  { $inc: { stock: rolledBack.qty } } // INCREMENT to restore
                );
              }
              console.log(`  ↩️ Rolled back: ${rolledBack.dishId} (${rolledBack.portionKey || 'legacy'}) +${rolledBack.qty}`);
            }
            
            // Fetch current stock for user-friendly error
            const dish = await Model.findById(dec.dishId);
            const variant = dish?.variants?.find(v => v.portionKey === dec.portionKey);
            return res.status(400).json({ 
              success: false, 
              errorCode: 'STOCK_CHANGED',
              message: 'Stock changed. Check cart.',
              unavailableItems: [{
                itemId: dec.dishId,
                name: dish?.name || 'Unknown Item',
                portionKey: dec.portionKey,
                requestedQty: dec.qty,
                availableQty: variant?.stock ?? 0,
                issue: 'INSUFFICIENT_STOCK'
              }]
            });
          }
          // SUCCESS: Track for potential rollback
          decrementedItems.push(dec);
          console.log(`✅ [CHECKOUT] Decremented stock: ${dec.dishId} (${dec.portionKey}) -${dec.qty}`);
        } else {
          const result = await Model.updateOne(
            { _id: dec.dishId, stock: { $gte: dec.qty } },
            { $inc: { stock: -dec.qty } }
          );
          if (result.modifiedCount !== 1) {
            // FAILED: Rollback ALL previous decrements
            console.log(`❌ [CHECKOUT] Stock decrement failed for ${dec.dishId}. Rolling back ${decrementedItems.length} items.`);
            
            for (const rolledBack of decrementedItems) {
              const RollbackModel = rolledBack.modelType === 'Product' ? Product : DishOffer;
              if (rolledBack.isVariant) {
                await RollbackModel.updateOne(
                  { _id: rolledBack.dishId, 'variants.portionKey': rolledBack.portionKey },
                  { $inc: { 'variants.$.stock': rolledBack.qty } }
                );
              } else {
                await RollbackModel.updateOne(
                  { _id: rolledBack.dishId },
                  { $inc: { stock: rolledBack.qty } }
                );
              }
              console.log(`  ↩️ Rolled back: ${rolledBack.dishId} (${rolledBack.portionKey || 'legacy'}) +${rolledBack.qty}`);
            }
            
            const dish = await Model.findById(dec.dishId);
            return res.status(400).json({ 
              success: false, 
              errorCode: 'STOCK_CHANGED',
              message: 'Stock changed. Check cart.',
              unavailableItems: [{
                itemId: dec.dishId,
                name: dish?.name || 'Unknown Item',
                requestedQty: dec.qty,
                availableQty: dish?.stock ?? 0,
                issue: 'INSUFFICIENT_STOCK'
              }]
            });
          }
          decrementedItems.push(dec);
          console.log(`✅ [CHECKOUT] Decremented stock: ${dec.dishId} -${dec.qty}`);
        }
      }
    } catch (error) {
      // UNEXPECTED ERROR: Rollback all decrements
      console.error('❌ [CHECKOUT] Unexpected error during stock decrement:', error);
      console.log(`Rolling back ${decrementedItems.length} decremented items...`);
      
      for (const rolledBack of decrementedItems) {
        try {
          const RollbackModel = rolledBack.modelType === 'Product' ? Product : DishOffer;
          if (rolledBack.isVariant) {
            await RollbackModel.updateOne(
              { _id: rolledBack.dishId, 'variants.portionKey': rolledBack.portionKey },
              { $inc: { 'variants.$.stock': rolledBack.qty } }
            );
          } else {
            await RollbackModel.updateOne(
              { _id: rolledBack.dishId },
              { $inc: { stock: rolledBack.qty } }
            );
          }
          console.log(`  ↩️ Rolled back: ${rolledBack.dishId}`);
        } catch (rollbackError) {
          console.error(`  ❌ Failed to rollback ${rolledBack.dishId}:`, rollbackError);
        }
      }
      
      return res.status(500).json({ 
        success: false, 
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to process order. Please try again.'
      });
    }
    
    // SUCCESS: All items decremented atomically
    
    // Sync legacy stock field for dishes with variants (sum of all variant stocks)
    const updatedDishIds = [...new Set(stockDecrements.filter(d => d.isVariant).map(d => ({ id: d.dishId, modelType: d.modelType })))];
    for (const { id, modelType } of updatedDishIds) {
      const Model = modelType === 'Product' ? Product : DishOffer;
      const dish = await Model.findById(id);
      if (dish?.variants?.length) {
        dish.stock = dish.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        await dish.save();
      }
    }

    const subOrders = [];
    // FIX #2: Group cart items by cook AND fulfillmentMode (not just cook)
    // This ensures pickup and delivery items from same cook become separate subOrders
    const itemsByCookAndFulfillment = session.cartSnapshot.reduce((acc, item) => {
      const key = `${item.cook}_${item.fulfillmentMode || 'pickup'}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    // Process each cook+fulfillment group as separate subOrder
    for (const [groupKey, items] of Object.entries(itemsByCookAndFulfillment)) {
      const cookUserId = items[0].cook;
      const fulfillmentMode = items[0].fulfillmentMode || 'pickup';
      // FIX #1: cookUserId is already User._id from cartSnapshot (converted in createCheckoutSession)
      // Need to find Cook profile by userId to get storeName and location
      let cook = null;
      if (/^[0-9a-fA-F]{24}$/.test(cookUserId)) {
        cook = await Cook.findOne({ userId: cookUserId });
        if (!cook) {
          console.log(`[CHECKOUT] WARNING: Cook profile not found for User._id ${cookUserId}`);
        }
      } else {
        console.log(`[CHECKOUT] Skipping cook lookup for non-ObjectId: ${cookUserId}`);
      }
      
      const subOrderTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      
      // Get cook preference for combine/separate
      const cookPref = session.cookPreferences?.[cookUserId] || {};
      const timingPreference = cookPref.timingPreference || 'separate';
      
      // FIX #2: All items in this group have the same fulfillmentMode (already split)
      // No need for 'mixed' mode - each subOrder is purely pickup or delivery
      
      // Calculate delivery fee based on preference
      let deliveryFee = 0;
      console.log(`[CHECKOUT DEBUG] Cook ${cookUserId}: timingPreference=${timingPreference}, items=${items.length}`);
      if (fulfillmentMode === 'delivery' || fulfillmentMode === 'mixed') {
        const deliveryItems = items.filter(item => item.fulfillmentMode === 'delivery');
        console.log(`[CHECKOUT DEBUG] Delivery items: ${deliveryItems.length}`);
        deliveryItems.forEach((item, idx) => {
          console.log(`[CHECKOUT DEBUG]   Item ${idx}: prepTime=${item.prepTime}, deliveryFee=${item.deliveryFee}`);
        });
        
        if (timingPreference === 'combined') {
          // Combined: use highest fee across all items
          const fees = deliveryItems.map(item => item.deliveryFee || 0);
          deliveryFee = fees.length > 0 ? Math.max(...fees) : 0;
          console.log(`[CHECKOUT DEBUG] Combined mode: fees=${fees}, maxFee=${deliveryFee}`);
        } else {
          // Separate: group by ready time (prepTime), take max per batch, sum batches
          const batches = {};
          for (const item of deliveryItems) {
            // Normalize prepTime - handle both number and string (e.g., "16:00") formats
            let readyTime = item.prepTime || item.prepReadyConfig?.prepTimeMinutes || 30;
            
            // If prepTime is a string like "16:00", convert to minutes from midnight
            if (typeof readyTime === 'string' && readyTime.includes(':')) {
              const [hours, minutes] = readyTime.split(':').map(Number);
              readyTime = hours * 60 + minutes;
            } else {
              readyTime = parseInt(readyTime, 10) || 30;
            }
            
            if (!batches[readyTime]) {
              batches[readyTime] = [];
            }
            batches[readyTime].push(item);
          }
          
          console.log(`[CHECKOUT DEBUG] Batches:`, Object.keys(batches));
          
          // Sum max fee per batch
          for (const readyTime in batches) {
            const batchItems = batches[readyTime];
            const batchFee = Math.max(...batchItems.map(item => item.deliveryFee || 0));
            console.log(`[CHECKOUT DEBUG] Batch ${readyTime}: items=${batchItems.length}, batchFee=${batchFee}`);
            deliveryFee += batchFee;
          }
          console.log(`[CHECKOUT DEBUG] Total deliveryFee: ${deliveryFee}`);
        }
      }
      
      // Calculate combined ready time (latest prep time if combined)
      let combinedReadyTime = null;
      // Calculate max prep time for all items in this subOrder
      const prepTimes = items.map(item => {
        if (item.prepReadyConfig?.optionType === 'fixed') {
          return item.prepReadyConfig.prepTimeMinutes;
        } else if (item.prepReadyConfig?.optionType === 'range') {
          return item.prepReadyConfig.prepTimeMaxMinutes;
        }
        return item.prepTime || 30;
      });
      const maxPrepTime = Math.max(...prepTimes);
      
      if (timingPreference === 'combined') {
        combinedReadyTime = new Date(Date.now() + maxPrepTime * 60000);
      }
      
      const cookAddress = cook ? `${cook.city || 'N/A'}, ${cook.area || ''}` : 'N/A';
      // DEBUG: Log image fields before pushing to subOrders
      console.log('[ORDER_IMG_FIELDS_DEBUG]', items.map(item => ({
        dishName: item.dishName,
        dishImage: item.dishImage,
        photoUrl: item.photoUrl
      })));
      
      // FIX #2: Resolve cook name for immediate response
      let cookNameValue = null;
      if (cook) {
        cookNameValue = cook.storeName || cook.name || null;
      }
      if (!cookNameValue && /^[0-9a-fA-F]{24}$/.test(cookUserId)) {
        const user = await User.findById(cookUserId).select('name');
        if (user) {
          cookNameValue = user.name;
        }
      }
      
      subOrders.push({
        cook: cookUserId,
        cookName: cookNameValue, // FIX #2: Persist cookName at creation time
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
        prepTime: maxPrepTime, // Store max prep time for overdue calculations
        // DEBUG: Log key values
        _debug: {
          itemCount: items.length,
          maxPrepTime,
          fulfillmentMode,
          timingPreference
        },
        deliveryFee,
        items: await Promise.all(items.map(async (item) => {
          // FIX: Ensure dishOffer is persisted - with proper fallback
          let dishOfferId = item.dishOffer;
          
          // If dishOffer not set, try to resolve it
          if (!dishOfferId && item.dish) {
            // First, check if item.dish is actually a DishOffer._id (mobile sends DishOffer._id as dishId)
            if (/^[0-9a-fA-F]{24}$/.test(item.dish)) {
              const directOffer = await DishOffer.findById(item.dish);
              if (directOffer) {
                dishOfferId = item.dish;
              }
            }
            
            // If still null, try adminDishId lookup (old path)
            if (!dishOfferId) {
              const cookProfile = await Cook.findOne({ userId: cookUserId });
              if (cookProfile) {
                const offer = await DishOffer.findOne({
                  cook: cookProfile._id,
                  adminDishId: item.dish
                });
                if (offer) {
                  dishOfferId = offer._id.toString();
                }
              }
            }
          }
          
          return {
            dishOffer: dishOfferId || null,
            product: item.dish,
            quantity: item.quantity,
            price: item.unitPrice,
            notes: item.notes,
            prepTime: item.prepTime || 30,
            readyAt: item.readyAt || null,
            prepTimeText: item.prepTimeText || null,
            productSnapshot: {
              name: item.dishName,
              image: item.dishImage,
              description: ''
            },
            // DEBUG: Log image priority chain
            _debug_img: (() => {
              const final = item.photoUrl || item.image || item.imageUrl || item.dishImage || '/assets/dishes/dish-placeholder.svg';
              console.log(`[ORDER_IMG] photoUrl='${item.photoUrl}' image='${item.image}' imageUrl='${item.imageUrl}' dishImage='${item.dishImage}' => FINAL='${final}'`);
              return final;
            })(),
            // DEBUG: Log what we're storing
            _debug_image: {
              dishImage: item.dishImage,
              photoUrl: item.photoUrl,
              dishName: item.dishName
            }
          };
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

    // Send push notifications to cooks for new order
    const notifyPromises = order.subOrders.map(async (subOrder) => {
      const cookUserId = subOrder.cook;
      const itemCount = subOrder.items.length;
      const totalAmount = subOrder.totalAmount;
      
      try {
        // Fetch cook's language preference (default: English)
        const User = require('../models/User');
        const cookUser = await User.findById(cookUserId).select('language').lean();
        const isArabic = cookUser?.language === 'ar';
        
        const title = isArabic ? 'تم استقبال طلب جديد!' : 'New Order Received!';
        const message = isArabic 
          ? `لديك طلب جديد يحتوي على ${itemCount} عنصر بقيمة ${totalAmount} ريال`
          : `You have a new order with ${itemCount} item${itemCount > 1 ? 's' : ''} totaling ${totalAmount} SAR`;
        
        await createNotification({
          userId: cookUserId,
          role: 'cook',
          title,
          message,
          type: 'order',
          entityType: 'order',
          entityId: order._id,
          deepLink: `/order-details/${order._id}`,
          countryCode: session.addressSnapshot?.countryCode || 'SA'
        });
        console.log(`[NOTIFICATION] Notification sent to cook ${cookUserId} for order ${order._id}`);
      } catch (notifError) {
        console.error(`[NOTIFICATION] Failed to send notification to cook ${cookUserId}:`, notifError.message);
      }
    });
    
    // Fire and forget - don't wait for notifications to respond
    notifyPromises.forEach(p => p.catch(() => {}));

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
    
    // DEBUG: Verify photoUrl exists in session cartSnapshot
    console.log('[CONFIRM_DEBUG] session.cartSnapshot[0]=', session.cartSnapshot[0]);

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
