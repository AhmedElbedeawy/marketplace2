# Fix Summary: Ensure New Orders Store Correct Category Data

## Problem
Sales by Category shows all items as "Uncategorized" because:
1. Historical orders have DishOffers linked to deleted cooks
2. Order items don't store `productSnapshot.category`

## Solution
**Do NOT change historical orders.** Only ensure NEW orders store correct data.

### Changes Made

#### 1. Order Model Schema
**File:** `/server/models/Order.js` (Line 46)
- Added `category` field to `productSnapshot` schema
- Type: String (stores category name, not ObjectId)

```javascript
productSnapshot: {
  name: { type: String },
  image: { type: String },
  description: { type: String },
  category: { type: String } // Category name from AdminDish
}
```

#### 2. Checkout Session Creation
**File:** `/server/controllers/checkoutController.js` (Lines 59-64)
- When fetching AdminDish, now populate the `category` field
- Changed from: `AdminDish.findById(dishOffer.adminDishId)`
- Changed to: `AdminDish.findById(dishOffer.adminDishId).populate('category', 'name')`

#### 3. Category Extraction
**File:** `/server/controllers/checkoutController.js` (Lines 141-159)
- Extract category name from populated AdminDish
- Handle both populated object and ObjectId string formats
- Store in cartSnapshot as `category` field

```javascript
let category = null;
if (product && product.category) {
  if (typeof product.category === 'object' && product.category.name) {
    category = product.category.name;
  } else if (typeof product.category === 'string') {
    const Category = require('../models/Category');
    const catDoc = await Category.findById(product.category).select('name').lean();
    if (catDoc) {
      category = catDoc.name;
    }
  }
}
```

#### 4. CartSnapshot Return
**File:** `/server/controllers/checkoutController.js` (Line 165)
- Added `category` field to cartSnapshot return object

```javascript
return {
  cook: cookUserId,
  dish: item.dishId,
  dishOffer: resolvedDishOffer || item.dishId,
  category: category, // NEW: Store category for order item
  dishName: product ? (product.nameEn || product.name) : (item.dishName || 'Unknown Dish'),
  // ... rest of fields
}
```

#### 5. Order Item Creation
**File:** `/server/controllers/checkoutController.js` (Lines 1095-1100)
- Save category in `productSnapshot` when creating order items

```javascript
productSnapshot: {
  name: item.dishName,
  image: item.dishImage,
  description: '',
  category: item.category || null // NEW: Save category from AdminDish
}
```

## Data Flow for New Orders

1. **Frontend sends:** `dishId` (DishOffer._id), `cookId` (Cook._id)
2. **Backend resolves:** 
   - DishOffer by `_id`
   - AdminDish via `DishOffer.adminDishId` (with category populated)
   - Category name from `AdminDish.category.name`
3. **CartSnapshot stores:** `dishOffer`, `category`, `dishName`, etc.
4. **Order item saves:** 
   - `dishOffer`: DishOffer._id (ObjectId)
   - `productSnapshot.category`: Category name (String)

## Expected Result for New Orders

After deployment, new orders will have:
```javascript
{
  dishOffer: ObjectId("6992aaf2c63765d333dd6f28"),
  product: "69925eb955922f9132707ce3",
  productSnapshot: {
    name: "Molokhia",
    image: "/uploads/...",
    description: "",
    category: "Traditional" // ← NEW FIELD
  }
}
```

## Sales by Category Endpoint Fix (Already Applied)

The endpoint (`/server/controllers/orderController.js` lines 706-794) now:
1. Maps `item.dishOffer → DishOffer → AdminDish → Category` (primary)
2. Falls back to `item.productSnapshot.category` (secondary)
3. Uses "Uncategorized" only if both fail

For new orders, method #2 will work immediately.

## Verification Steps

1. Deploy server changes
2. Place a test order as a customer
3. Check order in database:
   ```javascript
   db.orders.findOne({}, { subOrders: 1 }).subOrders[0].items[0].productSnapshot
   ```
4. Verify `category` field is populated
5. Check Cook Hub Overview → Sales by Category shows categorized data

## Historical Orders

**No changes made to historical orders.** They will continue showing as "Uncategorized" unless:
- They have valid `dishOffer` references that can be resolved
- Manual migration script is run (not recommended)
