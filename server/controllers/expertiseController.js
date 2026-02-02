const ExpertiseCategory = require('../models/ExpertiseCategory');
const Cook = require('../models/Cook');
const User = require('../models/User');

// @desc    Get all expertise categories (Admin)
// @route   GET /api/admin/expertise
// @access  Private/Admin
exports.getAdminExpertise = async (req, res) => {
  try {
    const categories = await ExpertiseCategory.find().sort({ sortOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get active expertise categories (Public)
// @route   GET /api/expertise
// @access  Public
exports.getExpertise = async (req, res) => {
  try {
    const categories = await ExpertiseCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new expertise category
// @route   POST /api/admin/expertise
// @access  Private/Admin
exports.createExpertise = async (req, res) => {
  try {
    const { name, nameAr, sortOrder } = req.body;
    const normalizedName = name.trim().toLowerCase();

    const existing = await ExpertiseCategory.findOne({ normalizedName });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Expertise name already exists' });
    }

    const category = await ExpertiseCategory.create({
      name,
      nameAr,
      normalizedName,
      sortOrder: sortOrder || 0
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update expertise category
// @route   PATCH /api/admin/expertise/:id
// @access  Private/Admin
exports.updateExpertise = async (req, res) => {
  try {
    const { name, nameAr, isActive, sortOrder } = req.body;
    const category = await ExpertiseCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name) {
      const normalizedName = name.trim().toLowerCase();
      if (normalizedName !== category.normalizedName) {
        const existing = await ExpertiseCategory.findOne({ normalizedName, _id: { $ne: req.params.id } });
        if (existing) {
          return res.status(409).json({ success: false, message: 'Expertise name already exists' });
        }
        category.name = name;
        category.normalizedName = normalizedName;
      }
    }

    if (nameAr !== undefined) category.nameAr = nameAr;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;

    await category.save();
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Deactivate expertise category
// @route   DELETE /api/admin/expertise/:id
// @access  Private/Admin
exports.deleteExpertise = async (req, res) => {
  try {
    const category = await ExpertiseCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if used by any cooks
    const cooksCount = await Cook.countDocuments({ expertise: category.name });
    const usersCount = await User.countDocuments({ expertise: category.name });
    const totalCount = cooksCount + usersCount;

    category.isActive = false;
    await category.save();

    res.status(200).json({ 
      success: true, 
      message: 'Expertise deactivated successfully',
      warning: totalCount > 0 ? `This expertise is currently assigned to ${totalCount} users/cooks. It is now hidden from new selections.` : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
