const AdminDish = require('../models/AdminDish');
const DishOffer = require('../models/DishOffer');
const { computePrepTimeMinutes } = require('../utils/prepTimeUtils');

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
        $lookup: {
          from: 'cooks',
          localField: 'cook',
          foreignField: '_id',
          as: 'cookData'
        }
      },
      {
        $unwind: {
          path: '$cookData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          adminDishId: 1,
          price: 1,
          variants: 1,
          fulfillmentModes: 1,
          prepReadyConfig: 1,
          'cookData.isTopRated': 1,
          'cookData.countryCode': 1
        }
      }
    ]);
    
    // Post-process offers to compute accurate prep times using PrepTimeUtils logic
    const offersByDish = {};
    offerStats.forEach(offer => {
      const dishId = offer.adminDishId.toString();
      if (!offersByDish[dishId]) {
        offersByDish[dishId] = [];
      }
      
      // Compute exact prep time using same logic as Dish Profile
      const countryCode = offer.cookData?.countryCode || country;
      const prepTimeMinutes = computePrepTimeMinutes(offer.prepReadyConfig, countryCode);
      
      offersByDish[dishId].push({
        ...offer,
        computedPrepTime: prepTimeMinutes,
        isTopRated: offer.cookData?.isTopRated || false
      });
    });
    
    // Aggregate stats per dish
    const statsMap = {};
    Object.keys(offersByDish).forEach(dishId => {
      const offers = offersByDish[dishId];
      
      const offerCount = offers.length;
      const minPrice = Math.min(...offers.map(o => o.price));
      const variantsCount = offers.reduce((sum, o) => {
        return sum + (Array.isArray(o.variants) && o.variants.length > 0 ? o.variants.length : 1);
      }, 0);
      
      const hasDelivery = offers.some(o => o.fulfillmentModes?.delivery === true);
      const hasPickup = offers.some(o => o.fulfillmentModes?.pickup === true);
      const hasTopRatedOffer = offers.some(o => o.isTopRated === true);
      const minPrepTime = Math.min(...offers.map(o => o.computedPrepTime));
      
      statsMap[dishId] = {
        offerCount,
        minPrice,
        variantsCount,
        hasDelivery,
        hasPickup,
        hasTopRatedOffer,
        minPrepTime
      };
    });
    
    const result = dishes.map(dish => {
      const stats = statsMap[dish._id.toString()];
      return {
        ...dish.toObject(),
        offerCount: stats ? stats.offerCount : 0,
        minPrice: stats ? stats.minPrice : null,
        variantsCount: stats ? stats.variantsCount : 0,
        // Offer-level filter aggregates for Menu filtering
        hasDelivery: stats ? stats.hasDelivery : false,
        hasPickup: stats ? stats.hasPickup : false,
        hasTopRatedOffer: stats ? stats.hasTopRatedOffer : false,
        minPrepTime: stats ? stats.minPrepTime : 60
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
      console.log(`      hasDelivery: ${dish.hasDelivery}`);
      console.log(`      hasPickup: ${dish.hasPickup}`);
      console.log(`      hasTopRatedOffer: ${dish.hasTopRatedOffer}`);
      console.log(`      minPrepTime: ${dish.minPrepTime}`);
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

// Search dishes by keyword (bilingual, fuzzy via regex)
const searchAdminDishes = async (req, res) => {
  try {
    const { q = '', country = 'SA', limit = 8 } = req.query;
    const trimmed = q.trim();
    if (!trimmed) return res.json([]);

    // Escape special regex chars to prevent injection
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const dishes = await AdminDish.find({
      isActive: true,
      $or: [
        { nameEn: regex },
        { nameAr: regex },
        { descriptionEn: regex },
        { descriptionAr: regex }
      ]
    })
      .limit(parseInt(limit))
      .populate('category', 'nameEn nameAr');

    res.json(dishes.map(d => ({
      _id: d._id,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      imageUrl: d.imageUrl || '',
      categoryNameEn: d.category?.nameEn || '',
      categoryNameAr: d.category?.nameAr || ''
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicAdminDishes,
  getFeaturedAdminDishes,
  getAdminDishWithStats,
  getPublicAdminDishById,
  searchAdminDishes
};
