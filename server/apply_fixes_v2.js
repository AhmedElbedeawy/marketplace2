/**
 * Apply fixes to orderController.js safely
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers/orderController.js');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log(`📝 Processing ${lines.length} lines...\n`);

let inSalesByCategory = false;
let salesByCategoryStart = -1;
let salesByCategoryEnd = -1;
let braceCount = 0;

// Find the function boundaries
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Get cook\'s sales by category (for dashboard)')) {
    salesByCategoryStart = i;
    inSalesByCategory = true;
    console.log(`📍 Found getCookSalesByCategory at line ${i + 1}`);
  }
  
  if (inSalesByCategory) {
    braceCount += (lines[i].match(/{/g) || []).length;
    braceCount -= (lines[i].match(/}/g) || []).length;
    
    if (braceCount === 0 && lines[i].trim() === '};') {
      salesByCategoryEnd = i;
      console.log(`📍 Function ends at line ${i + 1}`);
      break;
    }
  }
}

if (salesByCategoryStart === -1 || salesByCategoryEnd === -1) {
  console.error('❌ Could not find function boundaries');
  process.exit(1);
}

// New function
const newFunction = [
  '// Get cook\'s sales by category (for dashboard)',
  '// Uses DishOffer → AdminDish → Category mapping (current order structure)',
  'const getCookSalesByCategory = async (req, res) => {',
  '  try {',
  '    // SubOrder.cook stores User._id as string',
  '    const userId = req.user._id.toString();',
  '    const DishOffer = require(\'../models/DishOffer\');',
  '    const AdminDish = require(\'../models/AdminDish\');',
  '    ',
  '    // Get all DishOffers and filter in memory (DishOffer.cook stored as string)',
  '    const allDishOffers = await DishOffer.find({}).lean();',
  '    const cookOffers = allDishOffers.filter(offer => offer.cook?.toString() === userId);',
  '    ',
  '    // Get AdminDish IDs for this cook\'s offers',
  '    const adminDishIds = cookOffers',
  '      .map(offer => offer.adminDishId)',
  '      .filter(id => id);',
  '    ',
  '    // Fetch AdminDishes with categories',
  '    const adminDishes = await AdminDish.find({ _id: { $in: adminDishIds } })',
  '      .populate(\'category\', \'name\')',
  '      .lean();',
  '    ',
  '    // Create maps: AdminDish ID → category name',
  '    const adminDishCategoryMap = {};',
  '    adminDishes.forEach(dish => {',
  '      if (dish.category) {',
  '        adminDishCategoryMap[dish._id.toString()] = dish.category.name || \'Uncategorized\';',
  '      }',
  '    });',
  '    ',
  '    // Map: DishOffer ID → AdminDish ID',
  '    const offerToAdminDishMap = {};',
  '    cookOffers.forEach(offer => {',
  '      offerToAdminDishMap[offer._id.toString()] = offer.adminDishId?.toString();',
  '    });',
  '    ',
  '    // Get all orders for this cook (last 30 days)',
  '    const startDate = new Date();',
  '    startDate.setDate(startDate.getDate() - 30);',
  '    ',
  '    const allOrders = await Order.find({}).lean();',
  '    const orders = allOrders.filter(order => ',
  '      order.subOrders?.some(sub => sub.cook?.toString() === userId) &&',
  '      new Date(order.createdAt) >= startDate',
  '    );',
  '    ',
  '    // Calculate sales by category',
  '    const categoryData = {};',
  '    ',
  '    orders.forEach(order => {',
  '      order.subOrders.forEach(sub => {',
  '        if (sub.cook.toString() === userId && sub.status !== \'cancelled\') {',
  '          sub.items.forEach(item => {',
  '            let categoryName = \'Uncategorized\';',
  '            ',
  '            // Method 1: item.dishOffer → DishOffer → AdminDish → Category',
  '            const dishOfferId = item.dishOffer?.toString();',
  '            if (dishOfferId && offerToAdminDishMap[dishOfferId]) {',
  '              const adminDishId = offerToAdminDishMap[dishOfferId];',
  '              if (adminDishCategoryMap[adminDishId]) {',
  '                categoryName = adminDishCategoryMap[adminDishId];',
  '              }',
  '            }',
  '            // Method 2: Fallback to productSnapshot.category',
  '            else if (item.productSnapshot?.category) {',
  '              categoryName = item.productSnapshot.category;',
  '            }',
  '            ',
  '            if (!categoryData[categoryName]) {',
  '              categoryData[categoryName] = 0;',
  '            }',
  '            categoryData[categoryName] += (item.price * item.quantity) || 0;',
  '          });',
  '        }',
  '      });',
  '    });',
  '    ',
  '    // Format for response',
  '    const salesByCategory = Object.keys(categoryData).map(category => ({',
  '      category,',
  '      sales: categoryData[category]',
  '    })).sort((a, b) => b.sales - a.sales);',
  '    ',
  '    res.json(salesByCategory);',
  '  } catch (error) {',
  '    res.status(500).json({ message: error.message });',
  '  }',
  '};'
];

// Replace the function
const newLines = [
  ...lines.slice(0, salesByCategoryStart),
  ...newFunction,
  ...lines.slice(salesByCategoryEnd + 1)
];

// Apply other fixes
let result = newLines.join('\n');

// Fix 1: userId.toString() in getCookSalesSummary
result = result.replace(
  'const getCookSalesSummary = async (req, res) => {\n  try {\n    const userId = req.user._id;',
  'const getCookSalesSummary = async (req, res) => {\n  try {\n    const userId = req.user._id.toString();'
);

// Fix 2: userId.toString() in getCookOrderStats  
result = result.replace(
  'const getCookOrderStats = async (req, res) => {\n  try {\n    // SubOrder.cook stores User._id, not Cook._id\n    // Use req.user._id directly (same pattern as getCookOrders)\n    const userId = req.user._id;',
  'const getCookOrderStats = async (req, res) => {\n  try {\n    const userId = req.user._id.toString();'
);

// Fix 3: userId.toString() in getCookRecentActivity
result = result.replace(
  'const getCookRecentActivity = async (req, res) => {\n  try {\n    // SubOrder.cook stores User._id, not Cook._id\n    // Use req.user._id directly (same pattern as getCookOrders)\n    const userId = req.user._id;',
  'const getCookRecentActivity = async (req, res) => {\n  try {\n    const userId = req.user._id.toString();'
);

// Fix 4: userId.toString() in getCookPerformanceStats
result = result.replace(
  'const getCookPerformanceStats = async (req, res) => {\n  try {\n    // SubOrder.cook stores User._id, not Cook._id\n    // Use req.user._id directly (same pattern as getCookOrders)\n    const userId = req.user._id;',
  'const getCookPerformanceStats = async (req, res) => {\n  try {\n    const userId = req.user._id.toString();'
);

// Fix 5: All userId.toString() comparisons
result = result.replace(/sub\.cook\.toString\(\) === userId\.toString\(\)/g, 'sub.cook.toString() === userId');

// Fix 6: Completion rate calculation
result = result.replace(
  '// Calculate final orders (excluding in-progress)\n    const finalOrders = completedOrders + cancelledOrders;\n    \n    // Completion Rate: completed / total final orders (excluding in-progress)\n    const completionRate = finalOrders > 0 ? (completedOrders / finalOrders) * 100 : 0;',
  '// Completion Rate: completed / ALL total orders (including in-progress)\n    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;'
);

fs.writeFileSync(filePath, result, 'utf8');

console.log('✅ All fixes applied successfully!');
console.log(`📊 Original: ${lines.length} lines, New: ${newLines.length} lines`);
