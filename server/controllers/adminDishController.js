const AdminDish = require('../models/AdminDish');
const Category = require('../models/Category');
const DishOffer = require('../models/DishOffer');
const Joi = require('joi');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Configure upload directory from environment variable
const UPLOAD_DIR = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR, 'dishes')
  : path.join(__dirname, '../uploads/dishes');

// Ensure upload directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage configuration for temporary storage before processing
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPG, and WEBP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter
});

// Process and save image with sharp (4:3 ratio, 400×300, JPG quality 85)
const processAndSaveImage = async (buffer, dishId) => {
  const filename = `${dishId}-${Date.now()}.jpg`;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  await sharp(buffer)
    .resize(400, 300, {
      position: 'center',
      fit: 'cover'
    })
    .jpeg({ quality: 85, progressive: true })
    .toFile(filepath);
  
  return `/uploads/dishes/${filename}`;
};

// Delete dish image file
const deleteDishImage = async (imageUrl) => {
  if (!imageUrl) return;
  
  const filepath = path.join(__dirname, '..', imageUrl);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
};

// Validation schema for admin dish
const adminDishSchema = Joi.object({
  nameEn: Joi.string().min(2).max(100).required(),
  nameAr: Joi.string().min(2).max(100).required(),
  descriptionEn: Joi.string().min(10).max(1000).required(),
  descriptionAr: Joi.string().min(10).max(1000).required(),
  longDescriptionEn: Joi.string().max(5000).allow('').default(''),
  longDescriptionAr: Joi.string().max(5000).allow('').default(''),
  category: Joi.string().hex().length(24).required(),
  isActive: Joi.boolean().default(true),
  isPopular: Joi.boolean().default(false),
  imageUrl: Joi.string().optional() // Set after image processing
});

// GET all admin dishes with pagination and search
const getAdminDishes = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, active, popular } = req.query;
    
    // Build filter
    const filter = {};
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    
    if (popular !== undefined) {
      filter.isPopular = popular === 'true';
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [dishes, total] = await Promise.all([
      AdminDish.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('category', 'nameEn nameAr'),
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

// GET single admin dish
const getAdminDishById = async (req, res) => {
  try {
    const dish = await AdminDish.findById(req.params.id)
      .populate('category', 'nameEn nameAr');
    
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' });
    }
    
    res.json(dish);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST create new admin dish
const createAdminDish = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can create dishes' });
    }

    // Handle file upload
    let imageUrl = '';
    if (req.file) {
      // Create a temporary ID for image processing
      const tempId = 'new-' + Date.now();
      imageUrl = await processAndSaveImage(req.file.buffer, tempId);
    }
    
    // Build data object from FormData fields (multer sends fields as strings)
    const dishData = {
      nameEn: req.body.nameEn,
      nameAr: req.body.nameAr,
      descriptionEn: req.body.descriptionEn,
      descriptionAr: req.body.descriptionAr,
      longDescriptionEn: req.body.longDescriptionEn || '',
      longDescriptionAr: req.body.longDescriptionAr || '',
      category: req.body.category,
      isActive: req.body.isActive === 'true' || req.body.isActive || true,
      isPopular: req.body.isPopular === 'true' || req.body.isPopular || false,
      imageUrl
    };
    
    // Validate input
    const { error, value } = adminDishSchema.validate(dishData);
    if (error) {
      // Clean up uploaded file on validation error
      if (imageUrl) {
        await deleteDishImage(imageUrl);
      }
      return res.status(400).json({ message: error.details[0].message });
    }
    
    // Verify category exists
    const category = await Category.findById(value.category);
    if (!category) {
      if (imageUrl) {
        await deleteDishImage(imageUrl);
      }
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // Check for duplicate names
    const duplicateCheck = await AdminDish.findOne({
      $or: [
        { nameEn: value.nameEn },
        { nameAr: value.nameAr }
      ]
    });
    
    if (duplicateCheck) {
      if (imageUrl) {
        await deleteDishImage(imageUrl);
      }
      return res.status(400).json({ message: 'Dish name already exists' });
    }
    
    // Create dish with validated data and image URL
    const createData = {
      ...value,
      imageUrl
    };
    
    const dish = await AdminDish.create(createData);
    
    // If image was uploaded, update with actual _id
    if (imageUrl) {
      const newImageUrl = await processAndSaveImage(req.file.buffer, dish._id.toString());
      dish.imageUrl = newImageUrl;
      await dish.save();
    }
    
    const populatedDish = await AdminDish.findById(dish._id)
      .populate('category', 'nameEn nameAr');
    
    res.status(201).json(populatedDish);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT update admin dish
const updateAdminDish = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can update dishes' });
    }

    // Validate input (make fields optional for update)
    const updateSchema = Joi.object({
      nameEn: Joi.string().min(2).max(100),
      nameAr: Joi.string().min(2).max(100),
      descriptionEn: Joi.string().min(10).max(1000),
      descriptionAr: Joi.string().min(10).max(1000),
      longDescriptionEn: Joi.string().max(5000).allow(''),
      longDescriptionAr: Joi.string().max(5000).allow(''),
      category: Joi.string().hex().length(24),
      isActive: Joi.boolean(),
      isPopular: Joi.boolean()
    });
    
    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    const dish = await AdminDish.findById(req.params.id);
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' });
    }
    
    // Handle new image upload
    if (req.file) {
      // Delete old image
      if (dish.imageUrl) {
        await deleteDishImage(dish.imageUrl);
      }
      // Process and save new image
      dish.imageUrl = await processAndSaveImage(req.file.buffer, dish._id.toString());
    }
    
    // Update fields
    if (value.nameEn) dish.nameEn = value.nameEn;
    if (value.nameAr) dish.nameAr = value.nameAr;
    if (value.descriptionEn) dish.descriptionEn = value.descriptionEn;
    if (value.descriptionAr) dish.descriptionAr = value.descriptionAr;
    if (value.longDescriptionEn !== undefined) dish.longDescriptionEn = value.longDescriptionEn;
    if (value.longDescriptionAr !== undefined) dish.longDescriptionAr = value.longDescriptionAr;
    if (value.category) {
      const category = await Category.findById(value.category);
      if (!category) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      dish.category = value.category;
    }
    if (value.isActive !== undefined) dish.isActive = value.isActive;
    if (value.isPopular !== undefined) dish.isPopular = value.isPopular;
    
    await dish.save();
    
    const populatedDish = await AdminDish.findById(dish._id)
      .populate('category', 'nameEn nameAr');
    
    res.json(populatedDish);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH toggle popular status
const togglePopular = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can toggle popular status' });
    }

    const dish = await AdminDish.findById(req.params.id);
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' });
    }
    
    dish.isPopular = !dish.isPopular;
    await dish.save();
    
    res.json({ 
      message: dish.isPopular ? 'Dish marked as popular' : 'Dish removed from popular',
      isPopular: dish.isPopular 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE soft delete admin dish
const deleteAdminDish = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can delete dishes' });
    }

    const dish = await AdminDish.findById(req.params.id);
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' });
    }
    
    // Soft delete - just mark as inactive
    dish.isActive = false;
    await dish.save();
    
    res.json({ message: 'Dish deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hard delete (for admin use only)
const hardDeleteAdminDish = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can permanently delete dishes' });
    }

    const dish = await AdminDish.findById(req.params.id);
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' });
    }
    
    // Delete image file
    if (dish.imageUrl) {
      await deleteDishImage(dish.imageUrl);
    }
    
    await AdminDish.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Dish permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminDishes,
  getAdminDishById,
  createAdminDish,
  updateAdminDish,
  togglePopular,
  deleteAdminDish,
  hardDeleteAdminDish,
  upload,
  UPLOAD_DIR
};
