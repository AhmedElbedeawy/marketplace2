const Invoice = require('../models/Invoice');
const { Order } = require('../models/Order');
const Cook = require('../models/Cook');
const Settings = require('../models/Settings');
const mongoose = require('mongoose');

/**
 * Generate a monthly invoice for a cook
 * @param {string} cookId - ID of the cook
 * @param {string} periodMonth - YYYY-MM
 * @param {string} adminId - ID of the admin generating the invoice
 */
exports.generateMonthlyInvoice = async (cookId, periodMonth, adminId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cook = await Cook.findById(cookId);
    if (!cook) throw new Error('Cook not found');

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ cook: cookId, periodMonth });
    if (existingInvoice && existingInvoice.status !== 'void') {
      throw new Error(`Invoice for ${periodMonth} already exists for this cook`);
    }

    // Define date range for the month
    const [year, month] = periodMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Find all delivered sub-orders for this cook in the period
    // We need to look into Order.subOrders
    const orders = await Order.find({
      'subOrders.cook': cookId,
      'subOrders.status': 'delivered',
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();

    if (orders.length === 0) {
      throw new Error('No delivered orders found for this period');
    }

    let totalGross = 0;
    let totalCommission = 0;
    let totalVat = 0;
    let lineItems = [];

    // Fetch settings to get country-specific VAT info (for the snapshot on the invoice itself)
    const settings = await Settings.findOne();

    for (const order of orders) {
      const subOrder = order.subOrders.find(so => so.cook.toString() === cookId.toString());
      if (!subOrder) continue;

      // Rule: aggregate stored order snapshots
      // Order model has vatSnapshot: { vatAmount, vatRate, vatEnabled, vatLabel }
      // AND subOrders might have their own breakdown if we implemented it that way.
      // Let's check Order model again to be sure where VAT is stored.
      
      const orderVat = order.vatSnapshot?.vatAmount || 0;
      // Since it's a marketplace, we might need to decide if VAT is per sub-order or per order.
      // Usually VAT is on the whole order. If multiple cooks, we might need to split it or it's on the platform fee.
      // User says: "Cook Invoice VAT... Apply VAT at invoice level based on stored order totals."
      
      // For now, let's assume the order's vatSnapshot applies to the cook's part if there's only one cook, 
      // or we use the specific VAT logic for cook invoices.
      
      // User requirement: "Cook Invoice VAT (Separate From Checkout VAT). Invoice VAT is controlled only by invoiceVatEnabled."
      // Wait, if it's separate, then the VAT at checkout is what the customer pays. 
      // The VAT on the Cook Invoice is what the cook pays the platform (or vice versa).
      
      const gross = subOrder.totalAmount || 0;
      const commission = subOrder.commissionAmount || 0;
      
      // Calculate VAT for this specific line item based on the "Cook Invoice VAT" rule
      // aggregation: sum(commission * snapshotted_invoice_vat_rate)
      
      let itemVat = 0;
      let itemVatRate = 0;
      let itemVatEnabled = false;

      if (order.vatSnapshot?.invoiceVatEnabledAtOrder !== undefined) {
        // Use snapshotted values
        itemVatEnabled = order.vatSnapshot.invoiceVatEnabledAtOrder;
        itemVatRate = order.vatSnapshot.invoiceVatRateAtOrder || 0;
      } else if (countryVAT) {
        // Fallback for older orders without snapshot
        itemVatEnabled = countryVAT.invoiceVatEnabled;
        itemVatRate = countryVAT.invoiceVatRate;
      }

      if (itemVatEnabled) {
        itemVat = (commission * itemVatRate) / 100;
      }
      
      totalGross += gross;
      totalCommission += commission;
      totalVat += itemVat;
      
      lineItems.push({
        order: order._id,
        subOrder: subOrder._id,
        description: `Order #${order.orderNumber}`,
        gross,
        commission,
        vat: itemVat,
        net: gross - commission - itemVat
      });
    }

    // Determine final VAT snapshot for the invoice header
    const countryCode = orders[0].deliveryAddress?.countryCode || orders[0].address?.countryCode || 'SA';
    const firstOrderSnapshot = orders[0].vatSnapshot;
    
    let vatRate = firstOrderSnapshot?.invoiceVatRateAtOrder || 0;
    let vatLabel = firstOrderSnapshot?.vatLabel || 'VAT';
    let vatEnabled = firstOrderSnapshot?.invoiceVatEnabledAtOrder || false;

    // If no snapshot in first order, use current settings as fallback
    if (firstOrderSnapshot?.invoiceVatEnabledAtOrder === undefined && countryVAT) {
      vatEnabled = countryVAT.invoiceVatEnabled;
      vatRate = countryVAT.invoiceVatRate;
      vatLabel = countryVAT.vatLabel || 'VAT';
    }

    const averageCommissionRate = totalGross > 0 ? (totalCommission / totalGross) * 100 : 0;
    const invoiceNumber = `INV-${periodMonth.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoice = new Invoice({
      cook: cookId,
      periodMonth,
      invoiceNumber,
      status: 'draft',
      grossAmount: totalGross,
      commissionAmount: totalCommission,
      commissionRate: averageCommissionRate,
      vatAmount: totalVat,
      netAmount,
      amountDue: totalGross - totalCommission - totalVat,
      currency: orders[0].currency || 'SAR',
      countryCode,
      vatSnapshot: {
        vatEnabled,
        vatRate,
        vatLabel
      },
      lineItems,
      createdBy: adminId
    });

    await newInvoice.save({ session });
    await session.commitTransaction();

    return newInvoice;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
