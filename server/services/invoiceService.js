const Invoice = require('../models/Invoice');
const { Order } = require('../models/Order');
const Cook = require('../models/Cook');
const Settings = require('../models/Settings');
const mongoose = require('mongoose');

/**
 * Derive a YYYY-MM label from a Date (used for periodMonth field).
 */
function toPeriodMonth(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Fetch platform settings once and extract all VAT config.
 * Returns { platformFeeRate, checkoutVatEnabled, checkoutVatRate, invoiceVatEnabled, invoiceVatRate, vatLabel }
 * keyed per countryCode.
 */
async function loadSettings() {
  return Settings.findOne().lean();
}

function getCountryVatConfig(settings, countryCode) {
  const cc = (countryCode || 'SA').toUpperCase();
  const countryVAT = settings?.vatByCountry?.find((c) => c.countryCode === cc);
  return {
    checkoutVatEnabled: countryVAT?.checkoutVatEnabled ?? false,
    checkoutVatRate: countryVAT?.checkoutVatRate ?? 0,
    invoiceVatEnabled: countryVAT?.invoiceVatEnabled ?? false,
    invoiceVatRate: countryVAT?.invoiceVatRate ?? 0,
    vatLabel: countryVAT?.vatLabel ?? 'VAT',
    currencyCode: countryVAT?.currencyCode ?? 'SAR',
  };
}

/**
 * Generate a monthly invoice for a single cook over a given date range.
 * cookId must be Cook._id.
 * periodStart / periodEnd are Date objects (inclusive).
 * adminId is User._id of the acting admin.
 */
async function generateInvoiceForCook(cook, periodStart, periodEnd, settings, adminId, session) {
  const cookId = cook._id;

  // subOrders.cook stores User._id — use cook.userId to query correctly (Known Trap #3)
  const userIdForQuery = cook.userId;
  if (!userIdForQuery) throw new Error(`Cook ${cookId} has no linked userId`);

  const periodMonth = toPeriodMonth(periodStart);

  // Reject if a non-void invoice already exists for this cook overlapping this period
  const existing = await Invoice.findOne({
    cook: cookId,
    periodMonth,
    status: { $ne: 'void' },
  }).session(session);
  if (existing) {
    throw new Error(`Invoice for ${periodMonth} already exists for cook ${cook.storeName || cook.name}`);
  }

  // Find orders with a delivered/pickedup sub-order for this cook in the period
  const orders = await Order.find({
    'subOrders.cook': userIdForQuery,
    'subOrders.status': { $in: ['delivered', 'pickedup'] },
    createdAt: { $gte: periodStart, $lte: periodEnd },
  })
    .session(session)
    .lean();

  if (orders.length === 0) {
    return null; // No eligible orders — skip this cook silently in bulk generation
  }

  const countryCode =
    orders[0].deliveryAddress?.countryCode ||
    orders[0].address?.countryCode ||
    cook.countryCode ||
    'SA';

  const vatConfig = getCountryVatConfig(settings, countryCode);
  const platformFeeRate = settings?.platformSellingFee ?? 0;

  let totalGross = 0;
  let totalSalesVat = 0;
  let totalCommission = 0;
  let totalFeeVat = 0;
  const lineItems = [];

  for (const order of orders) {
    const subOrder = order.subOrders.find(
      (so) => so.cook.toString() === userIdForQuery.toString()
    );
    if (!subOrder) continue;
    if (!['delivered', 'pickedup'].includes(subOrder.status)) continue;

    const gross = subOrder.totalAmount || 0;
    const salesVat = vatConfig.checkoutVatEnabled
      ? parseFloat(((gross * vatConfig.checkoutVatRate) / 100).toFixed(2))
      : 0;
    const commission = parseFloat(((gross * platformFeeRate) / 100).toFixed(2));
    const feeVat = vatConfig.invoiceVatEnabled
      ? parseFloat(((commission * vatConfig.invoiceVatRate) / 100).toFixed(2))
      : 0;
    // net = what cook keeps after all deductions
    const net = parseFloat((gross - salesVat - commission - feeVat).toFixed(2));

    totalGross += gross;
    totalSalesVat += salesVat;
    totalCommission += commission;
    totalFeeVat += feeVat;

    lineItems.push({
      order: order._id,
      subOrder: subOrder._id,
      description: `Order #${order.orderNumber || order._id.toString().slice(-6)}`,
      gross,
      salesVat,
      commission,
      vat: feeVat,
      net,
    });
  }

  if (lineItems.length === 0) {
    return null;
  }

  // Round totals
  totalGross = parseFloat(totalGross.toFixed(2));
  totalSalesVat = parseFloat(totalSalesVat.toFixed(2));
  totalCommission = parseFloat(totalCommission.toFixed(2));
  totalFeeVat = parseFloat(totalFeeVat.toFixed(2));

  // amountDue = salesVat + platformFee + platformFeeVat
  const amountDue = parseFloat((totalSalesVat + totalCommission + totalFeeVat).toFixed(2));
  const netAmount = parseFloat((totalGross - amountDue).toFixed(2));

  const invoiceNumber = `INV-${periodMonth.replace('-', '')}-${cook._id.toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

  const newInvoice = new Invoice({
    cook: cookId,
    periodMonth,
    periodStart,
    periodEnd,
    invoiceNumber,
    status: 'issued',
    grossAmount: totalGross,
    salesVatAmount: totalSalesVat,
    commissionAmount: totalCommission,
    commissionRate: platformFeeRate,
    vatAmount: totalFeeVat,
    netAmount,
    amountDue,
    currency: orders[0].currency || vatConfig.currencyCode,
    countryCode,
    vatSnapshot: {
      vatEnabled: vatConfig.invoiceVatEnabled,
      vatRate: vatConfig.invoiceVatRate,
      vatLabel: vatConfig.vatLabel,
      salesVatEnabled: vatConfig.checkoutVatEnabled,
      salesVatRate: vatConfig.checkoutVatRate,
    },
    issuedAt: new Date(),
    lineItems,
    createdBy: adminId,
  });

  await newInvoice.save({ session });
  return newInvoice;
}

/**
 * Generate invoices for ALL active cooks for a given period.
 * Returns { generated, skipped, errors }.
 */
exports.generateAllInvoices = async (periodStart, periodEnd, adminId) => {
  const settings = await loadSettings();
  // No status/isDeleted filter — deleted and suspended cooks with financial activity
  // must still receive invoices. Per-cook order query returns null for cooks with no orders.
  const allCooks = await Cook.find({}).lean();

  const results = { generated: 0, skipped: 0, errors: [] };

  for (const cook of allCooks) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const invoice = await generateInvoiceForCook(
        cook,
        periodStart,
        periodEnd,
        settings,
        adminId,
        session
      );
      await session.commitTransaction();
      if (invoice) {
        results.generated += 1;
      } else {
        results.skipped += 1;
      }
    } catch (err) {
      await session.abortTransaction();
      results.errors.push({
        cookId: cook._id,
        cookName: cook.storeName || cook.name,
        error: err.message,
      });
    } finally {
      session.endSession();
    }
  }

  return results;
};

/**
 * Legacy single-cook generation kept for backward compatibility.
 * cookId = Cook._id, periodMonth = 'YYYY-MM'.
 */
exports.generateMonthlyInvoice = async (cookId, periodMonth, adminId) => {
  const [year, month] = periodMonth.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const cook = await Cook.findById(cookId).lean();
  if (!cook) throw new Error('Cook not found');

  const settings = await loadSettings();

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invoice = await generateInvoiceForCook(
      cook,
      periodStart,
      periodEnd,
      settings,
      adminId,
      session
    );
    await session.commitTransaction();
    if (!invoice) throw new Error('No eligible orders found for this period');
    return invoice;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Compute the live "Current Cycle" preview for all active cooks.
 * For each cook: find their latest non-void invoice to determine cycle start,
 * then aggregate orders from that date until today.
 * Returns an array of preview objects (NOT stored invoices).
 */
exports.getCurrentCyclePreview = async () => {
  const settings = await loadSettings();
  const platformFeeRate = settings?.platformSellingFee ?? 0;

  // No status/isDeleted filter — include all cooks that may have uninvoiced activity
  const allCooks = await Cook.find({}).lean();

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const previews = [];

  for (const cook of allCooks) {
    const userIdForQuery = cook.userId;
    if (!userIdForQuery) continue;

    // subOrders.cook is Mixed (ObjectId or String depending on checkout path).
    // Query with both forms to avoid a silent type-mismatch that returns zero rows.
    const cookUserIdQuery = { $in: [userIdForQuery, userIdForQuery.toString()] };

    // Find latest non-void invoice to determine cycle start
    const latestInvoice = await Invoice.findOne({
      cook: cook._id,
      status: { $ne: 'void' },
    })
      .sort({ periodEnd: -1, periodMonth: -1, issuedAt: -1 })
      .select('periodEnd periodMonth periodStart issuedAt')
      .lean();

    let cycleStart;
    let lastInvoicedLabel = null;

    if (latestInvoice) {
      // Day after the last cycle ended
      const lastEnd = latestInvoice.periodEnd
        ? new Date(latestInvoice.periodEnd)
        : (() => {
            // Fall back to end-of-month from periodMonth
            const [y, m] = latestInvoice.periodMonth.split('-').map(Number);
            return new Date(y, m, 0, 23, 59, 59, 999);
          })();
      cycleStart = new Date(lastEnd);
      cycleStart.setDate(cycleStart.getDate() + 1);
      cycleStart.setHours(0, 0, 0, 0);
      lastInvoicedLabel = latestInvoice.periodMonth;
    } else {
      // No previous invoice — start from the cook's earliest ever eligible order.
      // This ensures historical uninvoiced sales are not cut off at month start.
      const earliestOrder = await Order.findOne({
        'subOrders.cook': cookUserIdQuery,
        'subOrders.status': { $in: ['delivered', 'pickedup'] },
      })
        .sort({ createdAt: 1 })
        .select('createdAt')
        .lean();

      if (earliestOrder?.createdAt) {
        cycleStart = new Date(earliestOrder.createdAt);
        cycleStart.setHours(0, 0, 0, 0);
      } else {
        // No sales at all — harmless display fallback: start of current month
        cycleStart = new Date(today.getFullYear(), today.getMonth(), 1);
      }
    }

    // If cycleStart is after today there's nothing to preview
    if (cycleStart > today) {
      previews.push({
        cookId: cook._id,
        cookName: cook.storeName || cook.name,
        countryCode: cook.countryCode || '—',
        cycleStart,
        cycleEnd: today,
        grossSales: 0,
        salesVat: 0,
        platformFee: 0,
        platformFeeVat: 0,
        estimatedTotal: 0,
        lastInvoicedPeriod: lastInvoicedLabel,
        orderCount: 0,
      });
      continue;
    }

    const orders = await Order.find({
      'subOrders.cook': cookUserIdQuery,
      'subOrders.status': { $in: ['delivered', 'pickedup'] },
      createdAt: { $gte: cycleStart, $lte: today },
    })
      .select('subOrders deliveryAddress address currency orderNumber')
      .lean();

    const countryCode =
      orders[0]?.deliveryAddress?.countryCode ||
      orders[0]?.address?.countryCode ||
      cook.countryCode ||
      'SA';

    const vatConfig = getCountryVatConfig(settings, countryCode);

    let grossSales = 0;
    let salesVat = 0;
    let platformFee = 0;
    let platformFeeVat = 0;
    let orderCount = 0;

    for (const order of orders) {
      const subOrder = order.subOrders.find(
        (so) => so.cook.toString() === userIdForQuery.toString()
      );
      if (!subOrder || !['delivered', 'pickedup'].includes(subOrder.status)) continue;

      const gross = subOrder.totalAmount || 0;
      grossSales += gross;
      salesVat += vatConfig.checkoutVatEnabled
        ? (gross * vatConfig.checkoutVatRate) / 100
        : 0;
      const fee = (gross * platformFeeRate) / 100;
      platformFee += fee;
      platformFeeVat += vatConfig.invoiceVatEnabled
        ? (fee * vatConfig.invoiceVatRate) / 100
        : 0;
      orderCount += 1;
    }

    previews.push({
      cookId: cook._id,
      cookName: cook.storeName || cook.name,
      countryCode: cook.countryCode || countryCode,
      currency: orders[0]?.currency || vatConfig.currencyCode,
      cycleStart,
      cycleEnd: today,
      grossSales: parseFloat(grossSales.toFixed(2)),
      salesVat: parseFloat(salesVat.toFixed(2)),
      platformFee: parseFloat(platformFee.toFixed(2)),
      platformFeeVat: parseFloat(platformFeeVat.toFixed(2)),
      estimatedTotal: parseFloat((salesVat + platformFee + platformFeeVat).toFixed(2)),
      lastInvoicedPeriod: lastInvoicedLabel,
      orderCount,
    });
  }

  // Sort: cooks with orders first, then by name
  previews.sort((a, b) => {
    if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
    return (a.cookName || '').localeCompare(b.cookName || '');
  });

  return previews;
};
