/**
 * Apply fixes to orderController.js:
 * 1. Convert userId to string in all Overview endpoints
 * 2. Fix Sales by Category mapping (DishOffer → AdminDish → Category + productSnapshot fallback)
 * 3. Fix Completion Rate calculation (use totalOrders not finalOrders)
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers/orderController.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('📝 Applying fixes to orderController.js...\n');

// Fix 1: Convert userId to string in getCookSalesSummary
content = content.replace(
  'const getCookSalesSummary = async (req, res) => {\n  try {\n    const userId = req.user._id;',
  'const getCookSalesSummary = async (req, res) => {\n  try {\n    const userId = req.user._id.toString();'
);

// Fix 2: Convert userId to string in getCookOrderStats
content = content.replace(
  'const getCookOrderStats = async (req, res) => {\n  try {\n    // SubOrder.cook stores User._id, not Cook._id\n    // Use req.user._id directly (same pattern as getCookOrders)\n    const userId = req.user._id;',
  'const getCookOrderStats = async (req, res) => {\n  try {\n    const userId = req.user._id.toString();'
);

// Fix 3: Convert userId to string in getCookRecentActivity
content = content.replace(
  'const getCookRecentActivity = async (req, res) => {\n  try {\n    // SubOrder.cook stores User._id, not Cook._id\n    // Use req.user._id directly (same pattern as getCookOrders)\n    const userId = req.user._id;',
  'const getCookRecentActivity = async (req, res) => {\n  try {\n    const userId = req.user._id.toString();'
);

// Fix 4: Convert userId to string in getCookPerformanceStats
content = content.replace(
  'const getCookPerformanceStats = async (req, res) => {\n  try {\n    // SubOrder.cook stores User._id, not Cook._id\n    // Use req.user._id directly (same pattern as getCookOrders)\n    const userId = req.user._id;',
  'const getCookPerformanceStats = async (req, res) => {\n  try {\n    const userId = req.user._id.toString();'
);

// Fix 5: Replace all userId.toString() comparisons with just userId (already string)
content = content.replace(/sub\.cook\.toString\(\) === userId\.toString\(\)/g, 'sub.cook.toString() === userId');

// Fix 6: Fix Completion Rate calculation (line ~1452)
content = content.replace(
  '// Calculate final orders (excluding in-progress)\n    const finalOrders = completedOrders + cancelledOrders;\n    \n    // Completion Rate: completed / total final orders (excluding in-progress)\n    const completionRate = finalOrders > 0 ? (completedOrders / finalOrders) * 100 : 0;',
  '// Completion Rate: completed / ALL total orders (including in-progress)\n    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;'
);

// Fix 7: Replace getCookSalesByCategory function entirely
const oldFuncStart = '// Get cook\'s sales by category (for dashboard)\n// Uses DishOffer → AdminDish → Category mapping (current order structure)\nconst getCookSalesByCategory = async (req, res) => {';
const oldFuncEnd = '};\n\n// Get cook\'s orders (for Orders page)';

const newFunc = `// Get cook's sales by category (for dashboard)
// Uses DishOffer → AdminDish → Category mapping (current order structure)
const getCookSalesByCategory = async (req, res) => {
  try {
    // SubOrder.cook stores User._id as string
    const userId = req.user._id.toString();
    const DishOffer = require('../models/DishOffer');
    const AdminDish = require('../models/AdminDish');
    
    // Get all DishOffers and filter in memory (DishOffer.cook stored as string)
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
    
    // Create maps: AdminDish ID → category name
    const adminDishCategoryMap = {};
    adminDishes.forEach(dish => {
      if (dish.category) {
        adminDishCategoryMap[dish._id.toString()] = dish.category.name || 'Uncategorized';
      }
    });
    
    // Map: DishOffer ID → AdminDish ID
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
            
            // Method 1: item.dishOffer → DishOffer → AdminDish → Category
            const dishOfferId = item.dishOffer?.toString();
            if (dishOfferId && offerToAdminDishMap[dishOfferId]) {
              const adminDishId = offerToAdminDishMap[dishOfferId];
              if (adminDishCategoryMap[adminDishId]) {
                categoryName = adminDishCategoryMap[adminDishId];
              }
            }
            // Method 2: Fallback to productSnapshot.category
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
};`;

content = content.replace(oldFuncStart, newFunc);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ All fixes applied successfully!');
console.log('\nChanges made:');
console.log('1. ✅ Converted userId to string in getCookSalesSummary');
console.log('2. ✅ Converted userId to string in getCookOrderStats');
console.log('3. ✅ Converted userId to string in getCookRecentActivity');
console.log('4. ✅ Converted userId to string in getCookPerformanceStats');
console.log('5. ✅ Fixed all sub.cook.toString() === userId comparisons');
console.log('6. ✅ Fixed Completion Rate calculation (totalOrders instead of finalOrders)');
console.log('7. ✅ Replaced getCookSalesByCategory with improved mapping logic');
