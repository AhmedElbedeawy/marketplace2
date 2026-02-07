/**
 * Shared Delivery Fee Calculator
 * Used by both Cart and Checkout to ensure 100% consistency
 */

/**
 * Calculate delivery fees for cart items
 * @param {Array} cartItems - Array of cart items with cookId, prepTimeMinutes, deliveryFee, fulfillmentMode
 * @param {Object} cookCombineConfig - Object mapping cookId to { timingPreference: 'combined'|'separate' }
 * @returns {Object} { totalDeliveryFee, deliveryFeeByCook, batchCountByCook }
 */
export const calcDeliveryFees = (cartItems, cookCombineConfig = {}) => {
  if (!cartItems || cartItems.length === 0) {
    return {
      totalDeliveryFee: 0,
      deliveryFeeByCook: {},
      batchCountByCook: {}
    };
  }

  // Group items by cook
  const itemsByCook = {};
  cartItems.forEach(item => {
    const cookId = item.cookId || item.kitchenId || 'unknown';
    if (!itemsByCook[cookId]) {
      itemsByCook[cookId] = [];
    }
    itemsByCook[cookId].push(item);
  });

  const deliveryFeeByCook = {};
  const batchCountByCook = {};
  let totalDeliveryFee = 0;

  // Calculate fee per cook
  Object.keys(itemsByCook).forEach(cookId => {
    const items = itemsByCook[cookId];
    
    // Filter delivery items only
    const deliveryItems = items.filter(item => item.fulfillmentMode === 'delivery');
    
    if (deliveryItems.length === 0) {
      deliveryFeeByCook[cookId] = 0;
      batchCountByCook[cookId] = 0;
      return;
    }

    // Get combine preference for this cook
    const cookPref = cookCombineConfig[cookId] || {};
    const timingPreference = cookPref.timingPreference || 'separate';

    if (timingPreference === 'combined') {
      // Combined: one fee per cook (highest fee)
      const maxFee = Math.max(...deliveryItems.map(item => Number(item.deliveryFee) || 0));
      deliveryFeeByCook[cookId] = maxFee;
      batchCountByCook[cookId] = 1;
      totalDeliveryFee += maxFee;
    } else {
      // Separate: group by prep time, one fee per batch
      const batches = {};
      
      deliveryItems.forEach(item => {
        // Normalize prepTime to handle both number and string formats
        let readyTime = item.prepTimeMinutes || item.prepTime;
        
        if (typeof readyTime === 'string' && readyTime.includes(':')) {
          // Convert "16:00" to minutes
          const [hours, minutes] = readyTime.split(':').map(Number);
          readyTime = hours * 60 + minutes;
        } else {
          readyTime = parseInt(readyTime, 10) || 30;
        }
        
        if (!batches[readyTime]) {
          batches[readyTime] = [];
        }
        batches[readyTime].push(item);
      });

      // Sum max fee per batch
      let cookFee = 0;
      Object.keys(batches).forEach(readyTime => {
        const batchItems = batches[readyTime];
        const batchFee = Math.max(...batchItems.map(item => Number(item.deliveryFee) || 0));
        cookFee += batchFee;
      });

      deliveryFeeByCook[cookId] = cookFee;
      batchCountByCook[cookId] = Object.keys(batches).length;
      totalDeliveryFee += cookFee;
    }
  });

  return {
    totalDeliveryFee,
    deliveryFeeByCook,
    batchCountByCook
  };
};

/**
 * Get number of deliveries for a cook group
 * @param {Array} items - Items for a specific cook
 * @param {string} timingPreference - 'combined' or 'separate'
 * @returns {number}
 */
export const getDeliveryCount = (items, timingPreference = 'separate') => {
  const deliveryItems = items.filter(item => item.fulfillmentMode === 'delivery');
  
  if (deliveryItems.length === 0) return 0;
  if (timingPreference === 'combined') return 1;
  
  // Count unique prep times
  const prepTimes = new Set();
  deliveryItems.forEach(item => {
    let readyTime = item.prepTimeMinutes || item.prepTime;
    if (typeof readyTime === 'string' && readyTime.includes(':')) {
      const [hours, minutes] = readyTime.split(':').map(Number);
      readyTime = hours * 60 + minutes;
    } else {
      readyTime = parseInt(readyTime, 10) || 30;
    }
    prepTimes.add(readyTime);
  });
  
  return prepTimes.size;
};

export default {
  calcDeliveryFees,
  getDeliveryCount
};
