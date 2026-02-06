const { Order, SubOrder, OrderItem } = require('../models/Order');
const Product = require('../models/Product');
const Cook = require('../models/Cook');
const User = require('../models/User');
const AdminDish = require('../models/AdminDish');
const DishOffer = require('../models/DishOffer');
const Joi = require('joi');

// Create order from cart (multi-seller system)
const createOrder = async (req, res) => {
  try {
    const schema = Joi.object({
      items: Joi.array().items(Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        notes: Joi.string().optional()
      })).required(),
      notes: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { items, notes } = value;
    
    // Validate that we have items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }
    
    // Group items by cook
    const cookItemsMap = new Map();
    
    // Validate products and group by cook
    for (const item of items) {
      const product = await Product.findById(item.productId).populate('cook');
      
      if (!product) {
        return res.status(404).json({ message: `Product with id ${item.productId} not found` });
      }
      
      if (!product.isActive) {
        return res.status(400).json({ 
          message: `Product ${product.name} is not available` 
        });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Not enough stock for ${product.name}. Available: ${product.stock}` 
        });
      }
      
      // Group items by cook
      if (!cookItemsMap.has(product.cook._id.toString())) {
        const cookProfile = await Cook.findOne({ userId: product.cook._id });
        cookItemsMap.set(product.cook._id.toString(), {
          cook: product.cook,
          cookProfile,
          items: []
        });
      }
      
      cookItemsMap.get(product.cook._id.toString()).items.push({
        product,
        quantity: item.quantity,
        notes: item.notes
      });
    }
    
    // Create main order
    let totalAmount = 0;
    const subOrdersData = [];
    
    // Create sub-orders for each cook
    for (const [cookId, cookData] of cookItemsMap.entries()) {
      let subOrderTotal = 0;
      const orderItems = [];
      
      // Calculate sub-order total and create order items
      for (const item of cookData.items) {
        const itemTotal = item.product.price * item.quantity;
        subOrderTotal += itemTotal;
        
        orderItems.push({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.price,
          notes: item.notes
        });
      }
      
      totalAmount += subOrderTotal;
      
      const cookAddress = cookData.cookProfile ? `${cookData.cookProfile.city}, ${cookData.cookProfile.area || ''}` : (cookData.cook.pickupAddress || 'Address not provided');
      subOrdersData.push({
        cook: cookId,
        pickupAddress: cookAddress,
        cookLocationSnapshot: {
          lat: cookData.cookProfile?.location?.lat || 0,
          lng: cookData.cookProfile?.location?.lng || 0,
          address: cookAddress,
          city: cookData.cookProfile?.city || 'Unknown'
        },
        totalAmount: subOrderTotal,
        prepTime: Math.max(...cookData.items.map(item => item.product.prepTime)),
        items: orderItems
      });
    }
    
    // Create main order
    const order = await Order.create({
      customer: req.user._id,
      subOrders: subOrdersData,
      totalAmount,
      notes
    });
    
    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }
    
    // Populate the response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('subOrders.cook', 'name storeName pickupAddress')
      .populate('subOrders.items.product', 'name price');
    
    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    // Note: populate removed for subOrders.cook and subOrders.items.product
    // because they use Mixed type to support demo/legacy string IDs
    const orders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 });
    
    // Enrich orders with missing images from AdminDish/DishOffer
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const orderObj = order.toObject();
        
        for (const subOrder of orderObj.subOrders || []) {
          for (const item of subOrder.items || []) {
            // If productSnapshot is missing or has no image, try to fetch it
            if (!item.productSnapshot || !item.productSnapshot.image) {
              console.log(`🔍 Enriching image for product: ${item.product}`);
              
              let imageUrl = null;
              let productName = item.productSnapshot?.name || 'Unknown Dish';
              
              // Try to find the dish - could be AdminDish ID, DishOffer ID, or string
              try {
                // First try AdminDish (for real orders)
                if (item.product && /^[0-9a-fA-F]{24}$/.test(item.product.toString())) {
                  const adminDish = await AdminDish.findById(item.product);
                  if (adminDish) {
                    imageUrl = adminDish.imageUrl;
                    productName = adminDish.nameEn || productName;
                    console.log(`  ✅ Found AdminDish: ${productName}, Image: ${imageUrl ? 'YES' : 'NO'}`);
                  } else {
                    // Try DishOffer
                    const dishOffer = await DishOffer.findById(item.product).populate('adminDishId');
                    if (dishOffer) {
                      imageUrl = dishOffer.images?.[0] || dishOffer.adminDishId?.imageUrl;
                      productName = dishOffer.adminDishId?.nameEn || productName;
                      console.log(`  ✅ Found DishOffer: ${productName}, Image: ${imageUrl ? 'YES' : 'NO'}`);
                    }
                  }
                }
                
                // If still no image, use placeholder based on product name
                if (!imageUrl) {
                  // Try to extract dish code from product string (e.g., "offer_c1_d1" -> "d1")
                  const match = item.product?.toString().match(/d(\d+)/);
                  if (match) {
                    const dishCode = `d${match[1]}`;
                    const placeholderMap = {
                      'd1': 'M.png', // Molokhia
                      'd2': 'D.png', // Duck
                      'd3': 'W.png', // Grape Leaves
                      'd4': 'S.png', // Shish Tawook
                      'd5': 'F.png', // Fattah
                      'd6': 'K.png', // Moussaka
                      'd7': 'H.png'  // Pigeon
                    };
                    const placeholder = placeholderMap[dishCode];
                    if (placeholder) {
                      imageUrl = `/assets/dishes/${placeholder}`;
                      console.log(`  🎨 Using placeholder for ${dishCode}: ${imageUrl}`);
                    }
                  }
                }
              } catch (err) {
                console.log(`  ❌ Error fetching image: ${err.message}`);
              }
              
              // Update the productSnapshot with the found image
              item.productSnapshot = {
                ...item.productSnapshot,
                name: productName,
                image: imageUrl || '/assets/dishes/dish-placeholder.svg'
              };
            }
          }
        }
        
        return orderObj;
      })
    );
    
    // DEBUG: Log order details for image troubleshooting
    console.log('📦 === ORDERS RETURNED (ENRICHED) ===');
    console.log(`Total orders: ${enrichedOrders.length}`);
    enrichedOrders.forEach((order, idx) => {
      console.log(`\n  [Order ${idx + 1}] ID: ${order._id}`);
      order.subOrders?.forEach((sub, sIdx) => {
        console.log(`    SubOrder ${sIdx + 1}:`);
        sub.items?.forEach((item, iIdx) => {
          console.log(`      Item ${iIdx + 1}:`);
          console.log(`        product: ${item.product}`);
          console.log(`        productSnapshot.image: ${item.productSnapshot?.image ? 'YES' : 'NO'}`);
        });
      });
    });
    console.log('📦 === END ORDERS ===\n');
    
    res.json({ success: true, data: enrichedOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    // Note: populate removed for subOrders.cook and subOrders.items.product
    // because they use Mixed type to support demo/legacy string IDs
    const order = await Order.findById(req.params.id);
      
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check if user is owner or admin
    const customerId = order.customer?._id?.toString() || order.customer?.toString();
    if (customerId !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update sub-order status (Cook functionality)
const updateSubOrderStatus = async (req, res) => {
  try {
    const schema = Joi.object({
      status: Joi.string().valid('order_received', 'preparing', 'ready', 'delivered', 'cancelled').required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { status } = value;
    
    // Find sub-order
    const order = await Order.findOne({ 
      'subOrders._id': req.params.subOrderId 
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Sub-order not found' });
    }
    
    // Find the sub-order
    const subOrder = order.subOrders.id(req.params.subOrderId);
    
    // Check if user is the cook for this sub-order or admin
    if (subOrder.cook.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update status
    subOrder.status = status;
    await order.save();
    
    // Populate the response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('subOrders.cook', 'name storeName')
      .populate('subOrders.items.product', 'name price');
    
    // Emit socket event for real-time updates
    // In a real implementation, you would emit to the customer
    // io.to(`user_${order.customer}`).emit('orderStatusUpdated', populatedOrder);
    
    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel order or sub-order
const cancelOrder = async (req, res) => {
  try {
    const { orderId, subOrderId } = req.params;
    const { reason } = req.body;
    
    if (subOrderId) {
      // Cancel a specific sub-order
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      const subOrder = order.subOrders.id(subOrderId);
      
      if (!subOrder) {
        return res.status(404).json({ message: 'Sub-order not found' });
      }
      
      // Check if user is authorized
      if (order.customer.toString() !== req.user._id.toString() && 
          subOrder.cook.toString() !== req.user._id.toString() &&
          req.user.role !== 'admin' && 
          req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      // Check if sub-order can be cancelled (not already delivered)
      if (subOrder.status === 'delivered') {
        return res.status(400).json({ message: 'Cannot cancel delivered order' });
      }
      
      subOrder.status = 'cancelled';
      subOrder.cancellationReason = reason;
      await order.save();
      
      res.json({ message: 'Sub-order cancelled successfully' });
    } else {
      // Cancel entire order
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check if user is authorized
      if (order.customer.toString() !== req.user._id.toString() && 
          req.user.role !== 'admin' && 
          req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      // Check if order can be cancelled (not already delivered)
      const allDelivered = order.subOrders.every(sub => sub.status === 'delivered');
      if (allDelivered) {
        return res.status(400).json({ message: 'Cannot cancel order that has been fully delivered' });
      }
      
      // Check if within 15-minute cancellation window
      const orderTime = new Date(order.createdAt);
      const currentTime = new Date();
      const timeDiffMinutes = (currentTime - orderTime) / (1000 * 60);
      
      if (timeDiffMinutes > 15) {
        return res.status(400).json({ 
          success: false,
          message: 'Cancellation window has expired. Orders can only be cancelled within 15 minutes of placing.' 
        });
      }
      
      // Cancel all sub-orders that haven't been delivered
      order.subOrders.forEach(sub => {
        if (sub.status !== 'delivered') {
          sub.status = 'cancelled';
          sub.cancellationReason = reason;
        }
      });
      
      order.status = 'cancelled';
      await order.save();
      
      res.json({ message: 'Order cancelled successfully' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get cook's sales summary (for dashboard)
const getCookSalesSummary = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { period = 'last30' } = req.query; // today, last7, last30, last90
    
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last7':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'last30':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'last90':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    // Fetch orders for this cook within the date range
    const orders = await Order.find({
      'subOrders.cook': cookId,
      createdAt: { $gte: startDate, $lte: now }
    }).select('subOrders createdAt');
    
    // Process data based on period
    const salesData = [];
    
    if (period === 'today') {
      // Group by hour
      const hourlyData = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = 0;
      }
      
      orders.forEach(order => {
        const hour = order.createdAt.getHours();
        order.subOrders.forEach(sub => {
          if (sub.cook.toString() === cookId.toString() && sub.status !== 'cancelled') {
            hourlyData[hour] += sub.totalAmount;
          }
        });
      });
      
      // Format for response (only hours with data or current time range)
      const currentHour = now.getHours();
      for (let i = 0; i <= currentHour; i++) {
        const hour = i % 12 || 12;
        const period = i < 12 ? 'AM' : 'PM';
        salesData.push({
          date: `${hour}${period}`,
          sales: hourlyData[i] || 0
        });
      }
    } else if (period === 'last7') {
      // Group by day
      const dailyData = {};
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        const dayName = days[date.getDay()];
        dailyData[dayName] = 0;
      }
      
      orders.forEach(order => {
        const dayName = days[order.createdAt.getDay()];
        order.subOrders.forEach(sub => {
          if (sub.cook.toString() === cookId.toString() && sub.status !== 'cancelled') {
            dailyData[dayName] += sub.totalAmount;
          }
        });
      });
      
      Object.keys(dailyData).forEach(day => {
        salesData.push({
          date: day,
          sales: dailyData[day]
        });
      });
    } else if (period === 'last30') {
      // Group by week
      const weeklyData = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 };
      
      orders.forEach(order => {
        const daysDiff = Math.floor((now - order.createdAt) / (1000 * 60 * 60 * 24));
        const week = Math.min(Math.floor(daysDiff / 7), 3);
        const weekLabel = `Week ${4 - week}`;
        
        order.subOrders.forEach(sub => {
          if (sub.cook.toString() === cookId.toString() && sub.status !== 'cancelled') {
            weeklyData[weekLabel] += sub.totalAmount;
          }
        });
      });
      
      Object.keys(weeklyData).forEach(week => {
        salesData.push({
          date: week,
          sales: weeklyData[week]
        });
      });
    } else if (period === 'last90') {
      // Group by month
      const monthlyData = { 'Month 1': 0, 'Month 2': 0, 'Month 3': 0 };
      
      orders.forEach(order => {
        const daysDiff = Math.floor((now - order.createdAt) / (1000 * 60 * 60 * 24));
        const month = Math.min(Math.floor(daysDiff / 30), 2);
        const monthLabel = `Month ${3 - month}`;
        
        order.subOrders.forEach(sub => {
          if (sub.cook.toString() === cookId.toString() && sub.status !== 'cancelled') {
            monthlyData[monthLabel] += sub.totalAmount;
          }
        });
      });
      
      Object.keys(monthlyData).forEach(month => {
        salesData.push({
          date: month,
          sales: monthlyData[month]
        });
      });
    }
    
    res.json(salesData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get cook's sales by category (for dashboard)
const getCookSalesByCategory = async (req, res) => {
  try {
    const cookId = req.user._id;
    
    // Get all products for this cook with their categories
    const products = await Product.find({ cook: cookId })
      .populate('category', 'name');
    
    // Get all orders for this cook (last 30 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const orders = await Order.find({
      'subOrders.cook': cookId,
      createdAt: { $gte: startDate }
    });
    
    // Create a map of product IDs to categories
    const productCategoryMap = {};
    products.forEach(product => {
      if (product.category) {
        productCategoryMap[product._id.toString()] = product.category.name || 'Uncategorized';
      }
    });
    
    // Calculate sales by category
    const categoryData = {};
    
    orders.forEach(order => {
      order.subOrders.forEach(sub => {
        if (sub.cook.toString() === cookId.toString() && sub.status !== 'cancelled') {
          sub.items.forEach(item => {
            const categoryName = productCategoryMap[item.product.toString()] || 'Uncategorized';
            if (!categoryData[categoryName]) {
              categoryData[categoryName] = 0;
            }
            categoryData[categoryName] += item.price * item.quantity;
          });
        }
      });
    });
    
    // Format for response
    const salesByCategory = Object.keys(categoryData).map(category => ({
      category,
      sales: categoryData[category]
    })).sort((a, b) => b.sales - a.sales);
    
    res.json(salesByCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get cook's orders (for Orders page)
const getCookOrders = async (req, res) => {
  try {
    const cookId = req.user._id.toString();
    
    // Get all orders and filter in memory (workaround for MongoDB array query issue)
    const orders = await Order.find({})
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });
    
    // Filter and transform to show only this cook's sub-orders
    const cookOrders = [];
    
    orders.forEach(order => {
      order.subOrders.forEach(sub => {
        if (sub.cook.toString() === cookId) {
          cookOrders.push({
            _id: sub._id,
            orderId: order._id,
            customer: order.customer,
            items: sub.items,
            totalAmount: sub.totalAmount,
            status: sub.status,
            pickupAddress: sub.pickupAddress,
            prepTime: sub.prepTime,
            createdAt: order.createdAt,
            updatedAt: sub.updatedAt || order.updatedAt,
            notes: order.notes,
            cancellationReason: sub.cancellationReason,
            fulfillmentMode: sub.fulfillmentMode || 'pickup',
            timingPreference: sub.timingPreference || 'separate',
            combinedReadyTime: sub.combinedReadyTime,
            deliveryFee: sub.deliveryFee || 0
          });
        }
      });
    });
    
    res.json(cookOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get cook's order statistics (for dashboard)
const getCookOrderStats = async (req, res) => {
  try {
    const cookId = req.user._id;
    
    // Get all orders for this cook
    const orders = await Order.find({
      'subOrders.cook': cookId
    });
    
    let allOrders = 0;
    let dispatched = 0;
    let awaitingPickup = 0;
    let inKitchen = 0;
    let cancellations = 0;
    
    orders.forEach(order => {
      order.subOrders.forEach(sub => {
        if (sub.cook.toString() === cookId.toString()) {
          allOrders++;
          switch (sub.status) {
            case 'delivered':
              dispatched++;
              break;
            case 'ready':
              awaitingPickup++;
              break;
            case 'order_received':
            case 'preparing':
              inKitchen++;
              break;
            case 'cancelled':
              cancellations++;
              break;
          }
        }
      });
    });
    
    res.json({
      allOrders,
      dispatched,
      awaitingPickup,
      inKitchen,
      cancellations
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get order details for cook (including delivery address with map coordinates)
 * @route   GET /api/cook/orders/:id
 * @access  Private (Cook only)
 */
const getCookOrderDetails = async (req, res) => {
  try {
    const cookId = req.user._id.toString();
    const orderId = req.params.id;

    // Find order by ID first (workaround for MongoDB array query issue)
    const order = await Order.findById(orderId)
      .populate('customer', 'name email phone')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Filter subOrders to only show cook's own subOrder
    const cookSubOrder = order.subOrders.find(
      sub => sub.cook.toString() === cookId
    );
    
    if (!cookSubOrder) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this order'
      });
    }

    // Return order with delivery address and map coordinates
    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderDate: order.createdAt,
        customer: order.customer,
        deliveryAddress: order.deliveryAddress, // Full address snapshot with lat/lng
        items: cookSubOrder.items,
        totalAmount: cookSubOrder.totalAmount,
        status: cookSubOrder.status,
        prepTime: cookSubOrder.prepTime,
        pickupAddress: cookSubOrder.pickupAddress,
        notes: order.notes,
        // Combine/Separate fields
        fulfillmentMode: cookSubOrder.fulfillmentMode || 'pickup',
        timingPreference: cookSubOrder.timingPreference || 'separate',
        combinedReadyTime: cookSubOrder.combinedReadyTime,
        deliveryFee: cookSubOrder.deliveryFee || 0
      }
    });
  } catch (error) {
    console.error('Get cook order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order details',
      error: error.message
    });
  }
};

/**
 * @desc    Report an issue with an order
 * @route   POST /api/orders/:id/report-issue
 * @access  Private (Customer or Cook)
 */
const reportOrderIssue = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user._id;
    const { reason, description } = req.body;

    // Validate required fields
    if (!reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Reason and description are required'
      });
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check user is either the customer or one of the cooks
    const isCustomer = order.customer.toString() === userId.toString();
    const isCook = order.subOrders.some(sub => sub.cook.toString() === userId.toString());

    if (!isCustomer && !isCook) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to report issue for this order'
      });
    }

    // Check if issue already exists
    if (order.hasIssue && order.issue?.status === 'open') {
      return res.status(400).json({
        success: false,
        message: 'An issue is already reported for this order'
      });
    }

    // Update order with issue
    order.hasIssue = true;
    order.issue = {
      reportedBy: isCustomer ? 'customer' : 'cook',
      reportedAt: new Date(),
      reason,
      description,
      status: 'open',
      adminNotes: '',
      resolvedAt: null
    };
    order.hasDispute = true;

    await order.save();

    // Import notification service
    const { createNotification } = require('../utils/notifications');
    const User = require('../models/User');

    // Get issue ID for deep links
    const issueId = order._id.toString();

    // Notify ADMIN
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } });
    await Promise.all(admins.map(admin =>
      createNotification({
        userId: admin._id,
        role: 'admin',
        title: 'New Order Issue Reported',
        message: `Issue reported for Order #${order._id.toString().slice(-6)}: ${reason}`,
        type: 'issue',
        entityType: 'issue',
        entityId: order._id,
        deepLink: `/admin/issues/${issueId}`,
        countryCode: order.deliveryAddress.countryCode
      })
    ));

    // Notify CUSTOMER
    if (!isCustomer) {
      await createNotification({
        userId: order.customer,
        role: 'customer',
        title: 'Issue Reported for Your Order',
        message: `An issue has been reported for Order #${order._id.toString().slice(-6)}: ${reason}. Our team will review it shortly.`,
        type: 'issue',
        entityType: 'issue',
        entityId: order._id,
        deepLink: `/orders/${order._id}`,
        countryCode: order.deliveryAddress.countryCode
      });
    }

    // Notify COOKS (all cooks on the order, except the reporter)
    const cookNotifications = order.subOrders.map(async (subOrder) => {
      if (subOrder.cook.toString() !== userId.toString()) {
        await createNotification({
          userId: subOrder.cook,
          role: 'cook',
          title: 'Issue Reported on Shared Order',
          message: `Issue reported for Order #${order._id.toString().slice(-6)}: ${reason}`,
          type: 'issue',
          entityType: 'issue',
          entityId: order._id,
          deepLink: `/orders/${order._id}`,
          countryCode: order.deliveryAddress.countryCode
        });
      }
    });
    await Promise.all(cookNotifications);

    res.status(200).json({
      success: true,
      message: 'Issue reported successfully',
      data: {
        orderId: order._id,
        hasIssue: order.hasIssue,
        issue: order.issue
      }
    });
  } catch (error) {
    console.error('Report order issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report issue',
      error: error.message
    });
  }
};

/**
 * @desc    Update order scheduled time
 * @route   PUT /api/orders/:id/scheduled-time
 * @access  Private (Admin or Cook)
 */
const updateOrderTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime } = req.body;

    if (!scheduledTime) {
      return res.status(400).json({ success: false, message: 'Scheduled time is required' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update time
    order.scheduledTime = new Date(scheduledTime);
    await order.save();

    // NOTIFY FOODIE: Your order time has been updated
    const { createNotification } = require('../utils/notifications');
    try {
      await createNotification({
        userId: order.customer,
        role: 'foodie',
        title: 'Order Time Updated',
        message: 'Your order time has been updated.',
        type: 'order_update',
        entityType: 'order',
        entityId: order._id,
        deepLink: `/orders/${order._id}`
      });
    } catch (notifErr) {
      console.error('Error sending order update notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Order time updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order time error:', error);
    res.status(500).json({ success: false, message: 'Error updating order time' });
  }
};

/**
 * @desc    Mark order item as unavailable
 * @route   PUT /api/orders/:id/items/:productId/unavailable
 * @access  Private (Admin or Cook)
 */
const markItemUnavailable = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Find the item in sub-orders
    let itemFound = false;
    order.subOrders.forEach(subOrder => {
      subOrder.items.forEach(item => {
        if (item.product.toString() === productId) {
          item.isUnavailable = true; // Need to add this to schema if not exists
          itemFound = true;
        }
      });
    });

    if (!itemFound) {
      return res.status(404).json({ success: false, message: 'Item not found in this order' });
    }

    await order.save();

    // NOTIFY FOODIE: An item in your order is unavailable
    const { createNotification } = require('../utils/notifications');
    try {
      await createNotification({
        userId: order.customer,
        role: 'foodie',
        title: 'Order Item Unavailable',
        message: 'An item in your order is unavailable. Please review updates.',
        type: 'order_issue',
        entityType: 'order',
        entityId: order._id,
        deepLink: `/orders/${order._id}`
      });

      // Notify ADMIN (Inbox only)
      const User = require('../models/User');
      const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } });
      await Promise.all(admins.map(admin =>
        createNotification({
          userId: admin._id,
          role: 'admin',
          title: 'Order Item Unavailable',
          message: `An item in Order #${order._id.toString().slice(-6)} was marked unavailable.`,
          type: 'order_issue_admin',
          entityType: 'order',
          entityId: order._id,
          deepLink: `/admin/orders/${order._id}`
        })
      ));
    } catch (notifErr) {
      console.error('Error sending order item unavailable notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Item marked as unavailable',
      data: order
    });
  } catch (error) {
    console.error('Mark item unavailable error:', error);
    res.status(500).json({ success: false, message: 'Error marking item unavailable' });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateSubOrderStatus,
  cancelOrder,
  getCookSalesSummary,
  getCookSalesByCategory,
  getCookOrderStats,
  getCookOrders,
  getCookOrderDetails,
  reportOrderIssue,
  updateOrderTime,
  markItemUnavailable
};
