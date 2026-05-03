const Campaign = require('../models/Campaign');
const Coupon = require('../models/Coupon');
const CampaignRedemption = require('../models/CampaignRedemption');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { Order } = require('../models/Order');
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

// Cook marketing dashboard — active/upcoming/expired campaigns with impact stats
exports.getCookCampaignImpact = async (req, res) => {
  try {
    const cookId = req.user._id; // User._id (subOrders.cook reference)

    // Cook's products for affected-dish resolution
    const cookProducts = await Product.find({ cook: cookId }).select('category name');
    const cookCategoryIds = [...new Set(cookProducts.map(p => p.category?.toString()).filter(Boolean))];
    const cookProductIds  = cookProducts.map(p => p._id.toString());

    // All orders that include a sub-order for this cook
    const cookOrderIds = await Order.distinct('_id', { 'subOrders.cook': cookId });

    const now = new Date();

    // Fetch all candidate campaigns (all non-draft)
    const allCampaigns = await Campaign.find({ status: { $ne: 'DRAFT' } })
      .populate('scope.cookIds',     'storeName')
      .populate('scope.categoryIds', 'name')
      .populate('scope.dishIds',     'name')
      .sort({ startAt: -1 })
      .lean();

    // Helper: does this campaign affect the cook?
    const affectsCook = (campaign) => {
      const scope = campaign.scope;
      if (scope.applyToAll) return true;
      if (scope.cookIds?.some(c => (c._id || c).toString() === cookId.toString())) return true;
      const campCatIds  = scope.categoryIds?.map(c => (c._id || c).toString()) || [];
      if (cookCategoryIds.some(id => campCatIds.includes(id))) return true;
      const campDishIds = scope.dishIds?.map(d => (d._id || d).toString()) || [];
      if (cookProductIds.some(id => campDishIds.includes(id))) return true;
      return false;
    };

    // Helper: resolve affected dishes for this cook from a campaign
    const resolveAffectedDishes = (campaign) => {
      const scope = campaign.scope;
      if (scope.applyToAll) {
        return cookProducts.map(p => ({ id: p._id, name: p.name }));
      }
      const campDishIds = scope.dishIds?.map(d => (d._id || d).toString()) || [];
      const campCatIds  = scope.categoryIds?.map(c => (c._id || c).toString()) || [];
      const seen = new Set();
      const dishes = [];
      for (const p of cookProducts) {
        if (campDishIds.includes(p._id.toString()) ||
            (p.category && campCatIds.includes(p.category.toString()))) {
          if (!seen.has(p._id.toString())) {
            seen.add(p._id.toString());
            dishes.push({ id: p._id, name: p.name });
          }
        }
      }
      return dishes;
    };

    // Build impact stats from CampaignRedemption
    const buildImpact = async (campaignId) => {
      const redemptions = await CampaignRedemption.find({
        campaign: campaignId,
        order:    { $in: cookOrderIds },
      }).lean();

      if (redemptions.length === 0) {
        return { usageCount: 0, discountedOrdersCount: 0, grossSales: 0, discountAmount: 0, netSales: 0 };
      }

      const orderIds = [...new Set(redemptions.map(r => r.order.toString()))];
      // Gross = sum of subOrder.totalAmount for this cook across those orders
      const orders = await Order.find({ _id: { $in: orderIds } }).select('subOrders').lean();
      let grossSales    = 0;
      for (const ord of orders) {
        const sub = ord.subOrders?.find(s => s.cook.toString() === cookId.toString());
        if (sub) grossSales += sub.totalAmount || 0;
      }

      const discountAmount = redemptions.reduce((sum, r) => sum + (r.discountAmount || 0), 0);

      return {
        usageCount:           redemptions.length,
        discountedOrdersCount: orderIds.length,
        grossSales:           parseFloat(grossSales.toFixed(2)),
        discountAmount:       parseFloat(discountAmount.toFixed(2)),
        netSales:             parseFloat((grossSales - discountAmount).toFixed(2)),
      };
    };

    // Classify campaigns
    const active   = [];
    const upcoming = [];
    const expired  = [];

    for (const campaign of allCampaigns) {
      if (!affectsCook(campaign)) continue;

      const affectedDishes = resolveAffectedDishes(campaign);
      const impact         = await buildImpact(campaign._id);

      const entry = {
        id:               campaign._id,
        name:             campaign.name,
        type:             campaign.type,
        status:           campaign.status,
        discountPercent:  campaign.discountPercent,
        startAt:          campaign.startAt,
        endAt:            campaign.endAt,
        minOrderValue:    campaign.minOrderValue,
        maxDiscountAmount: campaign.maxDiscountAmount,
        affectedDishCount: affectedDishes.length,
        affectedDishes:   affectedDishes.slice(0, 10),
        impact,
      };

      if (campaign.status === 'ENDED' || campaign.endAt < now) {
        expired.push(entry);
      } else if (campaign.startAt > now) {
        upcoming.push(entry);
      } else {
        active.push(entry);
      }
    }

    const allGroups = [...active, ...upcoming, ...expired];

    res.status(200).json({
      success: true,
      data: {
        active,
        upcoming,
        expired,
        summary: {
          totalCampaigns:  allGroups.length,
          activeCampaigns: active.length,
          upcomingCampaigns: upcoming.length,
          expiredCampaigns: expired.length,
          totalUsageCount:  allGroups.reduce((s, c) => s + c.impact.usageCount, 0),
          totalGrossSales:  parseFloat(allGroups.reduce((s, c) => s + c.impact.grossSales, 0).toFixed(2)),
          totalDiscount:    parseFloat(allGroups.reduce((s, c) => s + c.impact.discountAmount, 0).toFixed(2)),
          totalNetSales:    parseFloat(allGroups.reduce((s, c) => s + c.impact.netSales, 0).toFixed(2)),
        },
      },
    });
  } catch (err) {
    console.error('Get cook campaign impact error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = exports;
