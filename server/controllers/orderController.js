const { Order, SubOrder, OrderItem } = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
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
        cookItemsMap.set(product.cook._id.toString(), {
          cook: product.cook,
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
      
      subOrdersData.push({
        cook: cookId,
        pickupAddress: cookData.cook.pickupAddress || 'Address not provided',
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
    const orders = await Order.find({ customer: req.user._id })
      .populate('subOrders.cook', 'name storeName profilePhoto')
      .populate('subOrders.items.product', 'name price')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('subOrders.cook', 'name storeName profilePhoto pickupAddress')
      .populate('subOrders.items.product', 'name price');
      
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if user is owner or admin
    if (order.customer.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateSubOrderStatus,
  cancelOrder
};