const AdminDish = require('../models/AdminDish');
const DishOffer = require('../models/DishOffer');

const getPublicAdminDishes = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, popular } = req.query;
    const filter = { isActive: true };
    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    if (popular !== undefined) filter.isPopular = popular === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [dishes, total] = await Promise.all([
      AdminDish.find(filter)
        .sort({ isPopular: -1, nameEn: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('category', 'nameEn nameAr icons'),
      AdminDish.countDocuments(filter)
    ]);
    
    res.json({ dishes, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeaturedAdminDishes = async (req, res) => {
  try {
    const { limit = 10, country = 'SA' } = req.query;
    
    const dishIdsWithOffers = await DishOffer.distinct('adminDishId', {
      isActive: true,
      stock: { $gt: 0 },
      countryCode: country
    });
    
    const dishes = await AdminDish.find({ 
      isActive: true,
      isPopular: true,
      _id: { $in: dishIdsWithOffers }
    })
      .sort({ isPopular: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('category', 'nameEn nameAr icons');
    
    // Get minPrice from ALL active offers (ignore stock/country for pricing display)
    const dishIds = dishes.map(d => d._id);
    const offerStats = await DishOffer.aggregate([
      {
        $match: {
          adminDishId: { $in: dishIds },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$adminDishId',
          minPrice: { $min: '$price' }
        }
      }
    ]);
    
    const priceMap = {};
    offerStats.forEach(stat => {
      priceMap[stat._id.toString()] = stat.minPrice;
    });
    
    const result = dishes.map(dish => ({
      ...dish.toObject(),
      minPrice: priceMap[dish._id.toString()] || null
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminDishWithStats = async (req, res) => {
  try {
    const { limit = 50, category, country = 'SA' } = req.query;
    
    const filter = { isActive: true };
    if (category) filter.category = category;
    
    const dishes = await AdminDish.find(filter)
      .sort({ isPopular: -1, nameEn: 1 })
      .limit(parseInt(limit))
      .populate('category', 'nameEn nameAr icons');
    
    const dishIds = dishes.map(d => d._id);
    
    const offerStats = await DishOffer.aggregate([
      {
        $match: {
          adminDishId: { $in: dishIds },
          isActive: true,
          stock: { $gt: 0 },
          countryCode: country
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
    
    const statsMap = {};
    offerStats.forEach(stat => {
      statsMap[stat._id.toString()] = {
        offerCount: stat.offerCount,
        minPrice: stat.minPrice
      };
    });
    
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
      dishesWithOffers: result.filter(d => d.offerCount > 0).length
    });
    
    console.log('📋 === ALL DISHES RETURNED BY with-stats ===');
    result.forEach((dish, idx) => {
      console.log(`\n  [${idx + 1}] Dish: ${dish.nameEn} (${dish.nameAr})`);
      console.log(`      ID: ${dish._id}`);
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

const getPublicAdminDishById = async (req, res) => {
  try {
    const dish = await AdminDish.findById(req.params.id).populate('category', 'nameEn nameAr icons');
    if (!dish) return res.status(404).json({ message: 'Dish not found' });
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
