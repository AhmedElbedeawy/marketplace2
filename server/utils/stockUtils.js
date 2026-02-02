const Product = require('../models/Product');
const DishOffer = require('../models/DishOffer');

/**
 * Dual Stock Lookup System
 * 
 * This utility provides a unified interface for stock checking that:
 * 1. First checks if any DishOffer exists for the given productId (adminDishId)
 * 2. Falls back to Product.stock if no DishOffer exists
 * 
 * This ensures backward compatibility during the migration phase.
 * Only requires productId - cookId is NOT needed for lookup.
 */

/**
 * Get stock for a dish by productId
 * @param {string} productId - The product/adminDish ID
 * @returns {Promise<{available: boolean, stock: number, source: string}>}
 */
const getStock = async (productId) => {
  try {
    // First, check if there's ANY active DishOffer for this adminDishId
    // Note: We look for ANY cook's offer, not a specific cook
    const dishOffer = await DishOffer.findOne({
      adminDishId: productId,
      isActive: true
    });

    if (dishOffer) {
      return {
        available: dishOffer.stock > 0,
        stock: dishOffer.stock,
        source: 'DishOffer',
        offerId: dishOffer._id.toString()
      };
    }

    // Fallback to Product.stock for backward compatibility
    const product = await Product.findById(productId);
    
    if (product) {
      return {
        available: product.stock > 0,
        stock: product.stock,
        source: 'Product',
        productId: product._id.toString()
      };
    }

    // No stock information found
    return {
      available: false,
      stock: 0,
      source: 'None',
      productId: null
    };
  } catch (error) {
    console.error('Error in getStock:', error);
    return {
      available: false,
      stock: 0,
      source: 'Error',
      error: error.message
    };
  }
};

/**
 * Check if adding quantity to cart is valid
 * @param {string} productId - The product/adminDish ID
 * @param {number} requestedQuantity - The quantity to add
 * @returns {Promise<{valid: boolean, message: string, currentStock: number}>}
 */
const validateStock = async (productId, requestedQuantity) => {
  const stockInfo = await getStock(productId);
  
  if (!stockInfo.available) {
    return {
      valid: false,
      message: 'Item is currently out of stock',
      currentStock: 0,
      source: stockInfo.source
    };
  }

  if (stockInfo.stock < requestedQuantity) {
    return {
      valid: false,
      message: `Not enough stock. Available: ${stockInfo.stock}`,
      currentStock: stockInfo.stock,
      source: stockInfo.source
    };
  }

  return {
    valid: true,
    message: 'Stock available',
    currentStock: stockInfo.stock,
    source: stockInfo.source
  };
};

/**
 * Decrement stock after order placement
 * @param {string} productId - The product/adminDish ID
 * @param {number} quantity - Quantity to decrement
 * @returns {Promise<{success: boolean, message: string}>}
 */
const decrementStock = async (productId, quantity) => {
  try {
    // First try to decrement any DishOffer stock for this adminDishId
    const dishOffer = await DishOffer.findOne({
      adminDishId: productId,
      isActive: true
    });

    if (dishOffer) {
      dishOffer.stock = Math.max(0, dishOffer.stock - quantity);
      await dishOffer.save();
      return {
        success: true,
        message: 'Stock decremented from DishOffer',
        source: 'DishOffer'
      };
    }

    // Fallback to Product stock
    const product = await Product.findById(productId);
    if (product) {
      product.stock = Math.max(0, product.stock - quantity);
      await product.save();
      return {
        success: true,
        message: 'Stock decremented from Product',
        source: 'Product'
      };
    }

    return {
      success: false,
      message: 'No stock record found to decrement',
      source: 'None'
    };
  } catch (error) {
    console.error('Error in decrementStock:', error);
    return {
      success: false,
      message: error.message,
      source: 'Error'
    };
  }
};

/**
 * Increment stock (for order cancellation/refund)
 * @param {string} productId - The product/adminDish ID
 * @param {number} quantity - Quantity to increment
 * @returns {Promise<{success: boolean, message: string}>}
 */
const incrementStock = async (productId, quantity) => {
  try {
    // First try to increment any DishOffer stock for this adminDishId
    const dishOffer = await DishOffer.findOne({
      adminDishId: productId,
      isActive: true
    });

    if (dishOffer) {
      dishOffer.stock += quantity;
      await dishOffer.save();
      return {
        success: true,
        message: 'Stock incremented in DishOffer',
        source: 'DishOffer'
      };
    }

    // Fallback to Product stock
    const product = await Product.findById(productId);
    if (product) {
      product.stock += quantity;
      await product.save();
      return {
        success: true,
        message: 'Stock incremented in Product',
        source: 'Product'
      };
    }

    return {
      success: false,
      message: 'No stock record found to increment',
      source: 'None'
    };
  } catch (error) {
    console.error('Error in incrementStock:', error);
    return {
      success: false,
      message: error.message,
      source: 'Error'
    };
  }
};

/**
 * Check if any DishOffer exists for a productId
 * @param {string} productId - The product/adminDish ID
 * @returns {Promise<boolean>}
 */
const hasDishOffer = async (productId) => {
  try {
    const dishOffer = await DishOffer.findOne({
      adminDishId: productId,
      isActive: true
    });
    return !!dishOffer;
  } catch (error) {
    console.error('Error in hasDishOffer:', error);
    return false;
  }
};

module.exports = {
  getStock,
  validateStock,
  decrementStock,
  incrementStock,
  hasDishOffer
};
