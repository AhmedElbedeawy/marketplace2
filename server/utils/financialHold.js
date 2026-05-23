const Invoice = require('../models/Invoice');
const Cook = require('../models/Cook');

/**
 * Check whether a user has outstanding invoices that must be settled before
 * their account can be restored. Called ONLY during the restore flow — never
 * during deletion (deletion is always permitted per App Store compliance).
 *
 * @param {ObjectId|string} userId — User._id
 * @returns {{ blocked: boolean, invoices: object[], totalOwed: number }}
 */
async function checkFinancialHold(userId) {
  const cook = await Cook.findOne({ userId }).lean();
  if (!cook) {
    return { blocked: false, invoices: [], totalOwed: 0 };
  }

  const outstanding = await Invoice.find({
    cook: cook._id,
    status: { $in: ['issued', 'locked'] },
    amountDue: { $gt: 0 }
  })
    .select('invoiceNumber periodMonth status amountDue amountPaid currency dueAt')
    .lean();

  const totalOwed = outstanding.reduce(
    (sum, inv) => sum + Math.max(0, inv.amountDue - (inv.amountPaid || 0)),
    0
  );

  return {
    blocked: outstanding.length > 0,
    invoices: outstanding,
    totalOwed: parseFloat(totalOwed.toFixed(2))
  };
}

module.exports = { checkFinancialHold };
