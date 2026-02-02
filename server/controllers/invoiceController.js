const Invoice = require('../models/Invoice');
const Cook = require('../models/Cook');
const AdminActionLog = require('../models/AdminActionLog');
const invoiceService = require('../services/invoiceService');

// @desc    Generate monthly invoice for a cook
// @route   POST /api/admin/invoices/generate
// @access  Private/Admin
const generateInvoice = async (req, res) => {
  try {
    const { cookId, periodMonth } = req.body;

    if (!cookId || !periodMonth) {
      return res.status(400).json({
        success: false,
        message: 'Cook ID and period month (YYYY-MM) are required'
      });
    }

    const invoice = await invoiceService.generateMonthlyInvoice(cookId, periodMonth, req.user._id);

    // Log admin action
    await AdminActionLog.create({
      admin: req.user._id,
      action: 'GENERATE_INVOICE',
      resource: 'invoice',
      resourceId: invoice._id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        cook: cookId,
        periodMonth
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error generating invoice'
    });
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
    
    const query = { cook: cook._id };
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

    // Log admin action
    await AdminActionLog.create({
      admin: req.user._id,
      action: 'UPDATE_INVOICE_PAYMENT_LINK',
      resource: 'invoice',
      resourceId: invoice._id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        cook: invoice.cook,
        periodMonth: invoice.periodMonth,
        paymentLinkSet: true
      },
      ipAddress: req.ip
    });

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

    // Log admin action
    await AdminActionLog.create({
      admin: req.user._id,
      action: 'MARK_INVOICE_PAID',
      resource: 'invoice',
      resourceId: invoice._id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        cook: invoice.cook,
        periodMonth: invoice.periodMonth,
        amountPaid: invoice.amountDue,
        currency: invoice.currency
      },
      ipAddress: req.ip
    });

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

        // Log unsuspension action
        await AdminActionLog.create({
          admin: req.user._id,
          action: 'UNSUSPEND_COOK',
          resource: 'cook',
          resourceId: cook._id,
          details: {
            cookName: cook.name,
            reason: 'Invoice paid - auto-unsuspend',
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber
          },
          ipAddress: req.ip
        });
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

module.exports = {
  getCookInvoices,
  getCookInvoiceById,
  downloadInvoicePDF,
  updateInvoicePaymentLink,
  markInvoiceAsPaid,
  getLatestInvoiceForCook,
  generateInvoice,
  addPayout
};
