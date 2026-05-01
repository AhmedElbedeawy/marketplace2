const Cart = require('../models/Cart');
const DishOffer = require('../models/DishOffer');
const Product = require('../models/Product');
const User = require('../models/User');
const Joi = require('joi');

// Add item to cart (or update if exists)
const addToCart = async (req, res) => {
  try {
    const schema = Joi.object({
      offerId: Joi.string().required(),
      adminDishId: Joi.string().optional(),
      cookId: Joi.string().required(),
      portionKey: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      fulfillmentMode: Joi.string().valid('delivery', 'pickup').optional(),
      countryCode: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { offerId, adminDishId, cookId, portionKey, quantity, fulfillmentMode, countryCode } = value;
    const userId = req.user._id;
    const country = (countryCode || req.user.countryCode || 'SA').toUpperCase();

    // Find or create cart
    let cart = await Cart.findOne({ user: userId, countryCode: country });
    
    if (!cart) {
      cart = new Cart({ user: userId, countryCode: country, items: [] });
    }

    // Check if item already exists (same offerId + portionKey + fulfillmentMode)
    const existingIndex = cart.items.findIndex(item => 
      item.offerId.toString() === offerId && 
      item.portionKey === portionKey &&
      item.fulfillmentMode === (fulfillmentMode || 'delivery')
    );

    if (existingIndex >= 0) {
      // Update quantity
      cart.items[existingIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        offerId,
        adminDishId,
        cookId,
        portionKey,
        quantity,
        fulfillmentMode: fulfillmentMode || 'delivery',
        countryCode: country
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      cart: {
        items: cart.items,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('❌ [CART_ADD] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get cart contents
const getCart = async (req, res) => {
  try {
    const countryCode = (req.body.countryCode || req.query.countryCode || req.user.countryCode || 'SA').toUpperCase();
    
    // Find user's cart for current country
    const cart = await Cart.findOne({ 
      user: req.user._id,
      countryCode
    });
    
    if (!cart) {
      return res.status(200).json({
        success: true,
        items: [],
        totalItems: 0
      });
    }
    
    res.status(200).json({
      success: true,
      items: cart.items,
      totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      updatedAt: cart.updatedAt
    });
  } catch (error) {
    console.error('❌ [CART_GET] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const schema = Joi.object({
      quantity: Joi.number().min(1).required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { quantity } = value;
    const { itemId } = req.params;
    const countryCode = (req.body.countryCode || req.user.countryCode || 'SA').toUpperCase();

    // Find cart
    const cart = await Cart.findOne({ user: req.user._id, countryCode });
    
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    // Find item by offerId
    const itemIndex = cart.items.findIndex(item => item.offerId.toString() === itemId);
    
    if (itemIndex < 0) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      items: cart.items
    });
  } catch (error) {
    console.error('❌ [CART_UPDATE] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const countryCode = (req.body.countryCode || req.user.countryCode || 'SA').toUpperCase();

    // Find cart
    const cart = await Cart.findOne({ user: req.user._id, countryCode });
    
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    // Remove item by offerId
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item.offerId.toString() !== itemId);
    
    if (cart.items.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      items: cart.items
    });
  } catch (error) {
    console.error('❌ [CART_REMOVE] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const countryCode = (req.body.countryCode || req.user.countryCode || 'SA').toUpperCase();

    // Delete cart entirely
    await Cart.findOneAndDelete({ user: req.user._id, countryCode });

    res.status(200).json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    console.error('❌ [CART_CLEAR] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// CRITICAL: Sync entire cart (used by web/mobile for cross-platform sync)
const syncCart = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'items array required'
      });
    }

    const userId = req.user._id;
    const countryCode = (req.body.countryCode || req.user.countryCode || 'SA').toUpperCase();

    console.log(`🔄 [CART_SYNC] Syncing ${items.length} items for user ${userId} in ${countryCode}`);

    // Validate items (content + display snapshot)
    const validatedItems = items.map(item => ({
      offerId: item.offerId,
      adminDishId: item.adminDishId || item.dishId,
      cookId: item.cookId || item.kitchenId,
      portionKey: item.portionKey,
      quantity: item.quantity || 1,
      fulfillmentMode: item.fulfillmentMode || 'delivery',
      countryCode,
      // Display snapshot (for cross-platform rendering)
      dishName: item.dishName || item.name,
      photoUrl: item.photoUrl || item.imageUrl,
      cookName: item.cookName || item.kitchenName,
      priceAtAdd: item.priceAtAdd || item.price,
      deliveryFee: item.deliveryFee || 0,
      prepTime: item.prepTime || item.prepTimeMinutes || 30
    }));

    // Upsert cart with validated items
    const cart = await Cart.findOneAndUpdate(
      { user: userId, countryCode },
      { items: validatedItems },
      { upsert: true, new: true, runValidators: true }
    );

    console.log(`✅ [CART_SYNC] Cart synced: ${cart.items.length} items`);

    res.status(200).json({
      success: true,
      message: 'Cart synced successfully',
      items: cart.items,
      totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (error) {
    console.error('❌ [CART_SYNC] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to sync cart' 
    });
  }
};

// CRITICAL: Validate cart stock before checkout
// Prevents race conditions and gives user-friendly error messages
const validateCartStock = async (req, res) => {
  try {
    const { sessionId, cartItems } = req.body;
    
    console.log('🔍 [STOCK_VALIDATE] Starting stock validation');
    console.log('   sessionId:', sessionId);
    console.log('   cartItems count:', cartItems?.length);
    
    const unavailableItems = [];
    
    for (const item of cartItems) {
      const { dishOfferId, dishId, portionKey, quantity, name } = item;
      
      // Use dishOfferId if available, otherwise dishId
      const targetId = dishOfferId || dishId;
      
      if (!targetId || !/^[0-9a-fA-F]{24}$/.test(targetId.toString())) {
        console.log(`⚠️ [STOCK_VALIDATE] Skipping non-ObjectId: ${targetId}`);
        continue;
      }
      
      // Try DishOffer first (has variants), then Product (legacy)
      const DishOffer = require('../models/DishOffer');
      const Product = require('../models/Product');
      
      const dishOffer = await DishOffer.findById(targetId);
      const product = dishOffer ? null : await Product.findById(targetId);
      
      if (!dishOffer && !product) {
        unavailableItems.push({
          itemId: targetId,
          name: name || 'Unknown Item',
          issue: 'ITEM_NOT_FOUND',
          message: 'This item is no longer available'
        });
        continue;
      }
      
      const dish = dishOffer || product;
      
      // Check if item is active
      if (!dish.isActive) {
        unavailableItems.push({
          itemId: targetId,
          name: dish.name || name || 'Unknown Item',
          issue: 'ITEM_UNAVAILABLE',
          message: 'This item is currently unavailable'
        });
        continue;
      }
      
      // Check stock for variant or legacy
      if (dish.variants && dish.variants.length > 0) {
        const variant = dish.variants.find(v => v.portionKey === portionKey);
        
        if (!variant) {
          unavailableItems.push({
            itemId: targetId,
            name: dish.name || name || 'Unknown Item',
            portionKey,
            issue: 'VARIANT_NOT_FOUND',
            message: `The selected size (${portionKey}) is no longer available`
          });
          continue;
        }
        
        if ((variant.stock ?? 0) < quantity) {
          const available = variant.stock ?? 0;
          unavailableItems.push({
            itemId: targetId,
            name: dish.name || name || 'Unknown Item',
            portionKey,
            requestedQty: quantity,
            availableQty: available,
            issue: 'INSUFFICIENT_STOCK',
            message: available === 0 
              ? `This item is out of stock`
              : `Only ${available} available (you requested ${quantity})`
          });
        }
      } else {
        // Legacy single-stock check
        if ((dish.stock ?? 0) < quantity) {
          const available = dish.stock ?? 0;
          unavailableItems.push({
            itemId: targetId,
            name: dish.name || name || 'Unknown Item',
            requestedQty: quantity,
            availableQty: available,
            issue: 'INSUFFICIENT_STOCK',
            message: available === 0 
              ? `This item is out of stock`
              : `Only ${available} available (you requested ${quantity})`
          });
        }
      }
    }
    
    console.log(`✅ [STOCK_VALIDATE] Validation complete: ${unavailableItems.length} unavailable`);
    
    if (unavailableItems.length > 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'STOCK_CHANGED',
        message: 'Stock changed. Check cart.',
        unavailableItems,
        requiresCartUpdate: true
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'All items in stock',
      validated: true
    });
    
  } catch (error) {
    console.error('❌ [STOCK_VALIDATE] Error:', error);
    res.status(500).json({ 
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Failed to validate stock' 
    });
  }
};

// CRITICAL: Refresh cart with live stock levels (called on cart open)
// Returns updated cart with current stock for each item
const refreshCartStock = async (req, res) => {
  try {
    const { cartItems } = req.body;
    
    if (!cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        message: 'cartItems array required'
      });
    }
    
    console.log(`🔄 [CART_REFRESH] Refreshing stock for ${cartItems.length} items`);
    
    const updatedItems = [];
    const removedItems = [];
    
    for (const item of cartItems) {
      const { cookId, dishId, offerId, portionKey, quantity, name } = item;
      
      // Use offerId or dishId
      const targetId = offerId || dishId;
      
      if (!targetId || !/^[0-9a-fA-F]{24}$/.test(targetId.toString())) {
        console.log(`⚠️ [CART_REFRESH] Skipping non-ObjectId: ${targetId}`);
        updatedItems.push({ ...item, stockAvailable: false, shouldRemove: true });
        removedItems.push(item);
        continue;
      }
      
      // Try DishOffer first, then Product
      const DishOffer = require('../models/DishOffer');
      const Product = require('../models/Product');
      
      const dishOffer = await DishOffer.findById(targetId);
      const product = dishOffer ? null : await Product.findById(targetId);
      
      if (!dishOffer && !product) {
        console.log(`❌ [CART_REFRESH] Item not found: ${targetId}`);
        removedItems.push(item);
        updatedItems.push({ ...item, stockAvailable: false, shouldRemove: true });
        continue;
      }
      
      const dish = dishOffer || product;
      
      // Check if item is active
      if (!dish.isActive) {
        console.log(`❌ [CART_REFRESH] Item inactive: ${dish.name}`);
        removedItems.push(item);
        updatedItems.push({ ...item, stockAvailable: false, shouldRemove: true });
        continue;
      }
      
      // Get current stock
      let currentStock = 0;
      if (dish.variants && dish.variants.length > 0) {
        const variant = dish.variants.find(v => v.portionKey === portionKey);
        currentStock = variant?.stock ?? 0;
      } else {
        currentStock = dish.stock ?? 0;
      }
      
      // Update quantity if exceeds stock
      const updatedQuantity = Math.min(quantity, currentStock);
      const shouldRemove = currentStock === 0;
      
      console.log(`📦 [CART_REFRESH] ${dish.name} (${portionKey || 'legacy'}): stock=${currentStock}, qty=${quantity}→${updatedQuantity}`);
      
      updatedItems.push({
        ...item,
        currentStock,
        quantity: updatedQuantity,
        stockAvailable: currentStock > 0,
        shouldRemove
      });
      
      if (shouldRemove) {
        removedItems.push(item);
      }
    }
    
    res.status(200).json({
      success: true,
      updatedItems,
      removedItems: removedItems.map(item => ({
        id: item.offerId || item.dishId,
        name: item.name,
        reason: item.stockAvailable === false ? 'OUT_OF_STOCK' : 'ITEM_UNAVAILABLE'
      })),
      hasChanges: removedItems.length > 0 || updatedItems.some(i => i.quantity !== i.quantity)
    });
    
  } catch (error) {
    console.error('❌ [CART_REFRESH] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to refresh cart stock' 
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,
  validateCartStock,
  refreshCartStock
};