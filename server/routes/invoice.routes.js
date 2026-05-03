const express = require('express');
const router = express.Router();
const {
  getCookInvoices,
  getCookInvoiceById,
  downloadInvoicePDF,
  updateInvoicePaymentLink,
  markInvoiceAsPaid,
  getLatestInvoiceForCook,
  generateAllInvoices,
  getCurrentCyclePreview,
  addPayout,
  getAdminInvoices,
  getAdminInvoiceById
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

// DEV ONLY - unprotected route for testing (MUST be before protected routes)
if (process.env.NODE_ENV === 'development') {
  router.get('/cook/invoices/test-no-auth', async (req, res) => {
    try {
      const Invoice = require('../models/Invoice');
      const invoices = await Invoice.find({})
        .populate('cook', 'name storeName email')
        .sort({ createdAt: -1 })
        .limit(10);
      res.json({ success: true, count: invoices.length, invoices, message: 'DEV MODE - NO AUTH REQUIRED' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
}

// Cook routes - protected by cook role
router.route('/cook/invoices')
  .get(protect, authorize('cook'), getCookInvoices);

router.route('/cook/invoices/:id')
  .get(protect, authorize('cook'), getCookInvoiceById);

router.route('/cook/invoices/:id/pdf')
  .get(protect, authorize('cook'), downloadInvoicePDF);

// ─── Admin routes ────────────────────────────────────────────────────────────
// IMPORTANT: Named/static admin routes must appear BEFORE parameterised /:id routes
// to avoid Express swallowing them (Known Trap pattern).

// List all invoices
router.route('/admin/invoices')
  .get(protect, authorize('admin'), getAdminInvoices);

// Current cycle live preview (MUST be before /admin/invoices/:id)
router.route('/admin/invoices/current-cycle')
  .get(protect, authorize('admin'), getCurrentCyclePreview);

// Bulk invoice generation (MUST be before /admin/invoices/:id)
router.route('/admin/invoices/generate-all')
  .post(protect, authorize('admin'), generateAllInvoices);

// Invoice detail by ID (parameterised — comes after all static routes)
router.route('/admin/invoices/:id')
  .get(protect, authorize('admin'), getAdminInvoiceById);

// Per-invoice actions
router.route('/admin/invoices/:id/payment-link')
  .put(protect, authorize('admin'), updateInvoicePaymentLink);

router.route('/admin/invoices/:id/mark-paid')
  .post(protect, authorize('admin'), markInvoiceAsPaid);

router.route('/admin/invoices/:id/payouts')
  .post(protect, authorize('admin'), addPayout);

// Cook-specific latest invoice (admin view)
router.route('/admin/cooks/:cookId/latest-invoice')
  .get(protect, authorize('admin'), getLatestInvoiceForCook);

module.exports = router;
