const Product = require('../models/Product');
const User = require('../models/User');
const Joi = require('joi');

// In a real application, you might want to store cart data in a database
// For now, we'll use in-memory storage with Redis or a similar solution
// This is a simplified version for demonstration

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const schema = Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      notes: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { productId, quantity, notes } = value;

    // Validate product
    const product = await Product.findById(productId).populate('cook');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (!product.isActive) {
      return res.status(400).json({ message: 'Product is not available' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ 
        message: `Not enough stock. Available: ${product.stock}` 
      });
    }

    // In a real app, you would store this in a database or Redis
    // For now, we'll just return the cart item structure
    const cartItem = {
      productId: product._id,
      cookId: product.cook._id,
      cookName: product.cook.storeName || product.cook.name,
      name: product.name,
      price: product.price,
      quantity,
      notes,
      subtotal: product.price * quantity
    };

    res.status(200).json({
      message: 'Item added to cart',
      item: cartItem
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get cart contents
const getCart = async (req, res) => {
  try {
    // In a real app, you would retrieve the cart from database/Redis
    // For now, we'll return an empty cart structure
    res.status(200).json({
      items: [],
      totalItems: 0,
      totalAmount: 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update cart item
const updateCartItem = async (req, res) => {
  try {
    const schema = Joi.object({
      quantity: Joi.number().min(1).required(),
      notes: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { quantity, notes } = value;
    const { itemId } = req.params;

    // In a real app, you would update the cart item in database/Redis
    // For now, we'll just return a success message
    res.status(200).json({
      message: 'Cart item updated',
      itemId,
      quantity,
      notes
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    // In a real app, you would remove the cart item from database/Redis
    // For now, we'll just return a success message
    res.status(200).json({
      message: 'Item removed from cart',
      itemId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    // In a real app, you would clear the cart in database/Redis
    // For now, we'll just return a success message
    res.status(200).json({
      message: 'Cart cleared'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart
};