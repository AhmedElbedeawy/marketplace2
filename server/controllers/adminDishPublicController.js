const AdminDish = require('../models/AdminDish');
const DishOffer = require('../models/DishOffer');

/**
 * Public Consumer Endpoints for AdminDish (Phase 3)
 * These endpoints are used by the web and mobile consumer apps
 */

/**
 * Get public admin dishes for consumers
 * GET /api/admin-dishes/public?active=true&category=xxx&search=xxx
 */
const getPublicAdminDishes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      popular 
    } = req.query;
    
    // Build filter - only active dishes by default
    const filter = { isActive: true };
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (popular !== undefined) {
      filter.isPopular = popular === 'true';
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [dishes, total] = await Promise.all([
      AdminDish.find(filter)
        .sort({ isPopular: -1, nameEn: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('category', 'nameEn nameAr icons'),
      AdminDish.countDocuments(filter)
    ]);
    
    res.json({
      dishes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get featured admin dishes for Home page
 * GET /api/admin-dishes/public/featured?limit=10
 */
const getFeaturedAdminDishes = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get popular dishes only (as intended)
    const dishes = await AdminDish.find({ 
      isActive: true,
      isPopular: true 
    })
      .sort({ isPopular: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('category', 'nameEn nameAr icons');
    
    console.log('✅ === FEATURED DISHES ===');
    console.log(`Total: ${dishes.length} dishes returned`);
    dishes.forEach((dish, idx) => {
      console.log(`\n  [${idx + 1}] ${dish.nameEn} (${dish.nameAr})`);
      console.log(`      ID: ${dish._id}`);
      console.log(`      Image URL: ${dish.imageUrl || 'NULL'}`);
      console.log(`      isPopular: ${dish.isPopular}`);
      console.log(`      Category: ${dish.category?.nameEn || 'N/A'}`);
    });
    console.log('✅ === END FEATURED DISHES ===\n');
    
    res.json(dishes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get admin dishes with offer statistics
 * GET /api/admin-dishes/public/with-stats
 * Returns AdminDish + { offerCount, minPrice }
 */
const getAdminDishWithStats = async (req, res) => {
  try {
    const { limit = 50, category } = req.query;
    
    console.log('🔄 AdminDishPublicController: getAdminDishWithStats called', { limit, category });
    
    // Build filter
    const filter = { isActive: true };
    if (category) {
      filter.category = category;
    }
    
    // Get all active admin dishes
    const dishes = await AdminDish.find(filter)
      .sort({ isPopular: -1, nameEn: 1 })
      .limit(parseInt(limit))
      .populate('category', 'nameEn nameAr icons');
    
    console.log('📊 AdminDishPublicController: Found dishes:', dishes.length);
    
    // For each dish, calculate offer count and min price
    const dishIds = dishes.map(d => d._id);
    
    // Aggregate offers by adminDishId
    const offerStats = await DishOffer.aggregate([
      {
        $match: {
          adminDishId: { $in: dishIds },
          isActive: true,
          stock: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$adminDishId',
          offerCount: { $sum: 1 },
          minPrice: { $min: '$price' }
        }
      }
    ]);
    
    // Create a map for quick lookup
    const statsMap = {};
    offerStats.forEach(stat => {
      statsMap[stat._id.toString()] = {
        offerCount: stat.offerCount,
        minPrice: stat.minPrice
      };
    });
    
    // Merge stats into dishes
    const result = dishes.map(dish => {
      const stats = statsMap[dish._id.toString()];
      return {
        ...dish.toObject(),
        offerCount: stats ? stats.offerCount : 0,
        minPrice: stats ? stats.minPrice : null
      };
    });
    
    console.log('✅ AdminDishPublicController: Returning result with stats', {
      totalDishes: result.length,
      dishesWithOffers: result.filter(d => d.offerCount > 0).length,
      dishesWithoutOffers: result.filter(d => d.offerCount === 0).length,
      sampleDish: result[0] ? {
        _id: result[0]._id,
        nameEn: result[0].nameEn,
        nameAr: result[0].nameAr,
        imageUrl: result[0].imageUrl,
        offerCount: result[0].offerCount,
        minPrice: result[0].minPrice,
        isActive: result[0].isActive
      } : null
    });
    
    // DEBUG: List all dishes being returned with FULL details
    console.log('📋 === ALL DISHES RETURNED BY with-stats ===');
    result.forEach((dish, idx) => {
      console.log(`\n  [${idx + 1}] Dish: ${dish.nameEn} (${dish.nameAr})`);
      console.log(`      ID: ${dish._id}`);
      console.log(`      Image URL: ${dish.imageUrl || 'NULL'}`);
      console.log(`      Offer Count: ${dish.offerCount}`);
      console.log(`      Min Price: ${dish.minPrice}`);
      console.log(`      Category: ${dish.category?.nameEn || 'N/A'}`);
      console.log(`      isActive: ${dish.isActive}`);
      console.log(`      isPopular: ${dish.isPopular}`);
    });
    console.log('📋 === END DISH LIST ===\n');
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get single public admin dish by ID
 * GET /api/admin-dishes/public/:id
 */
const getPublicAdminDishById = async (req, res) => {
  try {
    const dish = await AdminDish.findOne({ 
      _id: req.params.id,
      isActive: true 
    })
      .populate('category', 'nameEn nameAr icons');
    
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' });
    }
    
    res.json(dish);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicAdminDishes,
  getFeaturedAdminDishes,
  getAdminDishWithStats,
  getPublicAdminDishById
};
