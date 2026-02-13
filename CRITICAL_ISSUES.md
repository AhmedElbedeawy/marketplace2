# CRITICAL ISSUES SUMMARY - IMMEDIATE FIXES NEEDED

## ISSUE A: DISH IMAGES NOT SHOWING IN COOK HUB ORDERS

**Root Cause**: Orders have `productSnapshot` objects but all fields are `undefined`
```javascript
productSnapshot: {
  name: undefined,
  image: undefined,
  description: undefined
}
```

**Why**: Test/demo orders were created without capturing product snapshots
**Fix Options**:
1. Update existing orders to add placeholder images in productSnapshot
2. Fix backend enrichment logic in getCookOrders to actually fetch dish data
3. Accept that test data won't have images (least priority for lifecycle testing)

**Recommendation**: Option 1 (quick fix for testing)

---

## ISSUE B: NEW ORDERS NOT APPEARING IN COOK HUB

**Root Cause**: New orders use OLD phantom Cook ID `6985d80452d59ca2f33b5840`
- This is the Cook._id (Cook profile ID)
- But getCookOrders now filters by User._id
- Result: New orders don't match and aren't shown

**Where It Breaks**: Checkout flow still uses Cook model to get cook ID

**Critical Fix Needed**: Update checkout/order creation to use User._id instead of Cook._id

**Files to Check**:
- server/controllers/checkoutController.js
- Anywhere that sets `subOrder.cook` field during order creation

---

## ISSUE C: FOODIE ORDER DISPLAY PROBLEMS

### C1: Mixed Fulfillment Orders Show Wrong Mode
**Current**: `order.subOrders?.[0]?.fulfillmentMode`  
**Problem**: Shows only first subOrder's mode, not mixed
**Fix**: Show "Mixed" if subOrders have different fulfillmentModes

### C2: Order Details Always Shows Pickup Location
**Problem**: Shows pickup location even for delivery orders
**Fix**: Conditional display based on fulfillmentMode

### C3: Map Doesn't Load on Click
**Problem**: Map navigation broken
**Fix**: Check map component integration and coordinate passing

---

## PRIORITY ORDER

1. **HIGHEST**: Issue B - Fix new order creation to use User._id
2. **HIGH**: Issue C2 - Fix Order Details fulfillment display
3. **MEDIUM**: Issue C1 - Fix mixed fulfillment display
4. **LOW**: Issue A - Images (test data issue)
5. **LOW**: Issue C3 - Map (if needed)

---

## IMMEDIATE ACTION REQUIRED

**File**: `server/controllers/checkoutController.js`
**Search for**: Where `subOrder.cook` is set
**Change from**: `Cook._id` (Cook profile ID)
**Change to**: `Cook.userId` (User account ID)

This will make new orders match the getCookOrders filter and appear correctly.
