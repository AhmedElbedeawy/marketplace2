const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { Order } = require('../models/Order');
const Joi = require('joi');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get counts for various entities
    const userCount = await User.countDocuments();
    const cookCount = await User.countDocuments({ isCook: true });
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    
    // Get recent orders
    const recentOrders = await Order.find()
      .populate('customer', 'name email')
      .populate('subOrders.cook', 'name storeName')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get top cooks by order count
    const topCooks = await User.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'subOrders.cook',
          as: 'orders'
        }
      },
      {
        $match: {
          isCook: true,
          'orders.subOrders.status': 'delivered'
        }
      },
      {
        $project: {
          name: 1,
          storeName: 1,
          orderCount: { $size: '$orders' }
        }
      },
      {
        $sort: { orderCount: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    res.status(200).json({
      stats: {
        users: userCount,
        cooks: cookCount,
        products: productCount,
        orders: orderCount
      },
      recentOrders,
      topCooks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users with filtering
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    let filter = {};
    
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    if (req.query.isCook !== undefined) {
      filter.isCook = req.query.isCook === 'true';
    }
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await User.countDocuments(filter);
    
    res.status(200).json({
      users,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');
      
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      isCook: Joi.boolean().optional(),
      storeName: Joi.string().max(100).optional(),
      storeStatus: Joi.string().valid('pending', 'approved', 'active').optional(),
      role: Joi.string().valid('foodie', 'cook', 'admin', 'super_admin').optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...value },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all products with filtering
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    let filter = {};
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(filter)
      .populate('cook', 'name storeName')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Product.countDocuments(filter);
    
    res.status(200).json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('cook', 'name storeName')
      .populate('category', 'name');
      
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
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

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...value },
      { new: true, runValidators: true }
    )
    .populate('cook', 'name storeName')
    .populate('category', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(1).max(50).required(),
      description: Joi.string().optional(),
      isActive: Joi.boolean().default(true)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const categoryExists = await Category.findOne({ name: value.name });
    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create(value);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(1).max(50).optional(),
      description: Joi.string().optional(),
      isActive: Joi.boolean().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { ...value },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders with filtering
const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    let filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const orders = await Order.find(filter)
      .populate('customer', 'name email')
      .populate('subOrders.cook', 'name storeName')
      .populate('subOrders.items.product', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Order.countDocuments(filter);
    
    res.status(200).json({
      orders,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getOrders
};