const User = require('../models/User');
const UserContactHistory = require('../models/UserContactHistory');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { Order } = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const AdminActionLog = require('../models/AdminActionLog');
const Cook = require('../models/Cook');
const Invoice = require('../models/Invoice');
const { createNotification } = require('../utils/notifications');
const Joi = require('joi');
const mongoose = require('mongoose');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const { country, dateRange } = req.query;
    
    // Build date filter
    let dateFilter = { isDeleted: { $ne: true } };
    if (dateRange) {
      const now = new Date();
      let startDate;
      switch(dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0,0,0,0));
          break;
        case '7days':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30days':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90days':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
      }
      if (startDate) {
        dateFilter.createdAt = { $gte: startDate };
      }
    }
    
    // Build country filter
    if (country && country !== 'WORLDWIDE') {
      dateFilter.countryCode = country.toUpperCase();
    }
    
    const userCount = await User.countDocuments(dateFilter);
    const cookCount = await User.countDocuments({ 
      ...dateFilter,
      role_cook_status: 'active' 
    });
    const productCount = await Product.countDocuments(dateFilter);
    const orderCount = await Order.countDocuments(dateFilter);
    
    // Calculate revenue
    const orders = await Order.find(dateFilter);
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({
      ...dateFilter,
      lastLoginAt: { $gte: thirtyDaysAgo }
    });

    const recentOrders = await Order.find(dateFilter)
      .populate('customer', 'name email')
      .populate('subOrders.cook', 'name storeName')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const statusBreakdown = [];
    ordersByStatus.forEach(item => {
      // Normalize status labels for frontend
      let label = item._id;
      if (label === 'completed') label = 'Completed';
      if (label === 'cancelled') label = 'Cancelled';
      if (label === 'pending') label = 'Pending';
      if (label === 'confirmed') label = 'Confirmed';
      
      statusBreakdown.push({ status: label, count: item.count });
    });

    // Orders by Region (City)
    const regionAggregationMatch = { ...dateFilter };
    // Remove deliveryAddress nesting for aggregate if necessary, but here we match on the whole object
    const ordersByRegion = await Order.aggregate([
      { $match: regionAggregationMatch },
      { $group: { 
          _id: '$deliveryAddress.city', 
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
      } },
      { $project: {
          region: '$_id',
          orders: 1,
          revenue: 1,
          percentage: { $literal: 0 } // Will calculate below
      } },
      { $sort: { orders: -1 } }
    ]);

    const totalOrdersCount = ordersByRegion.reduce((sum, r) => sum + r.orders, 0);
    const regionsWithPercentage = ordersByRegion.map(r => ({
      ...r,
      percentage: totalOrdersCount > 0 ? Math.round((r.orders / totalOrdersCount) * 100) : 0
    }));

    // Growth Data (last 7 or 30 days)
    const growthPeriod = dateRange === 'today' ? 1 : (dateRange === '7days' ? 7 : 30);
    const growthData = [];
    for (let i = growthPeriod - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.setHours(0,0,0,0));
      const dayEnd = new Date(d.setHours(23,59,59,999));
      
      const dayOrders = await Order.find({
        ...dateFilter,
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });
      
      growthData.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
      });
    }

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
          role_cook_status: 'active',
          'orders.createdAt': { $gte: dateFilter.createdAt || new Date(0) }
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
        orders: orderCount,
        revenue: totalRevenue,
        avgOrderValue,
        activeUsers
      },
      orderStatusBreakdown: statusBreakdown,
      ordersByRegion: regionsWithPercentage,
      usersGrowthData: growthData,
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
    
    let filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.role_cook_status) filter.role_cook_status = req.query.role_cook_status;
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
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
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
      role_cook_status: Joi.string().valid('none', 'pending', 'active', 'rejected', 'suspended').optional(),
      storeName: Joi.string().max(100).optional(),
      role: Joi.string().valid('foodie', 'admin', 'super_admin').optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...value },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user (Soft Delete)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
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
    
    let filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
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
    if (!product) return res.status(404).json({ message: 'Product not found' });
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
      category: Joi.string().optional(),
      notes: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const product = await Product.findByIdAndUpdate(req.params.id, { ...value }, { new: true })
      .populate('cook', 'name storeName')
      .populate('category', 'name');

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
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
      nameEn: Joi.string().min(1).max(50).required(),
      nameAr: Joi.string().min(1).max(50).required(),
      description: Joi.string().optional(),
      descriptionAr: Joi.string().optional(),
      sortOrder: Joi.number().default(0),
      color: Joi.string().optional().allow(''),
      isActive: Joi.boolean().default(true)
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Check for duplicate using bilingual names
    const categoryExists = await Category.findOne({
      $or: [
        { nameEn: value.nameEn },
        { nameAr: value.nameAr }
      ]
    });
    if (categoryExists) return res.status(400).json({ message: 'Category with this name already exists' });

    // Create category with both legacy 'name' and bilingual names
    const categoryData = {
      ...value,
      name: value.nameEn // Set legacy name field to English name for backward compatibility
    };

    const category = await Category.create(categoryData);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    console.log('🔥 adminController updateCategory EXECUTED');
    console.log('🔥 req.files:', req.files ? Object.keys(req.files) : 'no files');
    
    const schema = Joi.object({
      nameEn: Joi.string().min(1).max(50).optional(),
      nameAr: Joi.string().min(1).max(50).optional(),
      description: Joi.string().optional(),
      descriptionAr: Joi.string().optional(),
      sortOrder: Joi.number().optional(),
      color: Joi.string().optional().allow(''),
      isActive: Joi.boolean().optional()
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Build update data with text fields
    const updateData = { ...value };
    if (value.nameEn) {
      updateData.name = value.nameEn;
    }

    // Handle file uploads - icons
    if (req.files?.iconWeb?.[0]) {
      const iconWeb = `/uploads/categories/web/${req.files.iconWeb[0].filename}`;
      updateData.icons = { web: iconWeb, mobile: '' };
      console.log('🔥 Setting icons.web:', iconWeb);
    }
    
    if (req.files?.iconMobile?.[0]) {
      const iconMobile = `/uploads/categories/mobile/${req.files.iconMobile[0].filename}`;
      // Preserve existing web icon if not updated
      if (!updateData.icons) {
        const existing = await Category.findById(req.params.id);
        updateData.icons = { 
          web: existing?.icons?.web || '', 
          mobile: iconMobile 
        };
      } else {
        updateData.icons.mobile = iconMobile;
      }
      console.log('🔥 Setting icons.mobile:', iconMobile);
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    
    console.log('🔥 Updated category icons:', category.icons);
    res.status(200).json(category);
  } catch (error) {
    console.error('🔥 updateCategory error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = {};
    if (req.query.status) filter.status = req.query.status;
    
    const orders = await Order.find(filter)
      .populate('customer', 'name email')
      .populate('subOrders.cook', 'name storeName')
      .populate('subOrders.items.product', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Order.countDocuments(filter);
    res.status(200).json({ orders, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all cooks (Management)
const getCooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = { role_cook_status: { $ne: 'none' } };
    if (req.query.status && req.query.status !== 'all') filter.role_cook_status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { storeName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const cooks = await User.find(filter)
      .select('name email phone storeName expertise bio role_cook_status isEmailVerified isPhoneVerified createdAt questionnaire role_cook')
      .populate('expertise')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch latest invoice for each cook
    const cooksWithInvoices = await Promise.all(
      cooks.map(async (cook) => {
        if (cook.role_cook) {
          const latestInvoice = await Invoice.getLatestForCook(cook.role_cook);
          return {
            ...cook,
            latestInvoice: latestInvoice ? {
              _id: latestInvoice._id,
              invoiceNumber: latestInvoice.invoiceNumber,
              status: latestInvoice.status,
              periodMonth: latestInvoice.periodMonth,
              netAmount: latestInvoice.netAmount,
              currency: latestInvoice.currency,
              issuedAt: latestInvoice.issuedAt,
              dueAt: latestInvoice.dueAt
            } : null
          };
        }
        return cook;
      })
    );

    const total = await User.countDocuments(filter);
    const stats = {
      pending: await User.countDocuments({ role_cook_status: 'pending' }),
      active: await User.countDocuments({ role_cook_status: 'active' }),
      rejected: await User.countDocuments({ role_cook_status: 'rejected' }),
      suspended: await User.countDocuments({ role_cook_status: 'suspended' })
    };

    res.status(200).json({ cooks: cooksWithInvoices, stats, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve cook request
const approveCookRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.params.id).session(session);
    if (!user) throw new Error('User not found');
    if (user.role_cook_status !== 'pending' && user.role_cook_status !== 'rejected') {
      throw new Error('User must have a pending or rejected cook request');
    }

    user.role_cook_status = 'active';
    await user.save({ session });

    let cook = await Cook.findOne({ userId: user._id }).session(session);
    if (!cook) {
      cook = new Cook({
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        expertise: user.expertise || [],
        storeName: user.storeName,
        bio: user.bio,
        questionnaire: user.questionnaire,
        status: 'active'
      });
    } else {
      cook.status = 'active';
      cook.questionnaire = user.questionnaire;
    }
    await cook.save({ session });

    await AuditLog.create([{
      adminId: req.user._id,
      targetUserId: user._id,
      action: 'approve',
      timestamp: new Date()
    }], { session });

    await session.commitTransaction();
    await createNotification({
      userId: user._id,
      role: 'cook',
      title: 'Cook Request Approved',
      message: 'Congratulations! Your cook request has been approved. You can now start adding your dishes.',
      type: 'system',
      entityType: 'cook',
      deepLink: '/cook/dashboard',
      countryCode: user.countryCode
    });
    res.status(200).json({ message: 'Cook request approved successfully' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Reject cook request
const rejectCookRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.params.id).session(session);
    if (!user) throw new Error('User not found');
    const { reason } = req.body;
    user.role_cook_status = 'rejected';
    await user.save({ session });

    await Cook.findOneAndUpdate({ userId: user._id }, { status: 'rejected' }, { session });

    await AuditLog.create([{
      adminId: req.user._id,
      targetUserId: user._id,
      action: 'reject',
      reason,
      timestamp: new Date()
    }], { session });

    await session.commitTransaction();
    await createNotification({
      userId: user._id,
      role: 'customer',
      title: 'Cook Request Rejected',
      message: `Your cook request has been rejected.${reason ? ' Reason: ' + reason : ''}`,
      type: 'system',
      entityType: 'cook',
      deepLink: '/account/cook-application',
      countryCode: user.countryCode
    });
    res.status(200).json({ message: 'Cook request rejected' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Suspend cook
const suspendCook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.params.id).session(session);
    if (!user) throw new Error('User not found');
    const { reason, suspensionReason = 'other', suspensionNotes } = req.body;
    user.role_cook_status = 'suspended';
    await user.save({ session });

    await Cook.findOneAndUpdate(
      { userId: user._id },
      {
        status: 'suspended',
        suspensionReason,
        suspendedAt: new Date(),
        suspendedBy: req.user._id,
        suspensionNotes: suspensionNotes || reason
      },
      { session }
    );

    await AuditLog.create([{
      adminId: req.user._id,
      targetUserId: user._id,
      action: 'suspend',
      reason: suspensionNotes || reason,
      timestamp: new Date()
    }], { session });

    await session.commitTransaction();
    await createNotification({
      userId: user._id,
      role: 'cook',
      title: 'Cook Account Suspended',
      message: `Your cook account has been suspended.${reason ? ' Reason: ' + reason : ''}`,
      type: 'system',
      entityType: 'cook',
      deepLink: '/account/suspension',
      countryCode: user.countryCode
    });
    res.status(200).json({ message: 'Cook suspended' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Unsuspend cook
const unsuspendCook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.params.id).session(session);
    if (!user) throw new Error('User not found');
    user.role_cook_status = 'active';
    await user.save({ session });

    await Cook.findOneAndUpdate(
      { userId: user._id },
      {
        status: 'active',
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
        suspensionNotes: null
      },
      { session }
    );

    await AuditLog.create([{
      adminId: req.user._id,
      targetUserId: user._id,
      action: 'unsuspend',
      timestamp: new Date()
    }], { session });

    await session.commitTransaction();
    await createNotification({
      userId: user._id,
      role: 'cook',
      title: 'Cook Account Restored',
      message: 'Your cook account has been restored. You can now continue selling your dishes.',
      type: 'system',
      entityType: 'cook',
      deepLink: '/cook/dashboard',
      countryCode: user.countryCode
    });
    res.status(200).json({ message: 'Cook unsuspended' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Update cook specific fields
const updateCook = async (req, res) => {
  try {
    const { expertise } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { expertise }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await Cook.findOneAndUpdate({ userId: user._id }, { expertise });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hard delete cook and all related data
const deleteCook = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.params.id;
    await Product.deleteMany({ cook: userId }).session(session);
    await Cook.findOneAndDelete({ userId }).session(session);
    const user = await User.findByIdAndDelete(userId).session(session);
    if (!user) throw new Error('User not found');

    await AuditLog.create({
      adminId: req.user._id,
      targetUserId: userId,
      action: 'delete_cook',
      timestamp: new Date()
    }, { session });

    await session.commitTransaction();
    res.status(200).json({ message: 'Cook and related data deleted' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Bulk update cooks
const bulkUpdateCooks = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { ids, updates } = req.body;
    if (!ids || !ids.length) throw new Error('No IDs provided');

    await User.updateMany({ _id: { $in: ids } }, { $set: updates }).session(session);

    const cookUpdates = {};
    if (updates.expertise) cookUpdates.expertise = updates.expertise;
    if (updates.role_cook_status) cookUpdates.status = updates.role_cook_status;
    if (updates.isTopRated !== undefined) cookUpdates.isTopRated = updates.isTopRated;

    if (Object.keys(cookUpdates).length > 0) {
      await Cook.updateMany({ userId: { $in: ids } }, { $set: cookUpdates }).session(session);
    }

    await AuditLog.create([{
      adminId: req.user._id,
      action: 'bulk_update_cooks',
      reason: `Updated ${ids.length} cooks`,
      timestamp: new Date()
    }], { session });

    await session.commitTransaction();
    res.status(200).json({ message: `Updated ${ids.length} cooks` });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Bulk delete cooks
const bulkDeleteCooks = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) throw new Error('No IDs provided');

    await Product.deleteMany({ cook: { $in: ids } }).session(session);
    await Cook.deleteMany({ userId: { $in: ids } }).session(session);
    await User.deleteMany({ _id: { $in: ids } }).session(session);

    await AuditLog.create([{
      adminId: req.user._id,
      action: 'bulk_delete_cooks',
      reason: `Deleted ${ids.length} cooks`,
      timestamp: new Date()
    }], { session });

    await session.commitTransaction();
    res.status(200).json({ message: `Deleted ${ids.length} cooks` });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Get contact history for admin
const getContactHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.value = { $regex: req.query.search, $options: 'i' };
    }

    const history = await UserContactHistory.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await UserContactHistory.countDocuments(filter);

    res.status(200).json({
      history,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Manually release a contact value
const releaseContact = async (req, res) => {
  try {
    const contact = await UserContactHistory.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact record not found' });
    }

    contact.status = 'released';
    contact.releasedAt = new Date();
    await contact.save();

    res.status(200).json({
      success: true,
      message: `${contact.type} (${contact.value}) has been released and is now available for other users.`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Toggle admin boost for a cook (with audit logging)
 * @route   POST /api/admin/cooks/:cookId/toggle-boost
 * @access  Private/Admin
 */
const toggleAdminBoost = async (req, res) => {
  try {
    const { cookId } = req.params;
    const { reason } = req.body;
    const adminUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(cookId)) {
      return res.status(400).json({ success: false, message: 'Invalid cook ID' });
    }

    const cook = await User.findById(cookId);
    if (!cook) {
      return res.status(404).json({ success: false, message: 'Cook not found' });
    }

    if (cook.role_cook_status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active cooks can be admin boosted'
      });
    }

    const oldValue = cook.adminBoost || false;
    const newValue = !oldValue;
    cook.adminBoost = newValue;
    await cook.save();

    await AdminActionLog.create({
      adminUser: adminUserId,
      actionType: 'TOGGLE_TOP_RATED',
      targetType: 'cook',
      targetId: cookId,
      oldValue: { adminBoost: oldValue },
      newValue: { adminBoost: newValue },
      reason: reason || '',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || ''
    });

    res.status(200).json({
      success: true,
      message: `Admin boost ${newValue ? 'enabled' : 'disabled'} for ${cook.storeName || cook.name}`,
      data: {
        cookId: cook._id,
        adminBoost: cook.adminBoost,
        storeName: cook.storeName,
        name: cook.name
      }
    });

  } catch (error) {
    console.error('Error toggling admin boost:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling admin boost',
      error: error.message
    });
  }
};

/**
 * @desc    Get admin action logs (audit trail)
 * @route   GET /api/admin/action-logs
 * @access  Private/Admin
 */
const getAdminActionLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.query.actionType) filter.actionType = req.query.actionType;
    if (req.query.targetType) filter.targetType = req.query.targetType;
    if (req.query.adminUser) filter.adminUser = req.query.adminUser;

    const logs = await AdminActionLog.find(filter)
      .populate('adminUser', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AdminActionLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        logs,
        page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error getting admin action logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving action logs',
      error: error.message
    });
  }
};

// Send announcement to users
const sendAnnouncement = async (req, res) => {
  try {
    const { title, message, titleAr, messageAr, targetRoles, countryCode, importance } = req.body;

    // Accept either English (title + message) OR Arabic (titleAr + messageAr)
    if ((!title || !message) && (!titleAr || !messageAr)) {
      return res.status(400).json({
        success: false,
        message: 'Either English (title + message) or Arabic (titleAr + messageAr) content is required'
      });
    }

    // Build broadcast parameters
    const role = targetRoles === 'all' ? 'all' : (targetRoles?.[0] || 'customer');
    
    // Ensure both languages have content (no blanks)
    const finalTitle = titleAr || title || 'Notification';
    const finalMessage = messageAr || message || 'You have a new notification';
    const finalTitleAr = title || titleAr || finalTitle;
    const finalMessageAr = message || messageAr || finalMessage;

    const recipientCount = await broadcastNotification({
      role,
      countryCode: countryCode || null,
      title: finalTitle,
      message: finalMessage,
      titleAr: finalTitleAr,
      messageAr: finalMessageAr,
      type: 'announcement',
      entityType: 'announcement',
      deepLink: '/announcements'
    });

    console.log(`Announcement sent to ${recipientCount} users (importance: ${importance || 'normal'})`);

    res.status(200).json({
      success: true,
      message: 'Announcement sent successfully',
      data: {
        recipientCount,
        title,
        importance: importance || 'normal',
        targetRoles: targetRoles || ['customer'],
        countryCode: countryCode || 'all'
      }
    });
  } catch (error) {
    console.error('Send announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send announcement',
      error: error.message
    });
  }
};

/**
 * @desc    Get all orders with issues (for admin dashboard)
 * @route   GET /api/admin/issues
 * @access  Private (Admin only)
 */
const getOrderIssues = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, country } = req.query;
    
    // Build filter
    let filter = { hasIssue: true };
    if (status === 'open') {
      filter['issue.status'] = 'open';
    } else if (status === 'resolved') {
      filter['issue.status'] = 'resolved';
    }
    if (country && country !== 'WORLDWIDE') {
      filter['deliveryAddress.countryCode'] = country.toUpperCase();
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const issues = await Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('subOrders.cook', 'name storeName')
      .sort({ 'issue.reportedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Order.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: {
        issues,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get order issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order issues',
      error: error.message
    });
  }
};

/**
 * @desc    Get single order issue details
 * @route   GET /api/admin/issues/:orderId
 * @access  Private (Admin only)
 */
const getOrderIssueDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('customer', 'name email phone')
      .populate('subOrders.cook', 'name storeName')
      .populate('subOrders.items.product', 'name price');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (!order.hasIssue) {
      return res.status(400).json({
        success: false,
        message: 'This order does not have any reported issues'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order issue details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue details',
      error: error.message
    });
  }
};

/**
 * @desc    Resolve an order issue
 * @route   PATCH /api/admin/issues/:orderId/resolve
 * @access  Private (Admin only)
 */
const resolveOrderIssue = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminNotes } = req.body;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (!order.hasIssue) {
      return res.status(400).json({
        success: false,
        message: 'This order does not have any reported issues'
      });
    }
    
    // Update issue status
    order.issue.status = 'resolved';
    order.issue.resolvedAt = new Date();
    order.issue.adminNotes = adminNotes || '';
    order.hasDispute = false;
    
    await order.save();
    
    // Notify the customer and cook(s) that the issue is resolved
    const { createNotification } = require('../utils/notifications');
    
    // Notify customer
    await createNotification({
      userId: order.customer,
      role: 'foodie',
      title: 'Issue Resolved',
      message: 'Your reported issue has been resolved.',
      type: 'issue_update',
      entityType: 'order',
      entityId: order._id,
      deepLink: `/orders/${order._id}`
    });
    
    // Notify cooks
    const cookNotifications = order.subOrders.map(async (subOrder) => {
      await createNotification({
        userId: subOrder.cook,
        role: 'cook',
        title: 'Issue Resolved',
        message: 'Your reported issue has been resolved.',
        type: 'issue_update',
        entityType: 'order',
        entityId: order._id,
        deepLink: `/orders/${order._id}`
      });
    });
    await Promise.all(cookNotifications);
    
    res.status(200).json({
      success: true,
      message: 'Issue resolved successfully',
      data: order
    });
  } catch (error) {
    console.error('Resolve order issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve issue',
      error: error.message
    });
  }
};

/**
 * @desc    Send a warning to a cook
 * @route   POST /api/admin/cooks/:id/warning
 * @access  Private/Admin
 */
const sendCookWarning = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Warning message is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log the warning (could also save to a separate collection)
    await AdminActionLog.create({
      adminUser: req.user._id,
      actionType: 'SEND_WARNING',
      targetType: 'cook',
      targetId: id,
      newValue: { warningMessage: message },
      reason: 'Admin issued warning'
    });

    // NOTIFY COOK: You received an account warning
    const { createNotification } = require('../utils/notifications');
    try {
      await createNotification({
        userId: user._id,
        role: 'cook',
        title: 'Account Warning',
        message: 'You received an account warning. Please review details.',
        type: 'account_warning',
        entityType: 'account_action',
        entityId: user._id,
        deepLink: '/cook/account-status'
      });
    } catch (notifErr) {
      console.error('Error sending account warning notification:', notifErr);
    }

    res.status(200).json({ success: true, message: 'Warning sent successfully' });
  } catch (error) {
    console.error('Send cook warning error:', error);
    res.status(500).json({ success: false, message: 'Error sending warning' });
  }
};

/**
 * @desc    Apply restrictions to a cook account
 * @route   POST /api/admin/cooks/:id/restrict
 * @access  Private/Admin
 */
const applyCookRestriction = async (req, res) => {
  try {
    const { id } = req.params;
    const { restrictions, reason } = req.body;

    if (!restrictions) {
      return res.status(400).json({ success: false, message: 'Restriction details are required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Apply restrictions (this would typically involve updating user flags)
    // user.restrictions = restrictions;
    // await user.save();

    // Log the restriction
    await AdminActionLog.create({
      adminUser: req.user._id,
      actionType: 'APPLY_RESTRICTION',
      targetType: 'cook',
      targetId: id,
      newValue: { restrictions },
      reason: reason || 'Admin applied restrictions'
    });

    // NOTIFY COOK: Your account has temporary restrictions
    const { createNotification } = require('../utils/notifications');
    try {
      await createNotification({
        userId: user._id,
        role: 'cook',
        title: 'Account Restricted',
        message: 'Your account has temporary restrictions. Please review details.',
        type: 'account_restriction',
        entityType: 'account_action',
        entityId: user._id,
        deepLink: '/cook/account-status'
      });
    } catch (notifErr) {
      console.error('Error sending account restriction notification:', notifErr);
    }

    res.status(200).json({ success: true, message: 'Restrictions applied successfully' });
  } catch (error) {
    console.error('Apply cook restriction error:', error);
    res.status(500).json({ success: false, message: 'Error applying restrictions' });
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
  getOrders,
  getCooks,
  approveCookRequest,
  rejectCookRequest,
  suspendCook,
  unsuspendCook,
  updateCook,
  deleteCook,
  bulkUpdateCooks,
  bulkDeleteCooks,
  getContactHistory,
  releaseContact,
  toggleAdminBoost,
  getAdminActionLogs,
  sendAnnouncement,
  getOrderIssues,
  getOrderIssueDetails,
  resolveOrderIssue,
  sendCookWarning,
  applyCookRestriction
};







