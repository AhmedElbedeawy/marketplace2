const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const Joi = require('joi');

// Create a new product
const createProduct = async (req, res) => {
  try {
    // Check if user is a cook
    if (!req.user.isCook) {
      return res.status(403).json({ 
        message: 'Only cooks can create products' 
      });
    }

    const schema = Joi.object({
      category: Joi.string().required(),
      name: Joi.string().min(1).max(100).required(),
      description: Joi.string().required(),
      price: Joi.number().min(0).required(),
      stock: Joi.number().min(0).default(0),
      prepTime: Joi.number().min(1).required(), // in minutes
      photoUrl: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      notes: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { category, name, description, price, stock, prepTime, photoUrl, isActive, notes } = value;

    // Create product
    const product = await Product.create({
      cook: req.user._id,
      category,
      name,
      description,
      price,
      stock,
      prepTime,
      photoUrl,
      isActive,
      notes
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all products with filtering and pagination
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    let filter = { isActive: true };
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.cook) {
      filter.cook = req.query.cook;
    }
    
    // Search functionality
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }
    
    // Sorting
    let sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort = { createdAt: -1 }; // Newest first
    }
    
    const products = await Product.find(filter)
      .populate('cook', 'name storeName profilePhoto')
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);
      
    const total = await Product.countDocuments(filter);
    
    res.json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single product
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('cook', 'name storeName profilePhoto storeStatus')
      .populate('category', 'name');
      
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      description: Joi.string().optional(),
      price: Joi.number().min(0).optional(),
      stock: Joi.number().min(0).optional(),
      prepTime: Joi.number().min(1).optional(),
      photoUrl: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      notes: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if product exists and belongs to user
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.cook.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...value },
      { new: true }
    );
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    // Check if product exists and belongs to user
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.cook.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Delete product
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};