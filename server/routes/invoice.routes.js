const express = require('express');
const router = express.Router();
const {
  getCookInvoices,
  getCookInvoiceById,
  downloadInvoicePDF,
  updateInvoicePaymentLink,
  markInvoiceAsPaid,
  getLatestInvoiceForCook,
  generateInvoice,
  addPayout
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

// Admin routes - protected by admin role
router.route('/admin/cooks/:cookId/latest-invoice')
  .get(protect, authorize('admin'), getLatestInvoiceForCook);

router.route('/admin/invoices/:id/payment-link')
  .put(protect, authorize('admin'), updateInvoicePaymentLink);

router.route('/admin/invoices/:id/mark-paid')
  .post(protect, authorize('admin'), markInvoiceAsPaid);

router.route('/admin/invoices/generate')
  .post(protect, authorize('admin'), generateInvoice);

router.route('/admin/invoices/:id/payouts')
  .post(protect, authorize('admin'), addPayout);

module.exports = router;
