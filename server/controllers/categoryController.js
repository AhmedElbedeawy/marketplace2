const Category = require('../models/Category');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storageService = require('../services/storageService');

// Configure upload directory from environment variable, default to ./uploads/categories
const UPLOAD_DIR = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR, 'categories')
  : path.join(__dirname, '../uploads/categories');

// Ensure upload directories exist
const WEB_DIR = path.join(UPLOAD_DIR, 'web');
const MOBILE_DIR = path.join(UPLOAD_DIR, 'mobile');

[UPLOAD_DIR, WEB_DIR, MOBILE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer storage configuration - use memory storage, then upload to cloud
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG and JPG images are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter
});

// Validation schema for category
const categorySchema = Joi.object({
  name: Joi.string().min(1).max(50).optional(),
  nameEn: Joi.string().min(1).max(50).required(),
  nameAr: Joi.string().min(1).max(50).required(),
  description: Joi.string().optional().allow(''),
  descriptionAr: Joi.string().optional().allow(''),
  color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  mobileFontColor: Joi.string().valid('light', 'dark').optional(),
  sortOrder: Joi.number().integer().optional(),
  isActive: Joi.boolean().optional()
});

// Helper: delete icon files from cloud storage
const deleteIconFiles = async (category) => {
  if (category.icons?.web) {
    await storageService.deleteImage(category.icons.web);
  }
  if (category.icons?.mobile) {
    await storageService.deleteImage(category.icons.mobile);
  }
};

// GET all categories (public)
const getCategories = async (req, res) => {
  try {
    const { active, search } = req.query;
    
    // Build filter
    const filter = {};
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } },
        { nameAr: { $regex: search, $options: 'i' } }
      ];
    }
    
    const categories = await Category.find(filter)
      .sort({ sortOrder: 1, nameEn: 1 });
    
    // Transform categories before returning:
    // 1. Set legacy `icon` field for backward compatibility.
    // 2. Strip old local /uploads/ filesystem paths from icons — those files
    //    no longer exist on the server (images are now in cloud storage).
    //    Returning empty string lets clients fall back to their local assets
    //    without generating 404 requests.
    const isLocalUploadPath = (url) =>
      typeof url === 'string' && (url.startsWith('/uploads/') || url.startsWith('uploads/'));

    const transformedCategories = categories.map(cat => {
      const obj = cat.toObject();
      // Strip broken local upload paths — keep empty string or valid cloud URLs
      if (isLocalUploadPath(obj.icons?.web))    obj.icons.web    = '';
      if (isLocalUploadPath(obj.icons?.mobile)) obj.icons.mobile = '';
      if (isLocalUploadPath(obj.icon))          obj.icon         = '';
      // Set legacy icon field for backward compatibility with old frontend code
      obj.icon = obj.icons?.web || obj.icon || '';
      return obj;
    });

    res.json(transformedCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single category (public)
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Transform for backward compatibility: set legacy `icon` field to `icons.web`
    const obj = category.toObject();
    obj.icon = category.icons?.web || category.icon || '';
    
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST create category (Admin only)
const createCategory = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can create categories' });
    }

    // Handle file uploads
  let iconWebUrl = '';
  let iconMobileUrl = '';
  
  // Upload web icon to cloud storage
  if (req.files?.iconWeb?.[0]) {
    const buffer = req.files.iconWeb[0].buffer;
    const filename = `category-${req.params.id || 'new'}-web-${Date.now()}.jpg`;
    iconWebUrl = await storageService.processAndSaveImage(buffer, {
      category: 'categories',
      filename: filename,
      width: 256,
      height: 256
    });
  }
  
  // Upload mobile icon to cloud storage
  if (req.files?.iconMobile?.[0]) {
    const buffer = req.files.iconMobile[0].buffer;
    const filename = `category-${req.params.id || 'new'}-mobile-${Date.now()}.jpg`;
    // Pass larger dimensions but preserve aspect ratio (storageService handles this for mobile categories)
    iconMobileUrl = await storageService.processAndSaveImage(buffer, {
      category: 'categories',
      filename: filename,
      width: 300,  // Max width (actual size preserved)
      height: 500  // Max height (actual size preserved)
    });
  }
    
    // Validate input
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      // Clean up uploaded cloud images on validation error
      if (iconWebUrl) await storageService.deleteImage(iconWebUrl);
      if (iconMobileUrl) await storageService.deleteImage(iconMobileUrl);
      return res.status(400).json({ message: error.details[0].message });
    }
    
    // Check for duplicate names (both legacy name and new bilingual names)
    const duplicateCheck = await Category.findOne({
      $or: [
        { name: value.nameEn },  // Legacy name check
        { nameEn: value.nameEn },
        { nameAr: value.nameAr }
      ]
    });
    
    if (duplicateCheck) {
      // Clean up uploaded cloud images
      if (iconWebUrl) await storageService.deleteImage(iconWebUrl);
      if (iconMobileUrl) await storageService.deleteImage(iconMobileUrl);
      return res.status(400).json({ message: 'Category name already exists' });
    }
    
    // Build category data
    const categoryData = {
      name: value.nameEn,  // Set legacy name to English for backward compat
      nameEn: value.nameEn,
      nameAr: value.nameAr,
      description: value.description || '',
      descriptionAr: value.descriptionAr || '',
      color: value.color || '#FFB973',
      sortOrder: value.sortOrder || 0,
      isActive: value.isActive !== undefined ? value.isActive : true,
      icons: {
        web: iconWebUrl,
        mobile: iconMobileUrl
      }
    };
    
    const category = await Category.create(categoryData);
    
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT update category (Admin only)
const updateCategory = async (req, res) => {
  try {
    console.log('🔥 updateCategory controller EXECUTED');
    console.log('🔥 req.files:', req.files ? Object.keys(req.files) : 'no files');
    console.log('🔥 req.params.id:', req.params.id);
    
    // Check admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can update categories' });
    }

    // Validate input
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    
    // Check if category exists
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check for duplicate names (excluding current category)
    if (value.nameEn || value.nameAr) {
      const duplicateCheck = await Category.findOne({
        _id: { $ne: req.params.id },
        $or: [
          { name: value.nameEn },
          { nameEn: value.nameEn },
          { nameAr: value.nameAr }
        ]
      });
      
      if (duplicateCheck) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }
    
    // Update text fields
    if (value.nameEn) {
      category.nameEn = value.nameEn;
      // Also update legacy name if not being used elsewhere
      if (!category.name || category.name === category.nameEn) {
        category.name = value.nameEn;
      }
    }
    if (value.nameAr) category.nameAr = value.nameAr;
    if (value.description !== undefined) category.description = value.description;
    if (value.descriptionAr !== undefined) category.descriptionAr = value.descriptionAr;
    if (value.color) category.color = value.color;
    if (value.mobileFontColor) category.mobileFontColor = value.mobileFontColor;
    if (value.sortOrder !== undefined) category.sortOrder = value.sortOrder;
    if (value.isActive !== undefined) category.isActive = value.isActive;
    
    // Ensure icons object exists
    if (!category.icons) {
      category.icons = { web: '', mobile: '' };
    }
    
    // Handle web icon upload
    if (req.files?.iconWeb?.[0]) {
      // Delete old web icon if exists
      if (category.icons?.web) {
        await storageService.deleteImage(category.icons.web);
      }
      const buffer = req.files.iconWeb[0].buffer;
      const filename = `category-${req.params.id}-web-${Date.now()}.jpg`;
      category.icons.web = await storageService.processAndSaveImage(buffer, {
        category: 'categories',
        filename: filename,
        width: 256,
        height: 256
      });
    }
    
    // Handle mobile icon upload
    if (req.files?.iconMobile?.[0]) {
      // Delete old mobile icon if exists
      if (category.icons?.mobile) {
        await storageService.deleteImage(category.icons.mobile);
      }
      const buffer = req.files.iconMobile[0].buffer;
      const filename = `category-${req.params.id}-mobile-${Date.now()}.jpg`;
      category.icons.mobile = await storageService.processAndSaveImage(buffer, {
        category: 'categories',
        filename: filename,
        width: 128,
        height: 128
      });
    }
    
    await category.save();
    
    // Return updated category
    const updatedCategory = await Category.findById(category._id);
    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH update category icons (Admin only)
const updateCategoryIcons = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can update category icons' });
    }

    // Check if category exists
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Handle web icon upload
    if (req.files?.iconWeb?.[0]) {
      // Delete old web icon if exists
      if (category.icons.web) {
        await storageService.deleteImage(category.icons.web);
      }
      const buffer = req.files.iconWeb[0].buffer;
      const filename = `category-${req.params.id}-web-${Date.now()}.jpg`;
      category.icons.web = await storageService.processAndSaveImage(buffer, {
        category: 'categories',
        filename: filename,
        width: 256,
        height: 256
      });
    }
    
    // Handle mobile icon upload
    if (req.files?.iconMobile?.[0]) {
      // Delete old mobile icon if exists
      if (category.icons.mobile) {
        await storageService.deleteImage(category.icons.mobile);
      }
      const buffer = req.files.iconMobile[0].buffer;
      const filename = `category-${req.params.id}-mobile-${Date.now()}.jpg`;
      // Preserve aspect ratio (storageService handles this for mobile categories)
      category.icons.mobile = await storageService.processAndSaveImage(buffer, {
        category: 'categories',
        filename: filename,
        width: 300,   // Max width
        height: 500   // Max height
      });
    }
    
    await category.save();
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE category (Admin only)
const deleteCategory = async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only admins can delete categories' });
    }

    // Check if category exists
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Delete icon files
    await deleteIconFiles(category);
    
    // Delete category
    await Category.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategoryIcons,
  deleteCategory,
  upload,
  UPLOAD_DIR
};
