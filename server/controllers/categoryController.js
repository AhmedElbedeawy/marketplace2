const Category = require('../models/Category');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.fieldname === 'iconWeb' ? 'web' : 'mobile';
    const uploadPath = type === 'web' ? WEB_DIR : MOBILE_DIR;
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: categoryId-type-timestamp.ext
    const categoryId = req.params.id || 'new';
    const type = file.fieldname === 'iconWeb' ? 'web' : 'mobile';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${categoryId}-${type}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

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
  sortOrder: Joi.number().integer().optional(),
  isActive: Joi.boolean().optional()
});

// Helper: delete icon files
const deleteIconFiles = async (category) => {
  if (category.icons.web) {
    const webPath = path.join(__dirname, '..', category.icons.web);
    if (fs.existsSync(webPath)) fs.unlinkSync(webPath);
  }
  if (category.icons.mobile) {
    const mobilePath = path.join(__dirname, '..', category.icons.mobile);
    if (fs.existsSync(mobilePath)) fs.unlinkSync(mobilePath);
  }
  if (category.icon) {
    const legacyPath = path.join(__dirname, '..', category.icon);
    if (fs.existsSync(legacyPath)) fs.unlinkSync(legacyPath);
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
    
    // Transform for backward compatibility: set legacy `icon` field to `icons.web`
    const transformedCategories = categories.map(cat => {
      const obj = cat.toObject();
      // Set legacy icon field for backward compatibility with old frontend code
      obj.icon = cat.icons?.web || cat.icon || '';
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
    const iconWeb = req.files?.iconWeb?.[0]?.filename || '';
    const iconMobile = req.files?.iconMobile?.[0]?.filename || '';
    
    // Validate input
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      // Clean up uploaded files on validation error
      if (iconWeb) {
        const fp = path.join(WEB_DIR, iconWeb);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      if (iconMobile) {
        const fp = path.join(MOBILE_DIR, iconMobile);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
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
      // Clean up uploaded files
      if (iconWeb) {
        const fp = path.join(WEB_DIR, iconWeb);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      if (iconMobile) {
        const fp = path.join(MOBILE_DIR, iconMobile);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
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
        web: iconWeb ? `/uploads/categories/web/${iconWeb}` : '',
        mobile: iconMobile ? `/uploads/categories/mobile/${iconMobile}` : ''
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
    
    // Update fields
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
    if (value.sortOrder !== undefined) category.sortOrder = value.sortOrder;
    if (value.isActive !== undefined) category.isActive = value.isActive;
    
    await category.save();
    
    res.json(category);
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
        const oldPath = path.join(__dirname, '..', category.icons.web);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      category.icons.web = `/uploads/categories/web/${req.files.iconWeb[0].filename}`;
    }
    
    // Handle mobile icon upload
    if (req.files?.iconMobile?.[0]) {
      // Delete old mobile icon if exists
      if (category.icons.mobile) {
        const oldPath = path.join(__dirname, '..', category.icons.mobile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      category.icons.mobile = `/uploads/categories/mobile/${req.files.iconMobile[0].filename}`;
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
