const express = require('express');
const router = express.Router();
const multer = require('multer');
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

// Configure multer for file uploads (disk storage for categories)
const path = require('path');
const fs = require('fs');

// Category upload directory
const CATEGORY_UPLOAD_DIR = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR, 'categories')
  : path.join(__dirname, '../uploads/categories');

const WEB_DIR = path.join(CATEGORY_UPLOAD_DIR, 'web');
const MOBILE_DIR = path.join(CATEGORY_UPLOAD_DIR, 'mobile');

// Ensure directories exist
[CATEGORY_UPLOAD_DIR, WEB_DIR, MOBILE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.fieldname === 'iconWeb' ? WEB_DIR : MOBILE_DIR;
    cb(null, type);
  },
  filename: (req, file, cb) => {
    const categoryId = req.params.id || 'new';
    const type = file.fieldname === 'iconWeb' ? 'web' : 'mobile';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${categoryId}-${type}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter
});

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
  .post(upload.fields([{ name: 'iconWeb', maxCount: 1 }, { name: 'iconMobile', maxCount: 1 }]), createCategory);

router.route('/categories/:id')
  .put(upload.fields([{ name: 'iconWeb', maxCount: 1 }, { name: 'iconMobile', maxCount: 1 }]), updateCategory)
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