const Product = require('../models/Product');
const User = require('../models/User');
const Joi = require('joi');

// Toggle favorite product
const toggleFavoriteProduct = async (req, res) => {
  try {
    const schema = Joi.object({
      productId: Joi.string().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { productId } = value;

    // Validate product
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if product is already favorited
    const user = await User.findById(req.user._id);
    const isFavorited = user.favorites && user.favorites.products.includes(productId);
    
    if (isFavorited) {
      // Remove from favorites
      user.favorites.products = user.favorites.products.filter(
        id => id.toString() !== productId
      );
      await user.save();
      
      return res.status(200).json({
        message: 'Product removed from favorites',
        favorited: false
      });
    } else {
      // Add to favorites
      if (!user.favorites) {
        user.favorites = { products: [], cooks: [] };
      }
      user.favorites.products.push(productId);
      await user.save();
      
      return res.status(200).json({
        message: 'Product added to favorites',
        favorited: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle favorite cook
const toggleFavoriteCook = async (req, res) => {
  try {
    const schema = Joi.object({
      cookId: Joi.string().required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { cookId } = value;

    // Validate cook
    const cook = await User.findById(cookId);
    
    if (!cook || !cook.isCook) {
      return res.status(404).json({ message: 'Cook not found' });
    }

    // Check if cook is already favorited
    const user = await User.findById(req.user._id);
    const isFavorited = user.favorites && user.favorites.cooks.includes(cookId);
    
    if (isFavorited) {
      // Remove from favorites
      user.favorites.cooks = user.favorites.cooks.filter(
        id => id.toString() !== cookId
      );
      await user.save();
      
      return res.status(200).json({
        message: 'Cook removed from favorites',
        favorited: false
      });
    } else {
      // Add to favorites
      if (!user.favorites) {
        user.favorites = { products: [], cooks: [] };
      }
      user.favorites.cooks.push(cookId);
      await user.save();
      
      return res.status(200).json({
        message: 'Cook added to favorites',
        favorited: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user favorites
const getUserFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favorites.products')
      .populate('favorites.cooks', 'name storeName profilePhoto');
    
    res.status(200).json({
      products: user.favorites.products || [],
      cooks: user.favorites.cooks || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get favorite products
const getFavoriteProducts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites.products',
        populate: {
          path: 'cook',
          select: 'name storeName'
        }
      });
    
    res.status(200).json(user.favorites.products || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get favorite cooks
const getFavoriteCooks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favorites.cooks', 'name storeName profilePhoto');
    
    res.status(200).json(user.favorites.cooks || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  toggleFavoriteProduct,
  toggleFavoriteCook,
  getUserFavorites,
  getFavoriteProducts,
  getFavoriteCooks
};