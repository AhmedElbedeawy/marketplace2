const express = require('express');
const router = express.Router();
const { protect, authorize, adminOnly } = require('../middleware/auth');
const {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  generateCoupons,
  toggleCouponStatus,
  getCampaignRedemptions,
  getDropdownData,
  activateCampaign,
  getCookCampaignImpact
} = require('../controllers/campaignController');

// Read endpoints - authenticated users can view
router.get('/', protect, getAllCampaigns);
router.get('/dropdown-data', protect, adminOnly, getDropdownData);

// Cook-specific read-only endpoint: Get active campaigns affecting this cook's dishes
// MUST be above /:id route to avoid "impact" being matched as an ID parameter
router.get('/impact/my-dishes', protect, authorize('cook'), getCookCampaignImpact);

// Dynamic route for single campaign - MUST be after specific routes
router.get('/:id', protect, getCampaignById);

// Write endpoints - admin only
router.post('/', protect, adminOnly, createCampaign);
router.put('/:id', protect, adminOnly, updateCampaign);
router.post('/:id/activate', protect, adminOnly, activateCampaign);
router.delete('/:id', protect, adminOnly, deleteCampaign);

// Coupon routes - admin only
router.post('/:id/coupons', protect, adminOnly, generateCoupons);
router.patch('/coupons/:couponId/toggle', protect, adminOnly, toggleCouponStatus);

// Redemption routes - admin only
router.get('/:id/redemptions', protect, adminOnly, getCampaignRedemptions);

module.exports = router;
