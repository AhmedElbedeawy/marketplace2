const Campaign = require('../models/Campaign');
const Coupon = require('../models/Coupon');
const CampaignRedemption = require('../models/CampaignRedemption');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { createNotification, broadcastNotification } = require('../utils/notifications');

// Get all campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('scope.cookIds', 'storeName')
      .populate('scope.categoryIds', 'name')
      .populate('scope.dishIds', 'name')
      .sort({ createdAt: -1 });

    // Get coupon counts for each campaign
    const campaignsWithCoupons = await Promise.all(
      campaigns.map(async (campaign) => {
        const couponCount = await Coupon.countDocuments({ campaign: campaign._id });
        const redemptionCount = await CampaignRedemption.countDocuments({ campaign: campaign._id });
        
        return {
          ...campaign.toObject(),
          couponCount,
          redemptionCount
        };
      })
    );

    res.status(200).json({ success: true, data: campaignsWithCoupons });
  } catch (err) {
    console.error('Get campaigns error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single campaign
exports.getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('scope.cookIds', 'storeName')
      .populate('scope.categoryIds', 'name')
      .populate('scope.dishIds', 'name');

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Get coupons for this campaign
    const coupons = await Coupon.find({ campaign: campaign._id }).sort({ createdAt: -1 });
    const redemptionCount = await CampaignRedemption.countDocuments({ campaign: campaign._id });

    res.status(200).json({
      success: true,
      data: {
        ...campaign.toObject(),
        coupons,
        redemptionCount
      }
    });
  } catch (err) {
    console.error('Get campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create campaign
exports.createCampaign = async (req, res) => {
  try {
    console.log('📝 CREATE CAMPAIGN REQUEST RECEIVED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      name,
      type,
      startAt,
      endAt,
      scope,
      discountPercent,
      maxDiscountAmount,
      minOrderValue,
      maxRedemptionsPerUser
    } = req.body;

    console.log('Campaign type:', type);
    console.log('Campaign name:', name);

    // Validation: Start date cannot be in the past (with 5-minute tolerance)
    const now = new Date();
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    console.log('Current time:', now.toISOString());
    console.log('Start time:', startDate.toISOString());
    console.log('End time:', endDate.toISOString());

    // Allow a 5-minute tolerance window
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (startDate < fiveMinutesAgo) {
      console.log('❌ START DATE IS IN THE PAST');
      return res.status(400).json({ 
        success: false, 
        message: 'Campaign start date-time cannot be in the past' 
      });
    }

    // Validation: End date must be after start date
    if (endDate <= startDate) {
      console.log('❌ END DATE IS NOT AFTER START DATE');
      return res.status(400).json({ 
        success: false, 
        message: 'Campaign end date-time must be after start date-time' 
      });
    }

    // Validation: Specific Items scope must have at least one selection
    if (!scope.applyToAll) {
      const hasCooks = scope.cookIds && scope.cookIds.length > 0;
      const hasCategories = scope.categoryIds && scope.categoryIds.length > 0;
      const hasDishes = scope.dishIds && scope.dishIds.length > 0;

      if (!hasCooks && !hasCategories && !hasDishes) {
        console.log('❌ NO ITEMS SELECTED FOR SPECIFIC SCOPE');
        return res.status(400).json({ 
          success: false, 
          message: 'Please select at least one item (Dish, Category, or Kitchen) for Specific Items scope' 
        });
      }
    }

    const adminId = req.user.id;
    console.log('✅ VALIDATIONS PASSED, creating campaign...');

    const campaign = await Campaign.create({
      name,
      type,
      startAt,
      endAt,
      scope,
      discountPercent,
      maxDiscountAmount,
      minOrderValue,
      maxRedemptionsPerUser: maxRedemptionsPerUser || 1,
      status: type === 'COUPON' ? 'ACTIVE' : 'DRAFT', // Auto-activate COUPON campaigns
      createdBy: adminId,
      updatedBy: adminId
    });

    console.log('✅ CAMPAIGN CREATED:', campaign._id);
    console.log('Campaign status:', campaign.status);

    // Auto-generate coupon if type is COUPON
    let generatedCoupon = null;
    if (type === 'COUPON') {
      console.log('🎫 GENERATING COUPON CODE...');
      const code = `${name.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      console.log('Generated code:', code);
      
      generatedCoupon = await Coupon.create({
        campaign: campaign._id,
        code,
        status: 'ACTIVE'
      });
      
      console.log('✅ COUPON CREATED:', generatedCoupon);
      console.log('Coupon code:', generatedCoupon.code);
    }

    console.log('📤 SENDING RESPONSE WITH COUPON:', generatedCoupon ? generatedCoupon.code : null);

    res.status(201).json({ 
      success: true, 
      data: campaign,
      coupon: generatedCoupon ? generatedCoupon.code : null
    });
  } catch (err) {
    console.error('❌ CREATE CAMPAIGN ERROR:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Update campaign
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Validation if dates are being updated
    if (req.body.startAt || req.body.endAt) {
      const startDate = new Date(req.body.startAt || campaign.startAt);
      const endDate = new Date(req.body.endAt || campaign.endAt);

      // Validation: End date must be after start date
      if (endDate <= startDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Campaign end date-time must be after start date-time' 
        });
      }
    }

    // Validation: Specific Items scope must have at least one selection
    if (req.body.scope && !req.body.scope.applyToAll) {
      const scope = req.body.scope;
      const hasCooks = scope.cookIds && scope.cookIds.length > 0;
      const hasCategories = scope.categoryIds && scope.categoryIds.length > 0;
      const hasDishes = scope.dishIds && scope.dishIds.length > 0;

      if (!hasCooks && !hasCategories && !hasDishes) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please select at least one item (Dish, Category, or Kitchen) for Specific Items scope' 
        });
      }
    }

    // Update fields
    Object.assign(campaign, req.body);
    campaign.updatedBy = adminId;

    await campaign.save();

    res.status(200).json({ success: true, data: campaign });
  } catch (err) {
    console.error('Update campaign error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Delete campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Delete all associated coupons
    await Coupon.deleteMany({ campaign: id });

    await campaign.deleteOne();

    res.status(200).json({ success: true, message: 'Campaign deleted successfully' });
  } catch (err) {
    console.error('Delete campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Generate coupons for a campaign
exports.generateCoupons = async (req, res) => {
  try {
    const { id } = req.params;
    const { count, prefix } = req.body;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.type !== 'COUPON') {
      return res.status(400).json({ success: false, message: 'Can only generate coupons for COUPON campaigns' });
    }

    const coupons = [];
    for (let i = 0; i < count; i++) {
      const code = `${prefix || 'COUPON'}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const coupon = await Coupon.create({
        campaign: campaign._id,
        code,
        status: 'ACTIVE'
      });

      coupons.push(coupon);
    }

    res.status(201).json({ success: true, data: coupons });
  } catch (err) {
    console.error('Generate coupons error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Toggle coupon status
exports.toggleCouponStatus = async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId).populate('campaign');
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    coupon.status = coupon.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    await coupon.save();

    res.status(200).json({ success: true, data: coupon });
  } catch (err) {
    console.error('Toggle coupon error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get redemptions for a campaign
exports.getCampaignRedemptions = async (req, res) => {
  try {
    const { id } = req.params;

    const redemptions = await CampaignRedemption.find({ campaign: id })
      .populate('user', 'name email')
      .populate('order')
      .sort({ redeemedAt: -1 });

    res.status(200).json({ success: true, data: redemptions });
  } catch (err) {
    console.error('Get redemptions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get dropdown data for campaign creation
exports.getDropdownData = async (req, res) => {
  try {
    const cooks = await User.find({ role_cook_status: 'active' }).select('_id storeName');
    const categories = await Category.find({}).select('_id name');
    const dishes = await Product.find({}).select('_id name');

    res.status(200).json({
      success: true,
      data: {
        cooks,
        categories,
        dishes
      }
    });
  } catch (err) {
    console.error('Get dropdown data error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Activate campaign and notify customers
exports.activateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.status === 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Campaign is already active' });
    }

    // Activate the campaign
    campaign.status = 'ACTIVE';
    campaign.updatedBy = adminId;
    await campaign.save();

    // If there's a coupon, activate it too
    if (campaign.type === 'COUPON') {
      await Coupon.updateMany(
        { campaign: campaign._id },
        { status: 'ACTIVE' }
      );
    }

    // Build notification message
    const discountMsg = campaign.discountPercent 
      ? `Get ${campaign.discountPercent}% off` 
      : 'Special offer available';
    
    const title = `New Promotion: ${campaign.name}`;
    const message = `${discountMsg}! ${campaign.name} is now active. Order now and enjoy great deals!`;

    // Send broadcast notification to customers
    const recipientCount = await broadcastNotification({
      role: 'customer',
      countryCode: campaign.countryCode || null,
      title,
      message,
      type: 'promotion',
      entityType: 'promotion',
      entityId: campaign._id,
      deepLink: '/offers'
    });

    console.log(`Promotion notification sent to ${recipientCount} customers`);

    res.status(200).json({ 
      success: true, 
      data: campaign,
      notificationsSent: recipientCount
    });
  } catch (err) {
    console.error('Activate campaign error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// Get active campaigns affecting this cook's dishes (read-only for cooks)
exports.getCookCampaignImpact = async (req, res) => {
  try {
    const cookId = req.user._id;
    console.log('📊 Fetching campaign impact for cook:', cookId);
    
    // First, get the cook's offers/dishes to see what categories and dishes they have
    const Product = require('../models/Product');
    const cookProducts = await Product.find({ cook: cookId }).select('category name');
    
    const cookCategoryIds = [...new Set(cookProducts.map(p => p.category?.toString()).filter(Boolean))];
    const cookProductIds = cookProducts.map(p => p._id.toString());
    
    console.log('Cook categories:', cookCategoryIds);
    console.log('Cook products count:', cookProductIds.length);
    
    // Find active campaigns that affect:
    // 1. All items (applyToAll: true)
    // 2. This cook's specific categories
    // 3. This cook's specific dishes
    const now = new Date();
    
    const activeCampaigns = await Campaign.find({
      status: 'ACTIVE',
      startAt: { $lte: now },
      endAt: { $gte: now }
    })
    .populate('scope.cookIds', 'storeName')
    .populate('scope.categoryIds', 'name')
    .populate('scope.dishIds', 'name')
    .sort({ startAt: -1 });
    
    console.log('Total active campaigns found:', activeCampaigns.length);
    
    // Filter campaigns that affect this cook's dishes
    const impactingCampaigns = activeCampaigns.filter(campaign => {
      const scope = campaign.scope;
      
      // Campaign applies to everything
      if (scope.applyToAll) {
        console.log(`Campaign "${campaign.name}" applies to all - affects this cook`);
        return true;
      }
      
      // Check if campaign targets this cook specifically
      const targetsCook = scope.cookIds?.some(c => c._id?.toString() === cookId.toString());
      if (targetsCook) {
        console.log(`Campaign "${campaign.name}" targets this cook directly`);
        return true;
      }
      
      // Check if campaign targets this cook's categories
      const campaignCategoryIds = scope.categoryIds?.map(c => c._id?.toString()) || [];
      const hasMatchingCategory = cookCategoryIds.some(catId => campaignCategoryIds.includes(catId));
      if (hasMatchingCategory) {
        console.log(`Campaign "${campaign.name}" targets matching categories`);
        return true;
      }
      
      // Check if campaign targets this cook's specific dishes
      const campaignDishIds = scope.dishIds?.map(d => d._id?.toString()) || [];
      const hasMatchingDishes = cookProductIds.some(prodId => campaignDishIds.includes(prodId));
      if (hasMatchingDishes) {
        console.log(`Campaign "${campaign.name}" targets this cook's dishes`);
        return true;
      }
      
      return false;
    });
    
    // Transform the data for the cook view
    const result = impactingCampaigns.map(campaign => {
      const scope = campaign.scope;
      
      // Find affected items from this cook's perspective
      let affectedDishes = [];
      
      if (scope.applyToAll) {
        // All cook's dishes are affected
        affectedDishes = cookProducts.map(p => ({
          id: p._id,
          name: p.name,
          affected: true
        }));
      } else {
        // Check which specific dishes are affected
        const campaignDishIds = scope.dishIds?.map(d => d._id?.toString()) || [];
        affectedDishes = cookProducts.map(p => ({
          id: p._id,
          name: p.name,
          affected: campaignDishIds.includes(p._id.toString())
        })).filter(d => d.affected);
        
        // Also include dishes from matching categories
        const campaignCategoryIds = scope.categoryIds?.map(c => c._id?.toString()) || [];
        const categoryDishes = cookProducts
          .filter(p => p.category && campaignCategoryIds.includes(p.category.toString()))
          .map(p => ({
            id: p._id,
            name: p.name,
            affected: true
          }));
        
        // Merge and deduplicate
        const existingIds = new Set(affectedDishes.map(d => d.id.toString()));
        categoryDishes.forEach(d => {
          if (!existingIds.has(d.id.toString())) {
            affectedDishes.push(d);
            existingIds.add(d.id.toString());
          }
        });
      }
      
      return {
        id: campaign._id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        discountPercent: campaign.discountPercent,
        startAt: campaign.startAt,
        endAt: campaign.endAt,
        minOrderValue: campaign.minOrderValue,
        maxDiscountAmount: campaign.maxDiscountAmount,
        affectedDishCount: affectedDishes.length,
        affectedDishes: affectedDishes.slice(0, 10), // Limit to 10 for response
        scope: {
          applyToAll: scope.applyToAll,
          targetCategories: scope.categoryIds?.map(c => ({
            id: c._id,
            name: c.name
          })) || [],
          targetDishes: scope.dishIds?.map(d => ({
            id: d._id,
            name: d.name
          })) || []
        }
      };
    });
    
    console.log(`Campaigns affecting this cook: ${result.length}`);
    
    res.status(200).json({
      success: true,
      data: {
        campaigns: result,
        totalCount: result.length,
        summary: {
          totalActiveCampaigns: result.length,
          discountCampaigns: result.filter(c => c.type === 'DISCOUNT').length,
          couponCampaigns: result.filter(c => c.type === 'COUPON').length,
          totalAffectedDishes: result.reduce((sum, c) => sum + c.affectedDishCount, 0)
        }
      }
    });
  } catch (err) {
    console.error('Get cook campaign impact error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = exports;
