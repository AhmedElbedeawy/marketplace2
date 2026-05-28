const { Order, SubOrder, OrderItem } = require('../models/Order');
const Product = require('../models/Product');
const Cook = require('../models/Cook');
const User = require('../models/User');
const AdminDish = require('../models/AdminDish');
const DishOffer = require('../models/DishOffer');
const Joi = require('joi');
const { createNotification } = require('../utils/notifications');

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
      
      // FIX: Resolve dishOffer for legacy Product-based orders
      let dishOfferId = null;
      if (product.adminDishId) {
        // Try to find DishOffer for this product + cook combination
        const dishOffer = await DishOffer.findOne({
          adminDishId: product.adminDishId,
          cook: product.cook._id
        });
        if (dishOffer) {
          dishOfferId = dishOffer._id;
        }
      }
      
      cookItemsMap.get(product.cook._id.toString()).items.push({
        product,
        quantity: item.quantity,
        notes: item.notes,
        dishOfferId // FIX: Include dishOffer if found
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
          dishOffer: item.dishOfferId || null, // FIX: Persist dishOffer for legacy path
          quantity: item.quantity,
          price: item.product.price,
          notes: item.notes
        });
      }
      
      totalAmount += subOrderTotal;
      
      const cookAddress = cookData.cookProfile
        ? `${cookData.cookProfile.city}, ${cookData.cookProfile.addressLine1 || cookData.cookProfile.area || ''}`
        : (cookData.cook.pickupAddress || 'Address not provided');
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
    
    // Note: Stock decrement moved to checkoutController.confirmOrder (variant-aware)
    // for (const item of items) {
    //   await Product.findByIdAndUpdate(item.productId, {
    //     $inc: { stock: -item.quantity }
    //   });
    // }
    
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
    
    // Enrich orders with missing images from AdminDish/DishOffer AND cook names
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const orderObj = order.toObject();
        
        for (const subOrder of orderObj.subOrders || []) {
          // FIX #1: Enrich cook name - query Cook model (not User) for storeName
          if (!subOrder.cookName && subOrder.cook) {
            try {
              const cookId = typeof subOrder.cook === 'object' ? subOrder.cook._id : subOrder.cook;
              if (cookId && mongoose.Types.ObjectId.isValid(cookId)) {
                // Query Cook model which has storeName, then get User for name
                const cookProfile = await Cook.findOne({ userId: cookId }).select('storeName');
                if (cookProfile && cookProfile.storeName) {
                  subOrder.cookName = cookProfile.storeName;
                } else {
                  // Fallback to User.name if Cook profile not found
                  const user = await User.findById(cookId).select('name');
                  if (user) {
                    subOrder.cookName = user.name || 'Cook';
                  }
                }
              }
            } catch (err) {
              console.log(`⚠️ Failed to enrich cook name: ${err.message}`);
            }
          }
          
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
        console.log(`      cook: ${sub.cook}`);
        console.log(`      cookName: ${sub.cookName || 'NOT SET'}`);
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
    
    // Enrich with cook name
    const orderObj = order.toObject();
    for (const subOrder of orderObj.subOrders || []) {
      // FIX #1: Enrich cook name
      if (!subOrder.cookName && subOrder.cook) {
        try {
          const cookId = typeof subOrder.cook === 'object' ? subOrder.cook._id : subOrder.cook;
          if (cookId && mongoose.Types.ObjectId.isValid(cookId)) {
            const cookProfile = await Cook.findOne({ userId: cookId }).select('storeName');
            if (cookProfile && cookProfile.storeName) {
              subOrder.cookName = cookProfile.storeName;
            } else {
              const user = await User.findById(cookId).select('name');
              if (user) {
                subOrder.cookName = user.name || 'Cook';
              }
            }
          }
        } catch (err) {
          console.log(`⚠️ [getOrderById] Failed to enrich cook name: ${err.message}`);
        }
      }
    }
    
    res.json({ success: true, data: orderObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update sub-order status (Cook functionality)
const updateSubOrderStatus = async (req, res) => {
  try {
    const schema = Joi.object({
      status: Joi.string().valid('order_received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'pickedup', 'cancelled').required()
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
    
    // DEBUG: Log authorization comparison
    console.log('[updateSubOrderStatus] Authorization check:');
    console.log('  subOrder.cook:', subOrder.cook);
    console.log('  subOrder.cook type:', typeof subOrder.cook);
    console.log('  req.user._id:', req.user._id);
    console.log('  req.user._id type:', typeof req.user._id);
    console.log('  req.user.role:', req.user.role);
    console.log('  req.user.isCook:', req.user.isCook);
    console.log('  Match result:', subOrder.cook.toString() === req.user._id.toString());
    
    // Check if user is the cook for this sub-order or admin
    // Note: Cooks are identified by isCook boolean, NOT by role
    if (subOrder.cook.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      console.log('[updateSubOrderStatus] AUTHORIZATION FAILED');
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update status
    subOrder.status = status;
    await order.save();
    
    // Send lifecycle notifications to customer
    const notificationMessages = {
      'order_received': { 
        title: 'Order Confirmed', 
        message: 'Your order has been received and is being prepared.',
        titleAr: 'تم تأكيد الطلب',
        messageAr: 'تم استلام طلبك ويبدأ الطهي الآن.'
      },
      'preparing': { 
        title: 'Order in Progress', 
        message: 'Your order is being prepared.',
        titleAr: 'جاري تحضير الطلب',
        messageAr: 'طلبك قيد التحضير.'
      },
      'ready': { 
        title: 'Order Ready', 
        message: 'Your order is ready for pickup/delivery!',
        titleAr: 'الطلب جاهز',
        messageAr: 'طلبك جاهز للاستلام أو التوصيل!'
      },
      'out_for_delivery': { 
        title: 'Out for Delivery', 
        message: 'Your order is on its way!',
        titleAr: 'الطلب في الطريق',
        messageAr: 'طلبك في الطريق إليك!'
      },
      'delivered': { 
        title: 'Order Delivered', 
        message: 'Your order has been delivered. Enjoy your meal!',
        titleAr: 'تم توصيل الطلب',
        messageAr: 'تم توصيل طلبك. بالهناء والشفاء!'
      },
      'cancelled': { 
        title: 'Order Cancelled', 
        message: 'Your order has been cancelled.',
        titleAr: 'تم إلغاء الطلب',
        messageAr: 'تم إلغاء طلبك.'
      }
    };
    
    if (notificationMessages[status]) {
      await createNotification({
        userId: order.customer,
        title: notificationMessages[status].title,
        message: notificationMessages[status].message,
        titleAr: notificationMessages[status].titleAr,
        messageAr: notificationMessages[status].messageAr,
        type: 'order',
        entityType: 'order',
        entityId: order._id,
        deepLink: `/foodie/order-details/${order._id}`
      });
    }
    
    // Sync main order status based on all subOrders
    // Main Order status enum: ['pending', 'confirmed', 'partially_delivered', 'completed', 'cancelled']
    // SubOrder status enum: ['order_received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']
    const allSubOrders = order.subOrders;
    const allDelivered = allSubOrders.every(sub => sub.status === 'delivered');
    const allCancelled = allSubOrders.every(sub => sub.status === 'cancelled');
    const someDelivered = allSubOrders.some(sub => sub.status === 'delivered');
    const anyActive = allSubOrders.some(sub => ['order_received', 'preparing', 'ready', 'out_for_delivery'].includes(sub.status));
    
    if (allDelivered) {
      order.status = 'completed';  // Map 'delivered' → 'completed'
    } else if (allCancelled) {
      order.status = 'cancelled';
    } else if (someDelivered && anyActive) {
      order.status = 'partially_delivered';  // Some delivered, some still active
    } else if (anyActive) {
      order.status = 'confirmed';  // At least one active subOrder
    } else {
      order.status = 'pending';
    }
    
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
      
      // Check if sub-order can be cancelled (not already delivered or pickedup)
      if (subOrder.status === 'delivered' || subOrder.status === 'pickedup') {
        return res.status(400).json({ message: 'Cannot cancel completed order' });
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
      
      // Check if order can be cancelled (not already delivered or pickedup)
      const allCompleted = order.subOrders.every(sub => sub.status === 'delivered' || sub.status === 'pickedup');
      if (allCompleted) {
        return res.status(400).json({ message: 'Cannot cancel order that has been fully completed' });
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
      
      // Cancel all sub-orders that haven't been delivered or pickedup
      order.subOrders.forEach(sub => {
        if (sub.status !== 'delivered' && sub.status !== 'pickedup') {
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
    const userId = req.user._id.toString(); // Convert to string to match DB storage
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
    // SubOrder.cook stores User._id, not Cook._id
    const orders = await Order.find({
      'subOrders.cook': userId,
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
          if (sub.cook.toString() === userId && sub.status !== 'cancelled') {
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
          if (sub.cook.toString() === userId && sub.status !== 'cancelled') {
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
          if (sub.cook.toString() === userId && sub.status !== 'cancelled') {
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
          if (sub.cook.toString() === userId && sub.status !== 'cancelled') {
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
// Uses DishOffer → AdminDish → Category mapping (current order structure)
const getCookSalesByCategory = async (req, res) => {
  try {
    // SubOrder.cook stores User._id — used for order filtering
    const userId = req.user._id.toString();

    // DishOffer.cook stores Cook._id — must resolve Cook profile first
    const cookProfile = await Cook.findOne({ userId: req.user._id }).lean();
    if (!cookProfile) {
      return res.json([]);
    }
    const cookId = cookProfile._id;

    // Fetch only this cook's active DishOffers using Cook._id
    const cookOffers = await DishOffer.find({ cook: cookId, isActive: true }).lean();

    // Get AdminDish IDs for this cook's active offers
    const adminDishIds = cookOffers
      .map(offer => offer.adminDishId)
      .filter(id => id);

    // Fetch AdminDishes with categories
    const adminDishes = await AdminDish.find({ _id: { $in: adminDishIds } })
      .populate('category', 'name')
      .lean();

    // Map: AdminDish ID → category name
    const adminDishCategoryMap = {};
    adminDishes.forEach(dish => {
      if (dish.category) {
        adminDishCategoryMap[dish._id.toString()] = dish.category.name || 'Uncategorized';
      }
    });

    // Map: DishOffer ID → category name (via AdminDish)
    const offerToCategoryMap = {};
    cookOffers.forEach(offer => {
      const adminDishId = offer.adminDishId?.toString();
      if (adminDishId && adminDishCategoryMap[adminDishId]) {
        offerToCategoryMap[offer._id.toString()] = adminDishCategoryMap[adminDishId];
      }
    });

    // Seed categoryData with all active-offer categories at 0
    const categoryData = {};
    Object.values(adminDishCategoryMap).forEach(name => {
      categoryData[name] = 0;
    });

    // Overlay sales from this cook's last-30-day non-cancelled subOrders
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const allOrders = await Order.find({}).lean();
    const orders = allOrders.filter(order =>
      order.subOrders?.some(sub => sub.cook?.toString() === userId) &&
      new Date(order.createdAt) >= startDate
    );

    orders.forEach(order => {
      order.subOrders.forEach(sub => {
        if (sub.cook.toString() === userId && sub.status !== 'cancelled') {
          sub.items.forEach(item => {
            // Method 1: dishOffer ID → offerToCategoryMap
            const dishOfferId = item.dishOffer?.toString();
            const categoryName = (dishOfferId && offerToCategoryMap[dishOfferId])
              ? offerToCategoryMap[dishOfferId]
              // Method 2: productSnapshot.category fallback
              : (item.productSnapshot?.category || null);

            if (categoryName && categoryData.hasOwnProperty(categoryName)) {
              categoryData[categoryName] += (item.price * item.quantity) || 0;
            }
          });
        }
      });
    });

    // Format and sort by sales descending
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
    const userId = req.user._id.toString();
    
    // SubOrder.cook stores User._id, not Cook._id
    // So we filter by req.user._id directly
    
    // Get all orders and filter in memory (workaround for MongoDB array query issue)
    const orders = await Order.find({})
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });
    
    // Group subOrders by parent order to return one order object per parent order
    const ordersByParent = new Map();
    
    orders.forEach(order => {
      const cookSubOrders = [];
      
      order.subOrders.forEach(sub => {
        // Compare with userId, not cookId
        if (sub.cook.toString() === userId) {
          // FIX #5: Enrich items with productSnapshot for image display
          const enrichedItems = sub.items?.map(item => {
            const itemObj = item.toObject ? item.toObject() : item;
            const productSnapshot = itemObj.productSnapshot || {};
            
            // Use the actual image from productSnapshot, don't fallback to placeholder
            const imageUrl = productSnapshot.image || productSnapshot.photoUrl || productSnapshot.dishImage || '/assets/dishes/dish-placeholder.svg';
            
            return {
              ...itemObj,
              productSnapshot: {
                name: productSnapshot.name || itemObj.name || 'Unknown Dish',
                image: imageUrl,
                description: productSnapshot.description || ''
              },
              // Include readyAt for grouping logic
              readyAt: itemObj.readyAt || null,
              // Include fulfillmentMode at item level (from subOrder if not on item)
              fulfillmentMode: itemObj.fulfillmentMode || sub.fulfillmentMode || 'pickup'
            };
          }) || [];
          
          cookSubOrders.push({
            _id: sub._id,
            items: enrichedItems,
            totalAmount: sub.totalAmount,
            status: sub.status,
            pickupAddress: sub.pickupAddress,
            prepTime: sub.prepTime,
            cancellationReason: sub.cancellationReason,
            fulfillmentMode: sub.fulfillmentMode || 'pickup',
            timingPreference: sub.timingPreference || 'separate',
            combinedReadyTime: sub.combinedReadyTime,
            deliveryFee: sub.deliveryFee || 0
          });
        }
      });
      
      // If this order has subOrders for this cook, add it to the result
      if (cookSubOrders.length > 0) {
        // Calculate aggregated values for the order level
        const totalAmount = cookSubOrders.reduce((sum, sub) => sum + sub.totalAmount, 0);
        const statuses = cookSubOrders.map(sub => sub.status);
        // Use the earliest status (order_received < preparing < ready < delivered)
        const statusOrder = ['order_received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'pickedup', 'cancelled'];
        const aggregatedStatus = statuses.reduce((earliest, status) => {
          return statusOrder.indexOf(status) < statusOrder.indexOf(earliest) ? status : earliest;
        }, statuses[0]);
        
        ordersByParent.set(order._id.toString(), {
          _id: order._id, // Use parent order._id as main ID
          orderId: order._id,
          customer: order.customer,
          subOrders: cookSubOrders,
          // Aggregated fields for backward compatibility
          items: cookSubOrders.flatMap(sub => sub.items),
          totalAmount: totalAmount,
          status: aggregatedStatus,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          notes: order.notes,
          // Primary subOrder fields (first subOrder for backward compatibility)
          subOrderId: cookSubOrders[0]._id,
          pickupAddress: cookSubOrders[0].pickupAddress,
          prepTime: cookSubOrders[0].prepTime,
          cancellationReason: cookSubOrders[0].cancellationReason,
          fulfillmentMode: cookSubOrders.length === 1 ? cookSubOrders[0].fulfillmentMode : 'mixed',
          timingPreference: cookSubOrders[0].timingPreference,
          combinedReadyTime: cookSubOrders[0].combinedReadyTime,
          deliveryFee: cookSubOrders.reduce((sum, sub) => sum + sub.deliveryFee, 0),
          deliveryAddress: order.deliveryAddress
        });
      }
    });
    
    const cookOrders = Array.from(ordersByParent.values());
    
    // DEBUG: Log fulfillmentMode for each returned order
    console.log('[COOK_ORDERS] === GET COOK ORDERS DEBUG ===');
    console.log('[COOK_ORDERS] Total cook orders returned:', cookOrders.length);
    cookOrders.slice(0, 5).forEach((order, idx) => {
      const orderIdStr = String(order._id || order.orderId || '');
      const orderIdShort = orderIdStr.slice(-6);
      console.log(`[COOK_ORDERS] Order ${idx}: id=${orderIdShort}, fulfillmentMode=${order.fulfillmentMode}, prepTime=${order.prepTime}, items=${order.items?.length}`);
      if (order.items?.length > 0) {
        console.log(`[COOK_ORDERS]   First item image: ${order.items[0]?.productSnapshot?.image}`);
      }
    });
    console.log('[COOK_ORDERS] === END ===');
    
    return res.status(200).json(cookOrders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get cook's order statistics (for dashboard)
const getCookOrderStats = async (req, res) => {
  try {
    // SubOrder.cook stores User._id as string
    const userId = req.user._id.toString();
    
    // Get all orders for this cook
    const orders = await Order.find({
      'subOrders.cook': userId
    });
    
    let allOrders = 0;
    let dispatched = 0;
    let awaitingPickup = 0;
    let inKitchen = 0;
    let cancellations = 0;
    
    orders.forEach(order => {
      order.subOrders.forEach(sub => {
        if (sub.cook.toString() === userId) {
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
    const userId = req.user._id.toString();
    const orderId = req.params.id;
    
    // Find the cook document for this user
    const cook = await Cook.findOne({ userId });
    if (!cook) {
      return res.status(404).json({ message: 'Cook profile not found' });
    }

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
    // subOrder.cook stores User._id (account ID), not Cook._id
    const cookSubOrder = order.subOrders.find(
      sub => sub.cook.toString() === userId
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
    const isCook = order.subOrders.some(sub => sub.cook.toString() === userId);

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

// Get cook's traffic statistics (for dashboard)
// NOTE: This returns zeros because traffic tracking (views, impressions, clicks) is not yet implemented
// To enable real traffic data, you need to:
// 1. Add tracking middleware to product/dish detail pages
// 2. Create a TrafficAnalytics model to store views/impressions/clicks
// 3. Update this endpoint to query real data
const getCookTrafficStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'last30' } = req.query;
    
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
    
    // Return zeros until traffic tracking is implemented
    res.json({
      listingImpressions: 0,
      impressionsChange: 0,
      clickThroughRate: 0,
      ctrChange: 0,
      storeViews: 0,
      viewsData: [] // Can be used for mini chart in the future
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get cook's recent activity (for dashboard)
const getCookRecentActivity = async (req, res) => {
  try {
    // SubOrder.cook stores User._id as string
    const userId = req.user._id.toString();
    const { limit = 5 } = req.query;
    
    // Get recent orders for this cook
    const orders = await Order.find({
      'subOrders.cook': userId
    })
    .select('subOrders createdAt')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
    
    const activities = [];
    
    orders.forEach(order => {
      order.subOrders.forEach(sub => {
        if (sub.cook.toString() === userId) {
          // Get first item name for display - use same path as Cook Hub Orders
          const firstItem = sub.items?.[0] || {};
          const itemName = firstItem.productSnapshot?.name || 
                          firstItem.dishName || 
                          firstItem.product?.name || 
                          'Order';
          
          activities.push({
            _id: sub._id,
            type: 'order',
            title: itemName,
            subtitle: `Order #${order._id.toString().slice(-4)}`,
            amount: sub.totalAmount,
            status: sub.status,
            createdAt: order.createdAt
          });
        }
      });
    });
    
    // Limit to requested number
    res.json(activities.slice(0, parseInt(limit)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get cook's performance statistics (for dashboard)
// Calculates real metrics: completion rate, average rating, performance score
const getCookPerformanceStats = async (req, res) => {
  try {
    // SubOrder.cook stores User._id as string
    const userId = req.user._id.toString();
    const { period = 'last30' } = req.query;
    
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
    
    // Get cook's orders in the period
    const cookOrders = await Order.find({
      'subOrders.cook': userId,
      createdAt: { $gte: startDate, $lte: now }
    });
    
    let totalOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let cookCancelledOrders = 0; // Only cook-initiated cancellations
    let inProgressOrders = 0;
    
    cookOrders.forEach(order => {
      order.subOrders.forEach(sub => {
        if (sub.cook.toString() === userId) {
          totalOrders++;
          
          // Final states: delivered, pickedup, cancelled
          // In-progress states: order_received, preparing, ready, out_for_delivery
          if (sub.status === 'delivered' || sub.status === 'pickedup') {
            completedOrders++;
          } else if (sub.status === 'cancelled') {
            cancelledOrders++;
            
            // Check if this was a cook-initiated cancellation
            // If cancellationReason exists, it's likely cook-cancelled
            // If no reason or system reason, don't count against cook
            if (sub.cancellationReason && sub.cancellationReason.trim() !== '') {
              cookCancelledOrders++;
            }
          } else {
            // Active/in-progress orders (not counted as failed)
            inProgressOrders++;
          }
        }
      });
    });
    
    // Completion Rate: completed / ALL total orders (including in-progress)
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Final orders = terminal states (completed + cancelled)
    const finalOrders = completedOrders + cancelledOrders;

    // Order Reliability: measures cook-side cancellation reliability only
    // Formula: 1 - (cook-cancelled orders / final cook orders)
    // Does not count customer/system cancellations as cook failures
    const orderReliability = finalOrders > 0 ? (1 - (cookCancelledOrders / finalOrders)) * 100 : 0;
    
    // Get cook's average rating - same source as Cook Hub Reviews screen
    // Working pattern: Cook.ratings.average (updated by updateCookAggregates in ratingController)
    const Cook = require('../models/Cook');
    const cookProfile = await Cook.findOne({ userId: userId.toString() });
    
    let avgRating = 0;
    let totalRatings = 0;
    
    if (cookProfile && cookProfile.ratings) {
      avgRating = cookProfile.ratings.average || 0;
      totalRatings = cookProfile.ratings.count || 0;
    }
    
    // Convert rating to percentage (rating / 5 * 100)
    const ratingPercentage = avgRating > 0 ? (avgRating / 5) * 100 : 0;
    
    // Performance Score formula:
    // (Completion Rate × 0.5) + (Rating Percentage × 0.3) + (Order Reliability × 0.2)
    const performanceScore = Math.round(
      (completionRate * 0.5) + 
      (ratingPercentage * 0.3) + 
      (orderReliability * 0.2)
    );
    
    // Ensure score is between 0-100
    const finalScore = Math.min(100, Math.max(0, performanceScore));
    
    res.json({
      totalOrders,
      completedOrders,
      cancelledOrders,
      cookCancelledOrders,
      inProgressOrders,
      finalOrders,
      completionRate: completionRate.toFixed(1),
      averageRating: avgRating.toFixed(1),
      totalRatings,
      ratingPercentage: ratingPercentage.toFixed(1),
      orderReliability: orderReliability.toFixed(1),
      performanceScore: finalScore
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  markItemUnavailable,
  getCookTrafficStats,
  getCookRecentActivity,
  getCookPerformanceStats
};
