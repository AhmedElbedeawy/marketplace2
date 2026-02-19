const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const Cook = require('../models/Cook');
const DishOffer = require('../models/DishOffer');
const Address = require('../models/Address');
const Joi = require('joi');
const { getDistance, isValidCoordinate } = require('../utils/geo');
const { createNotification } = require('../utils/notifications');

// Create a new product
const createProduct = async (req, res) => {
  try {
    // Check if user is a cook
    if (!req.user.isCook) {
      return res.status(403).json({ 
        message: 'Only cooks can create products' 
      });
    }

    const schema = Joi.object({
      category: Joi.string().required(),
      name: Joi.string().min(1).max(100).required(),
      description: Joi.string().required(),
      price: Joi.number().min(0),
      stock: Joi.number().min(0),
      portionSize: Joi.string(),
      variants: Joi.string(),
      prepTime: Joi.number().min(1).required(),
      photoUrl: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      notes: Joi.string().optional(),
      countryCode: Joi.string().optional() // Allow countryCode from body
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { category, name, description, photoUrl, isActive, notes, prepTime, countryCode: bodyCountryCode } = value;
    
    // ALLOWED_COUNTRIES enum
    const ALLOWED_COUNTRIES = ['SA', 'EG', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'SY'];
    
    // Get countryCode from body, then header, then default to 'SA'
    let incomingCountry = bodyCountryCode || req.headers['x-country-code'] || 'SA';
    incomingCountry = incomingCountry.toUpperCase();
    
    // Validate countryCode is in allowed enum
    if (!ALLOWED_COUNTRIES.includes(incomingCountry)) {
      return res.status(400).json({ message: 'Invalid country code. Allowed: ' + ALLOWED_COUNTRIES.join(', ') });
    }
    
    console.log('[createProduct] incomingCountry:', incomingCountry);
    console.log('[createProduct] bodyCountryCode:', bodyCountryCode);
    console.log('[createProduct] header x-country-code:', req.headers['x-country-code']);

    // Parse variants from JSON string
    let variants = [];
    let price = null;
    let stock = null;
    let portionSize = null;

    if (value.variants) {
      try {
        variants = JSON.parse(value.variants);
        const keys = variants.map(v => v.portionKey);
        if (new Set(keys).size !== keys.length) {
          return res.status(400).json({ message: 'Portion keys must be unique' });
        }
        price = variants[0].price;
        stock = variants[0].stock;
        portionSize = variants[0].portionKey;
      } catch (err) {
        return res.status(400).json({ message: 'Invalid variants JSON' });
      }
    } else if (value.price !== undefined && value.stock !== undefined) {
      price = value.price;
      stock = value.stock;
      portionSize = value.portionSize || 'medium';
      variants = [{
        portionKey: portionSize,
        portionLabel: portionSize,
        price,
        stock
      }];
    } else {
      return res.status(400).json({ message: 'Either variants or (price + stock) must be provided' });
    }

    const product = await Product.create({
      cook: req.user._id,
      category,
      name,
      description,
      price,
      stock,
      portionSize,
      variants,
      prepTime,
      photoUrl,
      isActive,
      notes,
      countryCode: incomingCountry.toUpperCase()
    });
    
    console.log('[createProduct] Product created with countryCode:', product.countryCode, '_id:', product._id);

    // Notify users who have favorited this cook
    try {
      // Get cook details for notification
      const cook = await User.findById(req.user._id).select('storeName countryCode');
      
      // Find all users who have favorited this cook
      const favoritingUsers = await User.find({
        'favorites.cooks': req.user._id,
        'notificationSettings.favoriteCookNotifications': true
      }).select('_id notificationSettings');

      // Send notification to each user
      const notifications = favoritingUsers.map(user =>
        createNotification({
          userId: user._id,
          role: 'customer',
          title: 'New Dish from Your Favorite Cook!',
          message: `${cook.storeName || 'A cook you follow'} just added a new dish: ${name}`,
          type: 'dish',
          entityType: 'dish',
          entityId: product._id,
          deepLink: `/cook/${req.user._id}/menu`,
          countryCode: user.countryCode
        })
      );

      await Promise.all(notifications);
      console.log(`New dish notification sent to ${favoritingUsers.length} users`);
    } catch (notificationError) {
      // Log but don't fail the product creation
      console.error('Error sending new dish notifications:', notificationError.message);
    }

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all products with filtering and pagination
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    let filter = { isActive: true };
    
    // Stock visibility: only show products that have at least one variant with stock > 0 OR legacy stock > 0
    filter.$or = [
      { 'variants.stock': { $gt: 0 } },  // Any variant with stock > 0
      { variants: { $size: 0 }, stock: { $gt: 0 } },  // Legacy product with stock > 0
      { variants: { $exists: false }, stock: { $gt: 0 } }  // No variants field, use legacy stock
    ];
    
    const countryCode = req.headers['x-country-code'] || 'SA';
    filter.countryCode = countryCode.toUpperCase();
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.cook) {
      filter.cook = req.query.cook;
    }
    
    // Filter by prep time (Preparation Time)
    if (req.query.prepTime) {
      const maxPrepTime = parseInt(req.query.prepTime);
      if (!isNaN(maxPrepTime)) {
        filter.prepTime = { $lte: maxPrepTime };
      }
    }
    
    // Search functionality
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }
    
    // Sorting
    let sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort = { createdAt: -1 }; // Newest first
    }

    // Distance-based filtering (25km rule)
    let lat = parseFloat(req.query.lat);
    let lng = parseFloat(req.query.lng);

    // Get all valid cooks (active and non-zero coordinates)
    const validCooks = await Cook.find({
      status: 'active',
      countryCode: countryCode.toUpperCase(),
      'location.lat': { $ne: 0 },
      'location.lng': { $ne: 0 }
    });
    const validCookUserIds = validCooks.map(c => c.userId.toString());

    // If coordinates not provided in query, try to get from user's default address
    if (!lat || !lng) {
      if (req.user) {
        const defaultAddress = await Address.findOne({ 
          user: req.user._id, 
          isDefault: true, 
          isDeleted: false 
        });
        if (defaultAddress) {
          lat = defaultAddress.lat;
          lng = defaultAddress.lng;
        }
      }
    }

    if (isValidCoordinate(lat, lng)) {
      const nearbyCookIds = validCooks
        .filter(cook => {
          const distance = getDistance(lat, lng, cook.location.lat, cook.location.lng);
          return distance <= 25;
        })
        .map(cook => cook.userId.toString());

      filter.cook = { $in: nearbyCookIds };
    } else {
      // Even if no location provided, we MUST exclude cooks with invalid coordinates
      filter.cook = { $in: validCookUserIds };

      // If no location provided and no default address, but location is required
      if (req.query.requireLocation === 'true' || req.query.search || req.query.category) {
        return res.status(400).json({ 
          success: false, 
          message: 'Location required to show nearby dishes',
          errorCode: 'LOCATION_REQUIRED'
        });
      }
    }
    
    const products = await Product.find(filter)
      .populate('cook', 'name storeName profilePhoto')
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);
      
    const total = await Product.countDocuments(filter);
    
    res.json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single product
const getProductById = async (req, res) => {
  try {
    const countryCode = req.headers['x-country-code'] || 'SA';
    const product = await Product.findOne({
      _id: req.params.id,
      countryCode: countryCode.toUpperCase()
    })
      .populate('cook', 'name storeName profilePhoto storeStatus')
      .populate('category', 'name');
      
    if (!product) {
      return res.status(404).json({ message: 'Product not found in this country' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      description: Joi.string().optional(),
      price: Joi.number().min(0).optional(),
      stock: Joi.number().min(0).optional(),
      prepTime: Joi.number().min(1).optional(),
      photoUrl: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      notes: Joi.string().optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if product exists and belongs to user
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.cook.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...value },
      { new: true }
    );
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    // Check if product exists and belongs to user
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.cook.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Delete product
    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get popular dishes
const getPopularDishes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const countryCode = req.headers['x-country-code'] || 'SA';
    
    let filter = { 
      isPopular: true, 
      isActive: true,
      countryCode: countryCode.toUpperCase() 
    };

    let lat = parseFloat(req.query.lat);
    let lng = parseFloat(req.query.lng);

    // Get valid cooks
    const validCooks = await Cook.find({
      status: 'active',
      countryCode: countryCode.toUpperCase(),
      'location.lat': { $ne: 0 },
      'location.lng': { $ne: 0 }
    });
    const validCookUserIds = validCooks.map(c => c.userId.toString());

    // If coordinates not provided in query, try to get from user's default address
    if (!lat || !lng) {
      if (req.user) {
        const defaultAddress = await Address.findOne({ 
          user: req.user._id, 
          isDefault: true, 
          isDeleted: false 
        });
        if (defaultAddress) {
          lat = defaultAddress.lat;
          lng = defaultAddress.lng;
        }
      }
    }

    if (isValidCoordinate(lat, lng)) {
      const nearbyCookIds = validCooks
        .filter(cook => {
          const distance = getDistance(lat, lng, cook.location.lat, cook.location.lng);
          return distance <= 25;
        })
        .map(cook => cook.userId.toString());

      filter.cook = { $in: nearbyCookIds };
    } else {
      // Exclude invalid cooks even if no location provided
      filter.cook = { $in: validCookUserIds };

      // If no location provided and no default address, but location is required
      if (req.query.requireLocation === 'true') {
        return res.status(400).json({ 
          success: false, 
          message: 'Location required to show nearby dishes',
          errorCode: 'LOCATION_REQUIRED'
        });
      }
    }

    const products = await Product.find(filter)
      .populate('cook', 'name storeName profileImage rating')
      .populate('category', 'name')
      .limit(limit);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle popular status (Admin only)
const togglePopular = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can toggle popular status' });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Toggle popular status
    product.isPopular = !product.isPopular;
    await product.save();
    
    res.json({
      message: `Product marked as ${product.isPopular ? 'popular' : 'not popular'}`,
      product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get public statistics (Total dishes and Total cooks)
const getPublicStats = async (req, res) => {
  try {
    const countryCode = req.headers['x-country-code'] || 'SA';
    const upperCountry = countryCode.toUpperCase();
    
    // Get active cook IDs for this country
    const activeCooks = await Cook.find({ 
      status: 'active',
      countryCode: upperCountry
    }).select('_id');
    const activeCookIds = activeCooks.map(c => c._id);
    
    // Get active DishOffers from active cooks
    const activeOffers = await DishOffer.find({ 
      isActive: true,
      countryCode: upperCountry,
      cook: { $in: activeCookIds }
    }).select('variants');
    
    // Count dishes: each offer without variants = 1, with variants = variants.length
    let dishCount = 0;
    for (const offer of activeOffers) {
      if (offer.variants && offer.variants.length > 0) {
        dishCount += offer.variants.length;
      } else {
        dishCount += 1;
      }
    }
    
    // Count active Cooks
    const cookCount = activeCookIds.length;
    
    res.json({
      success: true,
      data: {
        totalDishes: dishCount,
        totalCooks: cookCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get offers by dish name (all cooks offering this dish)
const getOffersByDish = async (req, res) => {
  try {
    const { dishName } = req.params;
    const countryCode = req.headers['x-country-code'] || 'SA';
    
    // Find all products (offers) with this name
    const offers = await Product.find({ 
      name: { $regex: new RegExp(`^${dishName}$`, 'i') },
      isActive: true,
      countryCode: countryCode.toUpperCase()
    })
      .populate('cook', 'name storeName profilePhoto ratings ordersCount')
      .populate('category', 'name')
      .sort({ 'dishRatings.average': -1, price: 1 }); // Sort by rating, then price
    
    if (offers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No offers found for this dish' 
      });
    }
    
    res.json({
      success: true,
      dishName,
      offerCount: offers.length,
      offers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single offer by ID
const getOfferById = async (req, res) => {
  try {
    const { offerId } = req.params;
    const countryCode = req.headers['x-country-code'] || 'SA';
    
    const offer = await Product.findOne({
      _id: offerId,
      countryCode: countryCode.toUpperCase()
    })
      .populate('cook', 'name storeName profilePhoto ratings ordersCount bio area phone')
      .populate('category', 'name');
    
    if (!offer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Offer not found in this country' 
      });
    }
    
    if (!offer.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'This offer is no longer available' 
      });
    }
    
    res.json({
      success: true,
      offer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all offers from a specific kitchen
const getOffersByKitchen = async (req, res) => {
  try {
    const { kitchenId } = req.params;
    const countryCode = req.headers['x-country-code'] || 'SA';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Verify kitchen exists and belongs to country
    const kitchen = await User.findOne({ 
      _id: kitchenId, 
      isCook: true,
      countryCode: countryCode.toUpperCase()
    });
    if (!kitchen) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kitchen not found in this country' 
      });
    }
    
    // Get offers from this kitchen
    const offers = await Product.find({ 
      cook: kitchenId, 
      isActive: true,
      countryCode: countryCode.toUpperCase()
    })
      .populate('category', 'name')
      .sort({ isPopular: -1, 'dishRatings.average': -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Product.countDocuments({ 
      cook: kitchenId, 
      isActive: true,
      countryCode: countryCode.toUpperCase()
    });
    
    res.json({
      success: true,
      kitchen: {
        _id: kitchen._id,
        name: kitchen.name,
        storeName: kitchen.storeName,
        profilePhoto: kitchen.profilePhoto,
        ratings: kitchen.ratings,
        bio: kitchen.bio,
        area: kitchen.area
      },
      offers,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Rate a dish offer
const rateDishOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }

    const offer = await Product.findById(offerId);
    if (!offer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Offer not found' 
      });
    }

    await offer.addDishRating(userId, rating, review);

    res.status(200).json({ 
      success: true, 
      data: offer 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getPopularDishes,
  togglePopular,
  getPublicStats,
  getOffersByDish,
  getOfferById,
  getOffersByKitchen,
  rateDishOffer
};