const OrderRating = require('../models/OrderRating');
const { Order } = require('../models/Order');
const Product = require('../models/Product');
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

    // Find the order and populate subOrders
    const order = await Order.findById(orderId)
      .populate('subOrders.items.product')
      .populate('subOrders.cook');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // RULE 1: Verify order belongs to the current user
    if (order.customer.toString() !== customerId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only rate your own orders' 
      });
    }

    // RULE 2: Verify order is completed
    if (order.status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'You can only rate completed orders' 
      });
    }

    // Get the cook ID from the first subOrder (assuming single cook per order for now)
    // For multi-cook orders, this would need to be more sophisticated
    const cookId = order.subOrders[0]?.cook?._id || order.subOrders[0]?.cook;

    if (!cookId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cook information not found for this order' 
      });
    }

    // Verify all rated products are in this order
    const orderProductIds = new Set();
    order.subOrders.forEach(subOrder => {
      subOrder.items.forEach(item => {
        const productId = item.product._id || item.product;
        orderProductIds.add(productId.toString());
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
 */
async function updateDishAggregates(dishRatings) {
  for (const item of dishRatings) {
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
  }
}

/**
 * Helper: Update cook rating aggregates (derived from all their dishes)
 */
async function updateCookAggregates(cookId) {
  // Get all products (dishes) by this cook
  const cookProducts = await Product.find({ cook: cookId }).select('_id');
  const productIds = cookProducts.map(p => p._id);

  if (productIds.length === 0) {
    return;
  }

  // Aggregate all ratings for all dishes by this cook
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
    await User.findByIdAndUpdate(cookId, {
      cookRatingAvg: parseFloat(avgRating.toFixed(2)),
      cookRatingCount: count
    });
  } else {
    // No ratings yet
    await User.findByIdAndUpdate(cookId, {
      cookRatingAvg: 0,
      cookRatingCount: 0
    });
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

module.exports = exports;
