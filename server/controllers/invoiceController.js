const Invoice = require('../models/Invoice');
const Cook = require('../models/Cook');
const AdminActionLog = require('../models/AdminActionLog');
const invoiceService = require('../services/invoiceService');

// @desc    Generate invoices for ALL eligible cooks for a given period
// @route   POST /api/admin/invoices/generate-all
// @access  Private/Admin
const generateAllInvoices = async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'periodStart and periodEnd (ISO date strings) are required'
      });
    }

    const start = new Date(periodStart);
    const end   = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date values' });
    }
    if (start > end) {
      return res.status(400).json({ success: false, message: 'periodStart must be before periodEnd' });
    }

    const results = await invoiceService.generateAllInvoices(start, end, req.user._id);

    // Log the bulk action — non-fatal: invoice generation is already committed.
    try {
      await AdminActionLog.create({
        adminUser:  req.user._id,
        actionType: 'OTHER',
        targetType: 'other',
        targetId:   req.user._id,   // bulk action has no single target; use admin's own id
        reason: `Bulk invoice generation: ${results.generated} generated, ` +
                `${results.skipped} skipped (no orders), ${results.errors.length} errors. ` +
                `Period ${start.toISOString().slice(0,10)} → ${end.toISOString().slice(0,10)}`,
        ipAddress: req.ip,
      });
    } catch (logErr) {
      console.error('AdminActionLog failed (non-fatal):', logErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Generated ${results.generated} invoice(s). Skipped ${results.skipped} (no orders). Errors: ${results.errors.length}.`,
      data: results
    });
  } catch (error) {
    console.error('Error generating invoices:', error);
    res.status(400).json({ success: false, message: error.message || 'Error generating invoices' });
  }
};

// @desc    Get live "Current Cycle" uninvoiced preview for all cooks
// @route   GET /api/admin/invoices/current-cycle
// @access  Private/Admin
const getCurrentCyclePreview = async (req, res) => {
  try {
    const previews = await invoiceService.getCurrentCyclePreview();
    res.status(200).json({ success: true, data: previews });
  } catch (error) {
    console.error('Error fetching current cycle preview:', error);
    res.status(500).json({ success: false, message: 'Server error fetching current cycle preview' });
  }
};

// @desc    Get invoices for authenticated cook
// @route   GET /api/cook/invoices
// @access  Private/Cook
const getCookInvoices = async (req, res) => {
  try {
    // Find cook by user ID
    const cook = await Cook.findOne({ userId: req.user._id });
    
    if (!cook) {
      // No cook record yet - return empty list (same as no invoices)
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      });
    }

    const { status, periodMonth, page = 1, limit = 20 } = req.query;
    
    // Cook sees only invoices that have a payment link published, or that are already paid.
    // This ensures draft/issued invoices without a payment link are invisible until admin publishes them.
    const query = {
      cook: cook._id,
      $or: [
        { paymentLink: { $exists: true, $ne: '' } },
        { status: 'paid' }
      ]
    };
    if (status) query.status = status;
    if (periodMonth) query.periodMonth = periodMonth;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const invoices = await Invoice.find(query)
      .sort({ periodMonth: -1, issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-lineItems -payouts')
      .lean();

    const total = await Invoice.countDocuments(query);

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching cook invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching invoices'
    });
  }
};

// @desc    Get invoice details by ID for authenticated cook
// @route   GET /api/cook/invoices/:id
// @access  Private/Cook
const getCookInvoiceById = async (req, res) => {
  try {
    // Find cook by user ID
    const cook = await Cook.findOne({ userId: req.user._id });
    
    if (!cook) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as a cook'
      });
    }

    const invoice = await Invoice.findById(req.params.id)
      .populate('lineItems.order', 'orderNumber createdAt')
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Verify ownership
    if (invoice.cook.toString() !== cook._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this invoice'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching cook invoice details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching invoice details'
    });
  }
};

// @desc    Download invoice as PDF
// @route   GET /api/cook/invoices/:id/pdf
// @access  Private/Cook
const downloadInvoicePDF = async (req, res) => {
  try {
    // Find cook by user ID
    const cook = await Cook.findOne({ userId: req.user._id }).populate('userId', 'name email');
    
    if (!cook) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as a cook'
      });
    }

    const invoice = await Invoice.findById(req.params.id).lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Verify ownership
    if (invoice.cook.toString() !== cook._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this invoice'
      });
    }

    // Generate simple PDF content (HTML format)
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-info { margin-bottom: 20px; }
          .line { border-bottom: 1px solid #ddd; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p>${invoice.invoiceNumber}</p>
        </div>
        <div class="invoice-info">
          <p><strong>Cook:</strong> ${cook.storeName || cook.name}</p>
          <p><strong>Email:</strong> ${cook.email}</p>
          <p><strong>Period:</strong> ${invoice.periodMonth}</p>
          <p><strong>Issued Date:</strong> ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
        </div>
        <div class="line"></div>
        <table>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
          <tr>
            <td>Gross Sales</td>
            <td style="text-align: right;">${invoice.grossAmount.toFixed(2)} ${invoice.currency}</td>
          </tr>
          <tr>
            <td>Platform Commission (${invoice.commissionRate}%)</td>
            <td style="text-align: right;">-${invoice.commissionAmount.toFixed(2)} ${invoice.currency}</td>
          </tr>
          ${invoice.vatAmount > 0 ? `
          <tr>
            <td>VAT (${invoice.vatSnapshot?.vatRate || 0}% on commission)</td>
            <td style="text-align: right;">-${invoice.vatAmount.toFixed(2)} ${invoice.currency}</td>
          </tr>` : ''}
          <tr class="total">
            <td>Net Amount Payable</td>
            <td style="text-align: right;">${invoice.netAmount.toFixed(2)} ${invoice.currency}</td>
          </tr>
        </table>
        <div class="line"></div>
        <p style="text-align: center; color: #666; font-size: 12px;">Thank you for your service!</p>
      </body>
      </html>
    `;

    // Set headers for PDF download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.html"`);
    res.send(html);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating PDF'
    });
  }
};
// @route   PUT /api/admin/invoices/:id/payment-link
// @access  Private/Admin
const updateInvoicePaymentLink = async (req, res) => {
  try {
    const { paymentLink } = req.body;

    if (!paymentLink || typeof paymentLink !== 'string' || paymentLink.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Payment link is required'
      });
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Update payment link
    invoice.paymentLink = paymentLink.trim();
    invoice.paymentLinkUpdatedAt = new Date();
    invoice.paymentLinkUpdatedBy = req.user._id;
    invoice.updatedBy = req.user._id;

    await invoice.save();

    // Notify the cook that their invoice is ready for payment
    try {
      const { createNotification } = require('../utils/notifications');
      const cookRecord = await Cook.findById(invoice.cook);
      if (cookRecord?.userId) {
        const [monthStr, yearStr] = (() => {
          const d = new Date(invoice.periodMonth + '-01');
          return [d.toLocaleString('en-US', { month: 'long' }), d.getFullYear()];
        })();
        await createNotification({
          userId: cookRecord.userId.toString(),
          role: 'cook',
          title: `Invoice Ready: ${monthStr} ${yearStr}`,
          message: `Your invoice for ${monthStr} ${yearStr} is ready. Tap to pay.`,
          titleAr: `الفاتورة جاهزة: ${monthStr} ${yearStr}`,
          messageAr: `فاتورتك لشهر ${monthStr} ${yearStr} جاهزة. اضغط للدفع.`,
          type: 'system',
          entityType: 'general',
          entityId: invoice._id.toString(),
          deepLink: '/cook/invoices',
        });
      }
    } catch (notifErr) {
      console.error('Failed to send invoice-ready notification:', notifErr.message);
      // Non-fatal — invoice update already saved
    }

    // Log admin action — non-fatal
    try {
      await AdminActionLog.create({
        adminUser:  req.user._id,
        actionType: 'OTHER',
        targetType: 'other',
        targetId:   invoice._id,
        reason: `Payment link set for invoice ${invoice.invoiceNumber} (${invoice.periodMonth})`,
        ipAddress: req.ip,
      });
    } catch (logErr) {
      console.error('AdminActionLog failed (non-fatal):', logErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Payment link updated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Error updating invoice payment link:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating payment link'
    });
  }
};

// @desc    Mark invoice as paid
// @route   POST /api/admin/invoices/:id/mark-paid
// @access  Private/Admin
const markInvoiceAsPaid = async (req, res) => {
  try {
    const { autoUnsuspend = false } = req.body;

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already marked as paid'
      });
    }

    // Mark invoice as paid
    await invoice.markAsPaid(req.user._id);

    // Log mark-paid action — non-fatal
    try {
      await AdminActionLog.create({
        adminUser:  req.user._id,
        actionType: 'OTHER',
        targetType: 'other',
        targetId:   invoice._id,
        reason: `Invoice ${invoice.invoiceNumber} (${invoice.periodMonth}) marked as paid. Amount: ${invoice.amountDue} ${invoice.currency}`,
        ipAddress: req.ip,
      });
    } catch (logErr) {
      console.error('AdminActionLog failed (non-fatal):', logErr.message);
    }

    // Auto-unsuspend logic
    let cookUnsuspended = false;
    if (autoUnsuspend) {
      const cook = await Cook.findById(invoice.cook);

      if (cook && cook.status === 'suspended' && cook.suspensionReason === 'unpaid_invoice') {
        cook.status = 'active';
        cook.suspensionReason = null;
        cook.suspendedAt = null;
        cook.suspendedBy = null;
        await cook.save();

        cookUnsuspended = true;

        // Log unsuspension action — non-fatal
        try {
          await AdminActionLog.create({
            adminUser:  req.user._id,
            actionType: 'OTHER',
            targetType: 'cook',
            targetId:   cook._id,
            reason: `Cook auto-unsuspended after invoice ${invoice.invoiceNumber} marked paid`,
            ipAddress: req.ip,
          });
        } catch (logErr) {
          console.error('AdminActionLog (unsuspend) failed (non-fatal):', logErr.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: {
        invoice,
        cookUnsuspended
      }
    });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking invoice as paid'
    });
  }
};

// @desc    Get latest invoice for a cook (Admin)
// @route   GET /api/admin/cooks/:cookId/latest-invoice
// @access  Private/Admin
const getLatestInvoiceForCook = async (req, res) => {
  try {
    const invoice = await Invoice.getLatestForCook(req.params.cookId);
    
    if (!invoice) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        periodMonth: invoice.periodMonth,
        netAmount: invoice.netAmount,
        currency: invoice.currency,
        issuedAt: invoice.issuedAt,
        dueAt: invoice.dueAt
      }
    });
  } catch (error) {
    console.error('Error fetching latest invoice for cook:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching latest invoice'
    });
  }
};

/**
 * @desc    Add a payout record to an invoice
 * @route   POST /api/admin/invoices/:id/payouts
 * @access  Private/Admin
 */
const addPayout = async (req, res) => {
  try {
    const { method, referenceId, status, notes, amount } = req.body;
    const invoiceId = req.params.id;

    if (!method || !status) {
      return res.status(400).json({
        success: false,
        message: 'Method and status are required'
      });
    }

    const invoice = await Invoice.findById(invoiceId).populate({
      path: 'cook',
      populate: { path: 'userId' }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const payout = {
      method,
      referenceId,
      status,
      notes,
      amount,
      requestedAt: new Date()
    };

    if (status === 'completed') {
      payout.paidAt = new Date();
    }

    invoice.payouts.push(payout);
    
    // If status is completed, update amountPaid
    if (status === 'completed' && amount) {
      invoice.amountPaid = (invoice.amountPaid || 0) + parseFloat(amount);
      if (invoice.amountPaid >= invoice.amountDue) {
        invoice.status = 'paid';
        invoice.paidAt = new Date();
      }
    }

    await invoice.save();

    // NOTIFY COOK: Payout status change
    const { createNotification } = require('../utils/notifications');
    try {
      const cookUserId = invoice.cook.userId._id || invoice.cook.userId;
      
      let title, message, type;
      if (status === 'completed') {
        title = 'Payout Processed';
        message = 'Your payout has been processed.';
        type = 'payout';
      } else if (status === 'failed') {
        title = 'Payout Failed';
        message = 'Your payout has failed. Please check your details.';
        type = 'payout_failed';
      }

      if (title) {
        await createNotification({
          userId: cookUserId,
          role: 'cook',
          title,
          message,
          type,
          entityType: 'payout',
          entityId: invoice._id, // Using invoice ID as entityId for now as payouts are sub-docs
          deepLink: '/cook/payouts'
        });
      }
    } catch (notifErr) {
      console.error('Error sending payout notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Payout added successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Error adding payout:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding payout'
    });
  }
};

// @desc    Get single invoice detail (admin)
// @route   GET /api/invoices/admin/invoices/:id
// @access  Private/Admin
const getAdminInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('cook', 'storeName name countryCode email')
      .populate('lineItems.order', 'orderNumber createdAt')
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error fetching admin invoice detail:', error);
    res.status(500).json({ success: false, message: 'Server error fetching invoice detail' });
  }
};

// @desc    List all invoices (admin)
// @route   GET /api/invoices/admin/invoices
// @access  Private/Admin
const getAdminInvoices = async (req, res) => {
  try {
    const { status, cookId, periodMonth, page = 1, limit = 20 } = req.query;

    const query = {};
    if (cookId) query.cook = cookId;
    if (periodMonth) query.periodMonth = periodMonth;

    if (status && status !== 'all') {
      if (status === 'overdue') {
        query.status = { $in: ['draft', 'issued', 'locked'] };
        query.dueAt = { $lt: new Date() };
      } else if (status === 'unpaid') {
        query.status = { $in: ['draft', 'issued', 'locked'] };
      } else {
        query.status = status;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const invoices = await Invoice.find(query)
      .populate('cook', 'storeName name countryCode')
      .sort({ periodMonth: -1, issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-lineItems -payouts')
      .lean();

    const total = await Invoice.countDocuments(query);

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching admin invoices:', error);
    res.status(500).json({ success: false, message: 'Server error fetching invoices' });
  }
};

module.exports = {
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
};
