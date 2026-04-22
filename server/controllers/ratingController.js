const OrderRating = require('../models/OrderRating');
const { Order } = require('../models/Order');
const Product = require('../models/Product');
const DishOffer = require('../models/DishOffer');
const Cook = require('../models/Cook');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * @desc    Create or update rating for a completed order
 * @route   POST /api/ratings/order/:orderId
 * @access  Private (Customer who placed the order)
 */
exports.createOrUpdateOrderRating = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { dishRatings } = req.body; // Array of { productId, rating, review }
    const customerId = req.user.id;

    // Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    // Validate dishRatings array
    if (!Array.isArray(dishRatings) || dishRatings.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide ratings for at least one dish' 
      });
    }

    // Validate each dish rating
    for (const item of dishRatings) {
      if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid product ID in ratings' 
        });
      }
      if (!item.rating || item.rating < 1 || item.rating > 5) {
        return res.status(400).json({ 
          success: false, 
          message: 'Rating must be between 1 and 5' 
        });
      }
    }

    // Find the order - DO NOT populate because product is Mixed type
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // RULE 1: Verify order belongs to the current user
    const orderCustomerId = order.customer?._id?.toString() || order.customer?.toString();
    if (orderCustomerId !== customerId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only rate your own orders' 
      });
    }

    // RULE 2: Verify order is completed (completed, delivered, or pickedup)
    const finalizedStatuses = ['completed', 'delivered', 'pickedup'];
    if (!finalizedStatuses.includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'You can only rate completed orders' 
      });
    }

    // Get the cook ID from the first subOrder
    const firstSubOrder = order.subOrders[0];
    const cookId = firstSubOrder?.cook?._id?.toString() || 
                   firstSubOrder?.cook?.toString();

    if (!cookId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cook information not found for this order' 
      });
    }

    // Verify all rated products are in this order
    // Product can be a string ID or populated object
    const orderProductIds = new Set();
    order.subOrders.forEach(subOrder => {
      subOrder.items.forEach(item => {
        let productId = item.product;
        if (productId && typeof productId === 'object' && productId._id) {
          productId = productId._id;
        }
        if (productId) {
          orderProductIds.add(productId.toString());
        }
      });
    });

    for (const item of dishRatings) {
      if (!orderProductIds.has(item.product.toString())) {
        return res.status(400).json({ 
          success: false, 
          message: 'You can only rate dishes that were in this order' 
        });
      }
    }

    // RULE 3: Check if rating already exists (update) or create new
    let orderRating = await OrderRating.findOne({ order: orderId });
    let isUpdate = false;

    if (orderRating) {
      // Update existing rating - check edit eligibility
      const editCheck = await orderRating.canEdit();
      
      if (!editCheck.canEdit) {
        return res.status(403).json({ 
          success: false, 
          message: editCheck.reason,
          editWindowInfo: orderRating.getEditWindowInfo()
        });
      }

      // Increment edit count
      orderRating.editCount += 1;
      orderRating.dishRatings = dishRatings.map(item => ({
        product: item.product,
        rating: item.rating,
        review: item.review || ''
      }));
      orderRating.calculateOverallRating();
      await orderRating.save();
      isUpdate = true;
    } else {
      // Create new rating
      orderRating = await OrderRating.create({
        order: orderId,
        customer: customerId,
        cook: cookId,
        dishRatings: dishRatings.map(item => ({
          product: item.product,
          rating: item.rating,
          review: item.review || ''
        }))
      });
      orderRating.calculateOverallRating();
      await orderRating.save();
    }

    // Update dish aggregates for each rated product
    await updateDishAggregates(dishRatings);

    // Update cook aggregates
    await updateCookAggregates(cookId);

    console.log(`[RATING] Notifying cook ${cookId} of new rating for order ${orderId}`);

    // NOTIFY COOK: You received a new rating
    const { createNotification } = require('../utils/notifications');
    try {
      await createNotification({
        userId: cookId,
        role: 'cook',
        title: 'New Rating Received',
        message: 'You received a new rating.',
        type: 'rating',
        entityType: 'order',
        entityId: orderId,
        deepLink: '/cook/reviews'
      });
    } catch (notifErr) {
      console.error('Error sending rating notification to cook:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: isUpdate ? 'Rating updated successfully' : 'Rating submitted successfully',
      data: {
        rating: orderRating,
        editWindowInfo: orderRating.getEditWindowInfo()
      }
    });

  } catch (error) {
    console.error('Error creating/updating order rating:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing rating',
      error: error.message 
    });
  }
};

/**
 * @desc    Get rating status for an order
 * @route   GET /api/ratings/order/:orderId/status
 * @access  Private
 */
exports.getOrderRatingStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    // Verify order ownership
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== customerId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Check if rating exists
    const rating = await OrderRating.findOne({ order: orderId });

    let editWindowInfo = null;
    let canEdit = false;
    
    if (rating) {
      const editCheck = await rating.canEdit();
      editWindowInfo = rating.getEditWindowInfo();
      canEdit = editCheck.canEdit;
    }

    res.status(200).json({
      success: true,
      data: {
        orderId,
        isRated: !!rating,
        canRate: order.status === 'completed',
        canEdit,
        orderStatus: order.status,
        hasDispute: order.hasDispute || false,
        rating: rating || null,
        editWindowInfo
      }
    });

  } catch (error) {
    console.error('Error getting rating status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting rating status',
      error: error.message 
    });
  }
};

/**
 * @desc    Get rating for a specific order
 * @route   GET /api/ratings/order/:orderId
 * @access  Private
 */
exports.getOrderRating = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    // Verify order ownership
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== customerId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const rating = await OrderRating.findOne({ order: orderId })
      .populate('dishRatings.product', 'name photoUrl');

    if (!rating) {
      return res.status(404).json({ 
        success: false, 
        message: 'No rating found for this order' 
      });
    }

    res.status(200).json({
      success: true,
      data: rating
    });

  } catch (error) {
    console.error('Error getting order rating:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting rating',
      error: error.message 
    });
  }
};

/**
 * Helper: Update dish rating aggregates
 * Supports both DishOffer (new) and Product (legacy fallback)
 */
async function updateDishAggregates(dishRatings) {
  for (const item of dishRatings) {
    // NEW: Update DishOffer.ratings if dishOffer is provided
    if (item.dishOffer && mongoose.Types.ObjectId.isValid(item.dishOffer)) {
      try {
        const offerStats = await OrderRating.aggregate([
          { $unwind: '$dishRatings' },
          { $match: { 'dishRatings.dishOffer': new mongoose.Types.ObjectId(item.dishOffer) } },
          { $group: {
            _id: '$dishRatings.dishOffer',
            avgRating: { $avg: '$dishRatings.rating' },
            count: { $sum: 1 }
          }}
        ]);

        if (offerStats.length > 0) {
          await DishOffer.findByIdAndUpdate(item.dishOffer, {
            'ratings.average': parseFloat(offerStats[0].avgRating.toFixed(2)),
            'ratings.count': offerStats[0].count
          });
        }
      } catch (err) {
        console.log(`⚠️ Failed to update DishOffer aggregates: ${err.message}`);
      }
    }

    // LEGACY: Update Product.ratingAvg (for backward compatibility)
    if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
      try {
        const productId = item.product;
        
        // Get all ratings for this dish from OrderRatings
        const allRatings = await OrderRating.aggregate([
          { $unwind: '$dishRatings' },
          { $match: { 'dishRatings.product': new mongoose.Types.ObjectId(productId) } },
          { $group: {
            _id: '$dishRatings.product',
            avgRating: { $avg: '$dishRatings.rating' },
            count: { $sum: 1 }
          }}
        ]);

        if (allRatings.length > 0) {
          const { avgRating, count } = allRatings[0];
          await Product.findByIdAndUpdate(productId, {
            ratingAvg: parseFloat(avgRating.toFixed(2)),
            ratingCount: count
          });
        }
      } catch (err) {
        console.log(`⚠️ Failed to update Product aggregates: ${err.message}`);
      }
    }
  }
}

/**
 * Helper: Update cook rating aggregates (derived from all their DishOffers)
 * NEW: Uses DishOffer.ratings instead of Product.ratingAvg
 */
async function updateCookAggregates(cookId) {
  // NEW: Get all DishOffers by this cook
  const cookOffers = await DishOffer.find({ cook: cookId }).select('_id');
  const offerIds = cookOffers.map(o => o._id);

  if (offerIds.length === 0) {
    // LEGACY FALLBACK: Try Product model for old cooks
    const cookProducts = await Product.find({ cook: cookId }).select('_id');
    const productIds = cookProducts.map(p => p._id);
    
    if (productIds.length === 0) {
      return;
    }
    
    // Aggregate from legacy Product ratings
    const cookRatingStats = await OrderRating.aggregate([
      { $unwind: '$dishRatings' },
      { $match: { 'dishRatings.product': { $in: productIds } } },
      { $group: {
        _id: null,
        avgRating: { $avg: '$dishRatings.rating' },
        count: { $sum: 1 }
      }}
    ]);

    if (cookRatingStats.length > 0) {
      const { avgRating, count } = cookRatingStats[0];
      // Update both Cook.ratings and User.cookRatingAvg for compatibility
      await Promise.all([
        Cook.findOneAndUpdate({ userId: cookId }, {
          'ratings.average': parseFloat(avgRating.toFixed(2)),
          'ratings.count': count
        }),
        User.findByIdAndUpdate(cookId, {
          cookRatingAvg: parseFloat(avgRating.toFixed(2)),
          cookRatingCount: count
        })
      ]);
    } else {
      // No ratings yet
      await Promise.all([
        Cook.findOneAndUpdate({ userId: cookId }, {
          'ratings.average': 0,
          'ratings.count': 0
        }),
        User.findByIdAndUpdate(cookId, {
          cookRatingAvg: 0,
          cookRatingCount: 0
        })
      ]);
    }
    return;
  }

  // NEW: Aggregate all ratings for all DishOffers by this cook
  const cookRatingStats = await OrderRating.aggregate([
    { $unwind: '$dishRatings' },
    { $match: { 'dishRatings.dishOffer': { $in: offerIds } } },
    { $group: {
      _id: null,
      avgRating: { $avg: '$dishRatings.rating' },
      count: { $sum: 1 }
    }}
  ]);

  if (cookRatingStats.length > 0) {
    const { avgRating, count } = cookRatingStats[0];
    // Update Cook.ratings (primary source)
    await Cook.findOneAndUpdate({ userId: cookId }, {
      'ratings.average': parseFloat(avgRating.toFixed(2)),
      'ratings.count': count
    });
    
    // Also update User model for backward compatibility
    await User.findByIdAndUpdate(cookId, {
      cookRatingAvg: parseFloat(avgRating.toFixed(2)),
      cookRatingCount: count
    });
  } else {
    // No ratings yet
    await Promise.all([
      Cook.findOneAndUpdate({ userId: cookId }, {
        'ratings.average': 0,
        'ratings.count': 0
      }),
      User.findByIdAndUpdate(cookId, {
        cookRatingAvg: 0,
        cookRatingCount: 0
      })
    ]);
  }
}

/**
 * @desc    Get orders needing rating reminders (12-24 hours after completion)
 * @route   GET /api/ratings/pending-reminders
 * @access  Private
 */
exports.getPendingRatingReminders = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Find completed orders from 12-24 hours ago that haven't been rated or reminded
    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000);

    const completedOrders = await Order.find({
      customer: customerId,
      status: 'completed',
      completedAt: {
        $gte: twentyFourHoursAgo,
        $lte: twelveHoursAgo
      },
      ratingReminderScheduled: { $ne: true }
    }).populate('subOrders.cook', 'storeName name');

    // Filter out orders that have already been rated
    const ordersNeedingReminder = [];
    
    for (const order of completedOrders) {
      const existingRating = await OrderRating.findOne({ order: order._id });
      if (!existingRating) {
        ordersNeedingReminder.push(order);
      }
    }

    res.status(200).json({
      success: true,
      data: ordersNeedingReminder
    });

  } catch (error) {
    console.error('Error getting pending rating reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving pending reminders',
      error: error.message
    });
  }
};

/**
 * @desc    Mark rating reminder as shown for an order
 * @route   POST /api/ratings/order/:orderId/reminder-shown
 * @access  Private
 */
exports.markReminderShown = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    // Verify order ownership
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== customerId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Mark reminder as shown
    order.ratingReminderScheduled = true;
    order.ratingReminderSentAt = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Reminder marked as shown'
    });

  } catch (error) {
    console.error('Error marking reminder as shown:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking reminder',
      error: error.message
    });
  }
};

/**
 * @desc    Cook reply to a rating
 * @route   POST /api/ratings/:ratingId/reply
 * @access  Private (Cook who received the rating)
 */
exports.replyToRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { reply } = req.body;
    const cookId = req.user.id;

    if (!reply || reply.trim() === '') {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }

    const rating = await OrderRating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({ success: false, message: 'Rating not found' });
    }

    // Verify ownership
    if (rating.cook.toString() !== cookId) {
      return res.status(403).json({ success: false, message: 'You can only reply to ratings received by you' });
    }

    rating.cookReply = reply;
    rating.cookReplyAt = new Date();
    await rating.save();

    // NOTIFY FOODIE: Cook replied to your review
    const { createNotification } = require('../utils/notifications');
    try {
      await createNotification({
        userId: rating.customer,
        role: 'foodie',
        title: 'Review Reply Received',
        message: 'A cook has replied to your review.',
        type: 'rating_reply',
        entityType: 'review',
        entityId: rating._id,
        deepLink: `/orders/${rating.order}`
      });
    } catch (notifErr) {
      console.error('Error sending rating reply notification to foodie:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Reply submitted successfully',
      data: rating
    });
  } catch (error) {
    console.error('Error replying to rating:', error);
    res.status(500).json({ success: false, message: 'Error submitting reply' });
  }
};

/**
 * @desc    Get reviews for a specific cook (for Cook Profile Reviews tab)
 * @route   GET /api/ratings/cook/:cookId/reviews
 * @access  Public
 */
exports.getCookReviews = async (req, res) => {
  try {
    const { cookId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(cookId)) {
      return res.status(400).json({ success: false, message: 'Invalid cook ID' });
    }

    // FIX: Search by cook ID directly, not just by dishOffer
    // This works for both old orders (no dishOffer) and new orders (with dishOffer)
    const totalReviews = await OrderRating.countDocuments({
      cook: cookId
    });

    if (totalReviews === 0) {
      return res.status(200).json({
        success: true,
        data: {
          reviews: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalReviews: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    }

    const ratings = await OrderRating.find({
      cook: cookId
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name profilePhoto')
      .populate('order', 'createdAt')
      .lean();

    // Format reviews for mobile
    const reviews = ratings.map(rating => ({
      _id: rating._id,
      orderId: rating.order._id || rating.order,
      reviewer: {
        name: rating.customer?.name || 'Anonymous',
        avatar: rating.customer?.profilePhoto || null
      },
      overallRating: rating.overallRating || 0,
      overallReview: rating.overallReview || '',
      dishRatings: rating.dishRatings.map(dr => ({
        dishName: dr.product?.name || 'Dish',
        dishId: dr.product?._id || dr.product || null,
        dishOfferId: dr.dishOffer || null,
        rating: dr.rating
      })),
      createdAt: rating.order?.createdAt || rating.createdAt
    }));

    const totalPages = Math.ceil(totalReviews / limit);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages,
          totalReviews,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error getting cook reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cook reviews',
      error: error.message
    });
  }
};

/**
 * @desc    Get rating summary for a cook (average, total, star distribution)
 * @route   GET /api/ratings/cook/:cookId/summary
 * @access  Public
 */
exports.getCookRatingSummary = async (req, res) => {
  try {
    const { cookId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cookId)) {
      return res.status(400).json({ success: false, message: 'Invalid cook ID' });
    }

    // FIX: Calculate from OrderRating by cook ID directly
    // This works for both old and new orders
    const starStats = await OrderRating.aggregate([
      { $match: { cook: new mongoose.Types.ObjectId(cookId) } },
      { $unwind: '$dishRatings' },
      { $group: {
        _id: '$dishRatings.rating',
        count: { $sum: 1 }
      }},
      { $sort: { _id: -1 } }
    ]);

    // Build star distribution map
    const starDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    starStats.forEach(stat => {
      starDistribution[stat._id] = stat.count;
    });

    // Calculate total and average
    const totalReviews = starStats.reduce((sum, stat) => sum + stat.count, 0);
    const averageRating = totalReviews > 0
      ? parseFloat((starStats.reduce((sum, stat) => sum + (stat._id * stat.count), 0) / totalReviews).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        averageRating,
        totalReviews,
        starDistribution
      }
    });

  } catch (error) {
    console.error('Error getting cook rating summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving rating summary',
      error: error.message
    });
  }
};

/**
 * @desc    Check rating status for multiple orders (batch)
 * @route   POST /api/ratings/batch-status
 * @access  Private
 */
exports.getBatchRatingStatus = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const customerId = req.user.id;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of order IDs' 
      });
    }

    // Validate all order IDs
    for (const orderId of orderIds) {
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid order ID: ${orderId}` 
        });
      }
    }

    // Get all orders and verify ownership
    const orders = await Order.find({
      _id: { $in: orderIds },
      customer: customerId
    }).select('_id status');

    const orderMap = new Map();
    orders.forEach(order => {
      orderMap.set(order._id.toString(), order);
    });

    // Get all existing ratings for these orders
    const ratings = await OrderRating.find({
      order: { $in: orderIds }
    }).select('order editCount createdAt').lean();

    const ratingMap = new Map();
    ratings.forEach(rating => {
      ratingMap.set(rating.order.toString(), rating);
    });

    // Build status response
    const statuses = orderIds.map(orderId => {
      const order = orderMap.get(orderId);
      const rating = ratingMap.get(orderId);

      if (!order) {
        return {
          orderId,
          canRate: false,
          isRated: false,
          canEdit: false,
          reason: 'Order not found'
        };
      }

      let canEdit = false;
      let canRate = order.status === 'completed' || order.status === 'delivered';
      
      if (rating) {
        // Check edit window
        const EDIT_WINDOW_DAYS = 7;
        const editWindowEnd = new Date(rating.createdAt);
        editWindowEnd.setDate(editWindowEnd.getDate() + EDIT_WINDOW_DAYS);
        const isWithinWindow = new Date() <= editWindowEnd;
        const canEditCount = rating.editCount < 2;
        canEdit = isWithinWindow && canEditCount;
      }

      return {
        orderId,
        isRated: !!rating,
        canRate,
        canEdit,
        rating: rating || null
      };
    });

    res.status(200).json({
      success: true,
      data: statuses
    });

  } catch (error) {
    console.error('Error getting batch rating status:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving rating statuses',
      error: error.message
    });
  }
};

module.exports = exports;
