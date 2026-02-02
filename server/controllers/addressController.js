const Address = require('../models/Address');

// @desc    Get all addresses for logged-in user
// @route   GET /api/addresses
// @access  Private
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ 
      user: req.user._id,
      isDeleted: false 
    }).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: addresses.length,
      data: addresses
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch addresses',
      error: error.message
    });
  }
};

// @desc    Get single address
// @route   GET /api/addresses/:id
// @access  Private
exports.getAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.status(200).json({
      success: true,
      data: address
    });
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch address',
      error: error.message
    });
  }
};

// @desc    Create new address
// @route   POST /api/addresses
// @access  Private
exports.createAddress = async (req, res) => {
  try {
    const { addressLine1, addressLine2, city, label, lat, lng, deliveryNotes, isDefault } = req.body;

    // Validate required fields
    if (!addressLine1 || !city || !label || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: addressLine1, city, label, lat, lng'
      });
    }

    // Check if this is the user's first address - make it default automatically
    const existingAddresses = await Address.countDocuments({
      user: req.user._id,
      isDeleted: false
    });

    const address = await Address.create({
      user: req.user._id,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      label,
      lat,
      lng,
      deliveryNotes: deliveryNotes || '',
      isDefault: existingAddresses === 0 ? true : (isDefault || false)
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address
    });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create address',
      error: error.message
    });
  }
};

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
exports.updateAddress = async (req, res) => {
  try {
    const { addressLine1, addressLine2, city, label, lat, lng, deliveryNotes, isDefault } = req.body;

    let address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Update fields
    if (addressLine1 !== undefined) address.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
    if (city !== undefined) address.city = city;
    if (label !== undefined) address.label = label;
    if (lat !== undefined) address.lat = lat;
    if (lng !== undefined) address.lng = lng;
    if (deliveryNotes !== undefined) address.deliveryNotes = deliveryNotes;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await address.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error.message
    });
  }
};

// @desc    Delete address (soft delete)
// @route   DELETE /api/addresses/:id
// @access  Private
exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Soft delete
    address.isDeleted = true;
    address.isDefault = false;
    await address.save();

    // If this was the default address, set another address as default
    if (address.isDefault) {
      const nextAddress = await Address.findOne({
        user: req.user._id,
        isDeleted: false,
        _id: { $ne: address._id }
      }).sort({ createdAt: -1 });

      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error.message
    });
  }
};

// @desc    Set address as default
// @route   PATCH /api/addresses/:id/default
// @access  Private
exports.setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: false
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Set this address as default (pre-save hook will unset others)
    address.isDefault = true;
    await address.save();

    res.status(200).json({
      success: true,
      message: 'Default address set successfully',
      data: address
    });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default address',
      error: error.message
    });
  }
};

