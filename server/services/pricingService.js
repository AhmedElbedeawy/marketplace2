const Campaign = require('../models/Campaign');
const Coupon = require('../models/Coupon');
const CampaignRedemption = require('../models/CampaignRedemption');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const { getCountryContext } = require('../utils/countryContext');
const mongoose = require('mongoose');

/**
 * Main pricing function - recalculates prices for checkout session
 * Called whenever: address changes, coupon applied/removed, payment selected, order confirmed
 */
exports.calculatePricing = async (cartSnapshot, appliedCouponCode, userId, countryCode = 'SA') => {
  const context = getCountryContext(countryCode);
  const normalizedCountryCode = context.countryCode;
  const currencyCode = context.currencyCode;

  console.log(`🧮 calculatePricing: Starting for user=${userId}, country=${normalizedCountryCode}, currency=${currencyCode}, coupon=${appliedCouponCode}`);
  
  try {
    // 0. Get VAT Settings for the country
    const settings = await Settings.getSettings();
    
    // 1. Calculate subtotal (already inclusive of VAT per requirement)
    let subtotal = 0;
    for (const item of cartSnapshot) {
      subtotal += Number(item.unitPrice) * Number(item.quantity);
    }

    // 2. Get active DISCOUNT campaigns (auto-apply)
    const autoDiscounts = await getApplicableDiscounts(cartSnapshot, userId);
    const autoDiscountAmount = Number(autoDiscounts.reduce((sum, d) => sum + d.amount, 0));

    // 3. Apply coupon if provided
    let couponDiscount = 0;
    let appliedCoupon = null;
    
    if (appliedCouponCode) {
      const couponResult = await applyCoupon(appliedCouponCode, cartSnapshot, userId, subtotal);
      if (couponResult.success) {
        couponDiscount = Number(couponResult.discountAmount);
        appliedCoupon = couponResult.coupon;
      }
    }

    // 4. Calculate delivery fee from cart items
    // Only charge for delivery items, sum all delivery fees
    let deliveryFee = 0;
    for (const item of cartSnapshot) {
      if (item.fulfillmentMode === 'delivery') {
        deliveryFee += Number(item.deliveryFee || 0);
      }
    }

    // 5. Calculate VAT Breakdown (INCLUSIVE)
    let vatAmount = 0;
    let vatRate = 0;
    let vatLabel = 'VAT';
    let netTotal = 0;

    // Prices shown in marketplace are VAT-inclusive already.
    // finalTotal = subtotal - discounts + delivery
    const grossTotal = Number((subtotal - autoDiscountAmount - couponDiscount + deliveryFee).toFixed(2));
    
    console.log(`🧮 [PRICING] subtotal=${subtotal}, autoDiscount=${autoDiscountAmount}, couponDiscount=${couponDiscount}, deliveryFee=${deliveryFee}, grossTotal=${grossTotal}`);

    // Strict VAT lookup: Only use what is in settings for this exact country code
    const countryVAT = settings.vatByCountry?.find(v => v.countryCode.toUpperCase().trim() === normalizedCountryCode);
    const isVatEnabled = countryVAT ? (countryVAT.checkoutVatEnabled === true) : false;
    const settingsVatRate = isVatEnabled && countryVAT ? Number(countryVAT.checkoutVatRate) : 0;

    console.log(`🌍 [VAT INFO] country=${normalizedCountryCode}, isVatEnabled=${isVatEnabled}, settingsVatRate=${settingsVatRate}`);

    if (isVatEnabled && settingsVatRate > 0) {
      vatRate = settingsVatRate;
      vatLabel = countryVAT.vatLabel || 'VAT';
      
      // Math: Net = Gross / (1 + rate/100)
      netTotal = grossTotal / (1 + (vatRate / 100));
      
      // Math: VAT = Gross - Net
      vatAmount = grossTotal - netTotal;
      
      console.log(`✅ [VAT CALC] netTotal=${netTotal.toFixed(2)}, vatAmount=${vatAmount.toFixed(2)}`);
    } else {
      netTotal = grossTotal;
      vatAmount = 0;
      vatRate = 0;
      console.log(`ℹ️ [VAT SKIP] VAT disabled or 0% for ${normalizedCountryCode}. netTotal = grossTotal = ${netTotal}`);
    }

    // Defensive check: if netTotal is still 0 but grossTotal is > 0, something is wrong
    if (netTotal === 0 && grossTotal > 0) {
      console.warn('⚠️ [PRICING WARNING] netTotal is 0 while grossTotal is > 0. Falling back.');
      netTotal = grossTotal;
    }

    // Debug info for the panel (Mandatory)
    const debugInfo = {
      selectedCountryFromButton: countryCode,
      resolvedCountryCode: normalizedCountryCode,
      resolvedCurrencyCode: currencyCode,
      settingsLookupKeyUsed: normalizedCountryCode,
      checkoutVatEnabled: isVatEnabled,
      checkoutVatRate: vatRate,
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee: Number(deliveryFee.toFixed(2)),
      grossTotal: Number(grossTotal.toFixed(2)),
      netTotal: Number(netTotal.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      finalTotal: Number(grossTotal.toFixed(2)) // ✅ total must NOT increase
    };

    console.log(`📦 [DEBUG] VAT Inclusive Calculation (${normalizedCountryCode}):`, JSON.stringify(debugInfo));

    return {
      success: true,
      pricingBreakdown: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        autoDiscount: parseFloat(autoDiscountAmount.toFixed(2)),
        couponDiscount: parseFloat(couponDiscount.toFixed(2)),
        deliveryFee: parseFloat(deliveryFee.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        netTotal: parseFloat(netTotal.toFixed(2)),
        total: parseFloat(grossTotal.toFixed(2)),
        vatRate,
        vatLabel,
        checkoutVatEnabled: isVatEnabled,
        countryCode: normalizedCountryCode,
        currencyCode: currencyCode,
        debug: debugInfo
      },
      appliedCoupon,
      autoDiscounts
    };
  } catch (error) {
    console.error('Pricing calculation error:', error);
    throw error;
  }
};

/**
 * Get applicable automatic discount campaigns
 */
async function getApplicableDiscounts(cartSnapshot, userId) {
  const now = new Date();
  
  // Get active DISCOUNT campaigns
  const campaigns = await Campaign.find({
    type: 'DISCOUNT',
    status: 'ACTIVE',
    startAt: { $lte: now },
    endAt: { $gte: now }
  });

  const applicableDiscounts = [];

  for (const campaign of campaigns) {
    // Check if user already redeemed (once per user)
    const previousRedemption = await CampaignRedemption.findOne({
      campaign: campaign._id,
      user: userId
    });

    if (previousRedemption) continue; // Already used

    // Check scope
    if (!checkCampaignScope(campaign, cartSnapshot)) continue;

    // Calculate discount
    const eligibleSubtotal = calculateEligibleSubtotal(campaign, cartSnapshot);
    if (eligibleSubtotal < campaign.minOrderValue) continue;

    let discountAmount = (eligibleSubtotal * campaign.discountPercent) / 100;
    
    // Apply cap if exists
    if (campaign.maxDiscountAmount && discountAmount > campaign.maxDiscountAmount) {
      discountAmount = campaign.maxDiscountAmount;
    }

    applicableDiscounts.push({
      campaignId: campaign._id,
      campaignName: campaign.name,
      amount: discountAmount
    });
  }

  return applicableDiscounts;
}

/**
 * Apply and validate coupon
 */
async function applyCoupon(code, cartSnapshot, userId, subtotal) {
  // Find coupon
  const coupon = await Coupon.findOne({ 
    code: code.toUpperCase(), 
    status: 'ACTIVE' 
  }).populate('campaign');

  if (!coupon) {
    return { success: false, error: 'Invalid coupon code' };
  }

  const campaign = coupon.campaign;

  // Check campaign status and dates
  const now = new Date();
  if (campaign.status !== 'ACTIVE') {
    return { success: false, error: 'This campaign is no longer active' };
  }
  if (now < campaign.startAt || now > campaign.endAt) {
    return { success: false, error: 'Coupon has expired' };
  }

  // Check if user already redeemed this coupon/campaign
  const previousRedemption = await CampaignRedemption.findOne({
    campaign: campaign._id,
    user: userId
  });

  if (previousRedemption) {
    return { success: false, error: 'You have already used this coupon' };
  }

  // Check scope
  if (!checkCampaignScope(campaign, cartSnapshot)) {
    return { success: false, error: 'Coupon is not applicable to items in your cart' };
  }

  // Calculate eligible subtotal
  const eligibleSubtotal = calculateEligibleSubtotal(campaign, cartSnapshot);
  
  // Check min order value
  if (eligibleSubtotal < campaign.minOrderValue) {
    return { 
      success: false, 
      error: `Minimum order value of $${campaign.minOrderValue} required` 
    };
  }

  // Calculate discount
  let discountAmount = (eligibleSubtotal * campaign.discountPercent) / 100;
  
  // Apply cap
  if (campaign.maxDiscountAmount && discountAmount > campaign.maxDiscountAmount) {
    discountAmount = campaign.maxDiscountAmount;
  }

  return {
    success: true,
    discountAmount,
    coupon: {
      code: coupon.code,
      campaignId: campaign._id,
      discountAmount
    }
  };
}

/**
 * Check if campaign scope matches cart items
 */
function checkCampaignScope(campaign, cartSnapshot) {
  // Apply to all
  if (campaign.scope.applyToAll) return true;

  // Check if any cart item matches scope
  for (const item of cartSnapshot) {
    // Check cook
    if (campaign.scope.cookIds && campaign.scope.cookIds.length > 0) {
      if (campaign.scope.cookIds.some(id => id.toString() === item.cook.toString())) {
        return true;
      }
    }

    // Check dish
    if (campaign.scope.dishIds && campaign.scope.dishIds.length > 0) {
      if (campaign.scope.dishIds.some(id => id.toString() === item.dish.toString())) {
        return true;
      }
    }

    // Note: Category checking would require populating product.category
    // For now, we'll handle cook and dish scopes
  }

  return false;
}

/**
 * Calculate subtotal for items eligible under campaign scope
 */
function calculateEligibleSubtotal(campaign, cartSnapshot) {
  if (campaign.scope.applyToAll) {
    return cartSnapshot.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }

  let eligibleSubtotal = 0;

  for (const item of cartSnapshot) {
    let isEligible = false;

    // Check cook scope
    if (campaign.scope.cookIds && campaign.scope.cookIds.length > 0) {
      if (campaign.scope.cookIds.some(id => id.toString() === item.cook.toString())) {
        isEligible = true;
      }
    }

    // Check dish scope
    if (campaign.scope.dishIds && campaign.scope.dishIds.length > 0) {
      if (campaign.scope.dishIds.some(id => id.toString() === item.dish.toString())) {
        isEligible = true;
      }
    }

    if (isEligible) {
      eligibleSubtotal += item.unitPrice * item.quantity;
    }
  }

  return eligibleSubtotal;
}

/**
 * Record redemption after successful order
 */
exports.recordRedemption = async (campaign, coupon, user, order, discountAmount, checkoutSession) => {
  await CampaignRedemption.create({
    campaign: campaign._id,
    coupon: coupon ? coupon._id : null,
    user: user._id,
    order: order._id,
    discountAmount,
    checkoutSession: checkoutSession._id
  });

  // Increment coupon redemption count
  if (coupon) {
    await Coupon.findByIdAndUpdate(coupon._id, {
      $inc: { redemptionsCount: 1 }
    });
  }
};
