const express = require('express');
const router = express.Router();
const { getComprehensiveDashboardData } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

// Comprehensive dashboard data with all filters
router.route('/comprehensive')
  .get(protect, authorize('admin', 'super_admin'), getComprehensiveDashboardData);

module.exports = router;
