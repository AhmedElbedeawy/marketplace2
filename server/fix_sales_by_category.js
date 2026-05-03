// This file contains the fixed getCookSalesByCategory function
// Replace lines 706-769 in orderController.js with this content

// Get cook's sales by category (for dashboard)
// Uses DishOffer → AdminDish → Category mapping (current order structure)
const getCookSalesByCategory = async (req, res) => {
  try {
    // SubOrder.cook stores User._id as string
    const userId = req.user._id.toString();
    const DishOffer = require('../models/DishOffer');
    const AdminDish = require('../models/AdminDish');
    
    // Get all DishOffers for this cook with their AdminDish and Category
    // DishOffer.cook is also stored as string
    const allDishOffers = await DishOffer.find({}).lean();
    const cookOffers = allDishOffers.filter(offer => offer.cook?.toString() === userId);
    
    // Get AdminDish IDs for this cook's offers
    const adminDishIds = cookOffers
      .map(offer => offer.adminDishId)
      .filter(id => id);
    
    // Fetch AdminDishes with categories
    const adminDishes = await AdminDish.find({ _id: { $in: adminDishIds } })
      .populate('category', 'name')
      .lean();
    
    // Create maps
    const adminDishCategoryMap = {};
    adminDishes.forEach(dish => {
      if (dish.category) {
        adminDishCategoryMap[dish._id.toString()] = dish.category.name || 'Uncategorized';
      }
    });
    
    const offerToAdminDishMap = {};
    cookOffers.forEach(offer => {
      offerToAdminDishMap[offer._id.toString()] = offer.adminDishId?.toString();
    });
    
    // Get all orders for this cook (last 30 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const allOrders = await Order.find({}).lean();
    const orders = allOrders.filter(order => 
      order.subOrders?.some(sub => sub.cook?.toString() === userId) &&
      new Date(order.createdAt) >= startDate
    );
    
    // Calculate sales by category
    const categoryData = {};
    
    orders.forEach(order => {
      order.subOrders.forEach(sub => {
        if (sub.cook.toString() === userId && sub.status !== 'cancelled') {
          sub.items.forEach(item => {
            let categoryName = 'Uncategorized';
            
            // Method 1: Try item.dishOffer → DishOffer → AdminDish → Category
            const dishOfferId = item.dishOffer?.toString();
            if (dishOfferId && offerToAdminDishMap[dishOfferId]) {
              const adminDishId = offerToAdminDishMap[dishOfferId];
              if (adminDishCategoryMap[adminDishId]) {
                categoryName = adminDishCategoryMap[adminDishId];
              }
            }
            // Method 2: Fallback to productSnapshot.category if available
            else if (item.productSnapshot?.category) {
              categoryName = item.productSnapshot.category;
            }
            
            if (!categoryData[categoryName]) {
              categoryData[categoryName] = 0;
            }
            categoryData[categoryName] += (item.price * item.quantity) || 0;
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
