const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getOrders,
  getCooks,
  approveCookRequest,
  rejectCookRequest,
  suspendCook,
  unsuspendCook,
  updateCook,
  deleteCook,
  bulkUpdateCooks,
  bulkDeleteCooks,
  getContactHistory,
  releaseContact,
  toggleAdminBoost,
  getAdminActionLogs,
  sendAnnouncement,
  getOrderIssues,
  getOrderIssueDetails,
  resolveOrderIssue,
  sendCookWarning,
  applyCookRestriction
} = require('../controllers/adminController');
const {
  getAdminExpertise,
  createExpertise,
  updateExpertise,
  deleteExpertise
} = require('../controllers/expertiseController');
const { protect, authorize } = require('../middleware/auth');

// Dashboard - Public access for initial load
router.route('/dashboard-stats')
  .get(protect, authorize('admin', 'super_admin'), getDashboardStats);

// All other routes require admin authorization
router.use(protect, authorize('admin', 'super_admin'));

// Users management
router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

// Products management
router.route('/products')
  .get(getProducts);

router.route('/products/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

// Categories management
router.route('/categories')
  .get(getCategories)
  .post(createCategory);

router.route('/categories/:id')
  .put(updateCategory)
  .delete(deleteCategory);

// Orders management
router.route('/orders')
  .get(getOrders);

// Cooks management
router.route('/cooks')
  .get(getCooks);

router.route('/cooks/:id')
  .put(updateCook)
  .delete(deleteCook);

router.post('/cooks/bulk-update', bulkUpdateCooks);
router.post('/cooks/bulk-delete', bulkDeleteCooks);

// Contact History
router.get('/contact-history', getContactHistory);
router.put('/contact-history/:id/release', releaseContact);

router.route('/cook-requests/:id/approve')
  .post(approveCookRequest);

router.route('/cook-requests/:id/reject')
  .post(rejectCookRequest);

// Cook suspension management
router.route('/cooks/:id/suspend')
  .post(suspendCook);

router.route('/cooks/:id/unsuspend')
  .post(unsuspendCook);

// Expertise Management
router.route('/expertise')
  .get(getAdminExpertise)
  .post(createExpertise);

router.route('/expertise/:id')
  .patch(updateExpertise)
  .delete(deleteExpertise);

// Admin Boost & Audit Logs
router.post('/cooks/:cookId/toggle-boost', toggleAdminBoost);
router.get('/action-logs', getAdminActionLogs);

// Announcements
router.post('/announcements', sendAnnouncement);

// Order Issues Management
router.route('/issues')
  .get(getOrderIssues);

router.route('/issues/:orderId')
  .get(getOrderIssueDetails);

router.patch('/issues/:orderId/resolve', resolveOrderIssue);

// Cook Moderation
router.post('/cooks/:id/warning', sendCookWarning);
router.post('/cooks/:id/restrict', applyCookRestriction);

module.exports = router;