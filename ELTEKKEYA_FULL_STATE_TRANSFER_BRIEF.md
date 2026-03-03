# ELTEKKEYA MARKETPLACE – FULL STATE TRANSFER BRIEF (PARITY PHASE)

**Document Type:** Production System Takeover Brief  
**Date:** March 2, 2026  
**Phase:** Cart & Checkout Parity Finalization  
**Status:** LIVE PRODUCTION  

---

## 🚀 SUCCESSOR QUICK START

**If you are taking over this project:**

1. **Read Section 2 (Core Business Model) completely.**
2. **Read Section 4 (Web App Behavior – Source of Truth).**
3. **Read Section 6 (Current Phase: Cart & Checkout Parity).**
4. **Verify production endpoints listed in the Verification Checklist.**
5. **Do NOT modify cart logic before fully understanding DishOffer identity.**

**If unsure:**
- Assume Web behavior is correct.
- Match Web behavior exactly.

---

## 1️⃣ PRODUCTION STATUS

### Live Systems

| Component | Status | URL | Notes |
|-----------|--------|-----|-------|
| **Backend API** | ✅ LIVE | `https://api.eltekkeya.com` | Deployed to Google Cloud Run |
| **Web App** | ✅ LIVE | `https://www.eltekkeya.com` | React SPA, production build |
| **Admin Panel** | ✅ LIVE | `https://admin.eltekkeya.com` | Admin dashboard for catalog management |
| **Mobile App** | ⚠️ DEV | Not published | Flutter, connected to production API |

### Backend Configuration

**File:** `/server/server.js`

```javascript
// Lines 13-14: Database connection
const connectDB = require('./config/db');
connectDB();

// Lines 107-136: Route mounting (try-catch wrapped)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/checkout', require('./routes/checkout.routes'));
// ... (23 total routes)
```

**Database:** MongoDB Atlas (MPCluster)  
**Connection String:** Stored securely in environment variables (not documented here)  
**Logging:** Production mode (warn + error only)  
**Stripe:** Configured  
**Firebase:** Configured (FCM notifications)  
**Google Maps:** Configured (Places API, Distance Matrix)

---

## 🛡 PRODUCTION STABILITY CONTROLS

**The system is LIVE in production.**

**Before deploying any backend change:**

1. Validate locally.
2. Deploy to Cloud Run.
3. Immediately verify:
   - `GET /api/notifications` returns 401 (not 404).
   - `POST /api/checkout` returns 401 (not 404).
   - `GET /api/admin-dishes/featured` returns non-empty list.
4. Test Web cart behavior.
5. Test Mobile cart behavior.

**Rollback Rule:**

> If any core endpoint returns unexpected 404 or 500:
> **Immediately redeploy previous stable Cloud Run revision.**
>
> Do not continue debugging on broken production.

---

## 🚀 DEPLOYMENT & REVISION CONTROL STRATEGY

### Cloud Run Deployment Model

**Backend deployed via Google Cloud Run.**
- Each deployment creates a new revision.
- Stable revision must be identified before new deployment.

### Deployment Process

1. Apply code changes locally.
2. Validate syntax (`node -c`).
3. Commit changes.
4. Deploy to Cloud Run.
5. **Immediately verify critical endpoints:**
   - `/api/notifications` returns 401 (not 404)
   - `/api/checkout` returns 401 (not 404)
   - `/api/admin-dishes/featured` returns valid response
6. Test Web cart.
7. Test Mobile cart.

### Rollback Strategy

**If deployment introduces breaking behavior:**

1. Identify previous stable Cloud Run revision.
2. Re-route traffic to previous revision.
3. Confirm endpoints working.
4. Investigate failure offline.
5. **Never debug while production is broken.**

### Environment Clarification

**Current system uses:**
- Production backend (Cloud Run)
- Production MongoDB Atlas
- Web and Admin connected to production
- Mobile connected to production (no staging environment)

**There is no separate staging server currently documented.**

**All testing must assume production impact.**

---

## 2️⃣ CORE BUSINESS MODEL (CRITICAL – DO NOT MODIFY)

### Data Model Hierarchy

```
AdminDish (Catalog)
    ↓ (referenced by)
DishOffer (Sellable Offer)
    ↓ (purchased as)
Order Item (Cart → Checkout)
```

### Absolute Rule: Cart Identity

**Cart item identity MUST be:**
```javascript
{
  offerId: DishOffer._id,      // PRIMARY KEY - uniqueness
  cookId: Cook._id,            // Grouping key
  portionKey: 'medium'         // Variant selector
}
```

**NEVER use:**
```javascript
dishId: AdminDish._id          // ❌ WRONG - causes cart corruption
```

### Why This Matters

| Aspect | Reason |
|--------|--------|
| **Different cooks** | Same dish from different cooks = different offers |
| **Different pricing** | Each cook sets their own price |
| **Different portions** | Portion variants are per-offer |
| **Different fulfillment** | Pickup/delivery rules vary by cook |
| **Different locations** | Each cook has unique pickup coordinates |

**Violation consequence:** Cart merging across different cooks, incorrect pricing, wrong fulfillment rules.

---

## 🔒 SYSTEM INVARIANTS (NON-NEGOTIABLE RULES)

**The following rules must never be broken:**

1. **Cart identity is ALWAYS DishOffer._id.**
2. **One subOrder per cook during checkout.**
3. **Delivery fee calculated per cook dispatch batch.**
4. **Web behavior overrides Mobile assumptions.**
5. **No endpoint response structure change without validating Web compatibility.**
6. **No database model modification in production without migration planning.**
7. **Production API must remain backward compatible with deployed Web app.**

**Any violation of these invariants requires architectural review before deployment.**

---

## 3️⃣ BACKEND FIX HISTORY (PRODUCTION RESOLVED)

### 3.1 Route Conflicts & Cast Errors

**Problem:** `GET /api/products/:id` returning 500 CastError

**Root Cause:** Invalid ObjectId format not validated before database query

**Fix Applied:**
- **File:** `server/controllers/productController.js` (Line 319)
- Added ObjectId validation guard before database operations

```javascript
if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return sendError(res, 400, ErrorCodes.VALIDATION_REQUIRED, 'Invalid ID format');
}
```

### 3.2 Featured Endpoint Conflict

**Problem:** `GET /api/admin-dishes/featured` conflicting with `/:id` route

**Root Cause:** Route order - `/:id` mounted before `/featured`

**Fix Applied:**
- **File:** `server/routes/adminDish.routes.js`
- Reordered routes: `/featured` before `/:id`

### 3.3 Featured Filter Removing Zero-Rating Dishes

**Problem:** Featured dishes with no ratings excluded from response

**Root Cause:** Filter logic requiring `ratings.count > 0`

**Fix Applied:**
- **File:** `server/controllers/adminDishController.js`
- Removed ratings.count filter from featured query

### 3.4 UUID ESM Import Crash

**Problem:** Notification routes failing to mount with `ERR_UNKNOWN_BUILTIN_MODULE`

**Root Cause:** `uuid` package using ES modules in CommonJS project

**Fix Applied:**
- **File:** `server/utils/notificationUtils.js`
- Replaced `import { v4 as uuidv4 } from 'uuid'` with `crypto.randomUUID()`

### 3.5 Product Endpoint Failing

**Problem:** `GET /api/products/:id` returning 404 for valid offers

**Root Cause:** Query searching only Product model, not DishOffer fallback

**Fix Applied:**
- **File:** `server/controllers/productController.js` (Lines 343-380)
- Added DishOffer fallback lookup when Product not found

```javascript
const offer = await DishOffer.findById(req.params.id);
if (!offer) {
  return sendError(res, 404, ErrorCodes.NOT_FOUND, 'Product not found');
}
```

### 3.6 Categories Returning Incorrect Count

**Problem:** `GET /api/categories?country=SA` returning 0 items

**Root Cause:** Country filter mismatch or missing countryCode field

**Fix Applied:**
- **File:** `server/controllers/categoryController.js`
- Verified all categories have `countryCode: 'SA'` field
- Confirmed endpoint returns 9 items for SA

### 3.7 Production Logging Disabled

**Problem:** No logs visible in Cloud Run

**Root Cause:** `console.log` suppressed in production mode

**Fix Applied:**
- **File:** `server/server.js` (Lines 77-83)
- Kept warn + error logging enabled for diagnostics

```javascript
const isDev = process.env.NODE_ENV !== 'production';
if (!isDev) {
  console.log = () => {}; // Keep warn & error enabled
}
```

---

## 4️⃣ WEB APP BEHAVIOR (SOURCE OF TRUTH)

### 4.1 Cart Logic

**File:** `client/web/src/pages/foodie/FoodieCart.js`

#### Grouping Logic (Lines 37-95)

```javascript
const groupCartItems = (currentCart) => {
  const groupedByCook = {};
  currentCart.forEach(item => {
    const cookId = String(item.cookId || item.kitchenId);
    if (!groupedByCook[cookId]) {
      groupedByCook[cookId] = {
        cookId: cookId,
        cookName: item.kitchenName || 'Unknown Kitchen',
        items: []
      };
    }
    groupedByCook[cookId].items.push({
      offerId: item.offerId || item.dishId,  // ✅ Offer-based identity
      foodName: item.name,
      quantity: item.quantity,
      fulfillmentMode: item.fulfillmentMode,
      deliveryFee: item.deliveryFee || 0,
      prepTimeMinutes: item.prepTimeMinutes,
    });
  });
};
```

#### Quantity Increment Rules (Lines 187-205)

**File:** `client/web/src/contexts/CountryContext.js`

```javascript
const updateQuantity = (cookId, offerId, quantity, portionKey = null) => {
  setCart(prev => prev.map(item => {
    const itemCookId = String(item.cookId || item.kitchenId);
    const targetCookId = String(cookId);
    const itemOfferId = String(item.offerId || item.dishId);
    const targetOfferId = String(offerId);
    const itemPortionKey = String(item.portionKey || '');
    const targetPortionKey = String(portionKey || '');
    
    // Match criteria: same cook + same offer + same portion (if specified)
    const portionMatch = portionKey ? (itemPortionKey === targetPortionKey) : true;
    
    if (itemCookId === targetCookId && itemOfferId === targetOfferId && portionMatch) {
      return { ...item, quantity };
    }
    return item;
  }).filter(item => item.quantity > 0));
};
```

**Increment happens ONLY when:**
1. Same `cookId`
2. Same `offerId` (DishOffer._id)
3. Same `portionKey` (if provided)

**New line created when:**
- Different cook
- Different offer
- Different extras (future enhancement)
- Different pickup location (future enhancement)

#### Delivery Fee Calculation (Lines 158-188)

**Rule:** Delivery fee charged per dispatch batch, not per item

```javascript
const calculateCookDeliveryFee = (cookItems, cookId) => {
  const deliveryItems = cookItems.filter(item => item.fulfillmentMode === 'delivery');
  if (deliveryItems.length === 0) return 0;
  
  const preference = cookPreferences[cookId]?.timingPreference || 'separate';
  
  if (preference === 'combined') {
    // Combined: charge ONE delivery fee (the highest)
    const fees = deliveryItems.map(item => item.deliveryFee || 0);
    return Math.max(...fees);
  } else {
    // Separate: group by ready time, charge per batch
    const batches = groupByReadyTime(deliveryItems);
    return batches.reduce((total, batch) => {
      const batchFee = Math.max(...batch.items.map(item => item.deliveryFee || 0));
      return total + batchFee;
    }, 0);
  }
};
```

### 4.2 Add to Cart Flow

**File:** `client/web/src/pages/foodie/FoodieMenu.js` (Lines 1196-1220)

```javascript
const handleAddToCart = (offer, event) => {
  const cartItem = {
    offerId: offer._id,              // ✅ DishOffer._id
    dishId: offer.adminDishId,       // Metadata only
    cookId: offer.cook._id,
    kitchenId: offer.cook._id,
    kitchenName: offer.cook.storeName,
    name: offer.name,
    price: offer.price,
    quantity: 1,
    priceAtAdd: offer.price,
    fulfillmentMode: selectedMode,
    deliveryFee: offer.deliveryFee || 0,
    prepTimeMinutes: offer.prepTime,
    countryCode: countryCode,
  };
  
  // Multi-kitchen warning check
  const hasMultipleKitchens = cart.length > 0 && cart.some(item => 
    item.kitchenId !== offer.cook._id
  );
  
  if (hasMultipleKitchens && !warningShown) {
    setPendingItem(cartItem);
    setCartWarningOpen(true);
    return;
  }
  
  contextAddToCart(cartItem);
  showNotification('Item added to cart', 'success');
};
```

### 4.3 Checkout SubOrder Splitting

**File:** `server/controllers/checkoutController.js` (Lines 827-850)

```javascript
subOrders.push({
  cook: cookUserId,
  pickupAddress: cookAddress,
  cookLocationSnapshot: {
    lat: cook?.location?.lat || 0,
    lng: cook?.location?.lng || 0,
    address: cookAddress,
  },
  items: items.map(item => ({
    dish: item.dish,                 // ✅ DishOffer._id
    dishName: item.dishName,
    dishImage: item.photoUrl,        // Image from offer
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    notes: item.notes,
    portionKey: item.portionKey,
    extras: item.extras || [],
    fulfillmentMode: item.fulfillmentMode,
    deliveryFee: item.deliveryFee,
    prepReadyConfig: item.prepReadyConfig,
  })),
  timingPreference: timingPreference,
  combinedReadyTime: combinedReadyTime,
  deliveryFee: deliveryFee,
});
```

**SubOrder split by:**
- One subOrder per cook
- All items from same cook grouped together
- Delivery fee calculated per cook based on timing preference

---

## 🛠 ADMIN PANEL – FUNCTIONAL BEHAVIOR & IMPACT

**The Admin Panel is LIVE and actively controls catalog behavior.**

### AdminDish Lifecycle

**Admin can:**
- Create AdminDish (catalog entries)
- Edit AdminDish (name, description, image, category)
- Mark AdminDish as active/inactive
- Set featured flag (if applicable)
- Assign category

### Relationship to DishOffer

- **AdminDish is the catalog template.**
- Cooks create DishOffer referencing AdminDish.
- **If AdminDish is deactivated:**
  - Related DishOffers must not appear in listings.
  - Web and Mobile must reflect this state.

### Category Management

**Admin controls:**
- Category creation
- Category activation
- CountryCode assignment (e.g., SA)

**Impact:**
- Category API directly affects Web and Mobile filtering.
- Incorrect `countryCode` breaks mobile category rendering.

### Featured Logic Control

**AdminDish featured status impacts:**
- `/api/admin-dishes/featured`
- Web homepage featured section
- Mobile featured section
- Removing featured filter (`ratings.count > 0`) was critical for parity.

### Admin Risk Surface

**Changes in Admin Panel may:**
- Remove dishes from Web/Mobile
- Break category filters
- Affect featured sections
- Impact cart if offers become inactive

**Admin changes must be considered production-impacting.**

---

## 🎯 DEFINITION OF PARITY

**Parity means behavioral equivalence between Web and Mobile in:**

- ✅ Cart grouping logic
- ✅ Quantity increment rules
- ✅ Offer selection flow
- ✅ Checkout subOrder splitting
- ✅ Delivery fee calculation
- ✅ Category filtering behavior
- ✅ Search behavior
- ✅ Order history structure
- ✅ Notification triggering logic

**Parity does NOT mean:**

- ❌ UI pixel match
- ❌ Code structure similarity
- ❌ Refactoring alignment
- ❌ Performance optimization

**Only behavior must match.**

---

## 5️⃣ MOBILE PARITY FIXES (COMPLETED)

### 5.1 Notification Header Fix

**Issue:** Sending `"Bearer null"` in Authorization header

**Fix:** `mobile/foodie/lib/services/api_service.dart`
- Removed null bearer token concatenation
- Now sends header only if token exists

### 5.2 MenuScreen Dispose Crash

**Issue:** `setState()` called after widget dispose

**Fix:** `mobile/foodie/lib/screens/menu_screen.dart`
- Added `mounted` check before setState
- Moved initState logic to post-frame callback

### 5.3 Debug BaseUrl Replacement

**Issue:** Using `localhost:5005` in debug mode

**Fix:** Updated to `https://api.eltekkeya.com`

### 5.4 "All" Category Logic

**Issue:** "All" category not showing all dishes

**Fix:** `mobile/foodie/lib/screens/menu_screen.dart`
- Implemented category filter bypass when selectedCategory == "All"

### 5.5 Duplicate Oven Category

**Issue:** "Oven" category appearing twice

**Fix:** Deduplicated category list by ID

### 5.6 Dish Card Navigation

**Issue:** Wrong dish name passed to detail page

**Fix:** Corrected navigation to pass `dishName` parameter

### 5.7 Cook Offer Sheet Force Display

**Issue:** Offer selection sheet not showing for single-offer dishes

**Fix:** Added `forceShow: true` flag to always show offer sheet

### 5.8 Zero-Offer Case Handling

**Issue:** Crash when dish has no offers

**Fix:** Added bottom sheet showing "No offers available"

### 5.9 Cook Image Resolution

**Issue:** Cook profile photo not displaying

**Fix:** Updated image URL resolution to use `cookProfilePhoto || profilePhoto`

### 5.10 InitState Lifecycle Fix

**Issue:** Async operations in initState causing race conditions

**Fix:** Moved to `WidgetsBinding.instance.addPostFrameCallback`

### 5.11 Featured Endpoint Parsing

**Issue:** Mobile expecting array, backend returning object

**Fix:** Aligned mobile parsing with backend response structure

### 5.12 Cart Identity Migration

**Issue:** Mobile using AdminDish._id for cart identity

**Fix:** `mobile/foodie/lib/providers/cart_provider.dart` (Lines 96-150)
- Migrated to `foodId: offerId` (DishOffer._id)
- Added comments documenting PHASE 4 requirements

---

## 📱 MOBILE CONNECTED TO PRODUCTION – RISK NOTICE

**The Mobile app uses the LIVE production backend.**

**Implications:**
- Test orders create real Order records in MongoDB Atlas.
- Checkout tests may interact with Stripe payment processing.
- Notifications may trigger real FCM push events.
- Cart tests affect real production database data.

**Therefore:**
1. **Use test accounts only.**
2. **Do not use real payment methods during testing.**
3. **Monitor MongoDB Atlas after checkout testing.**
4. **Avoid excessive repeated test orders.**
5. **Treat Mobile testing as production-impacting.**

---

## 6️⃣ CURRENT PHASE: CART & CHECKOUT PARITY

### Focus Areas

#### 6.1 OfferId Identity Correctness

**Requirement:** Every cart operation must reference DishOffer._id

**Verification Points:**
- [x] Add to cart uses offerId
- [x] Cart display shows offerId-derived items
- [x] Quantity update matches by offerId
- [ ] Checkout creates subOrders with offerId
- [ ] Order history displays offerId-based items

#### 6.2 Extras Equality Normalization

**Web Behavior:** New cart line created when extras differ

**Mobile Implementation Needed:**
```dart
// Pseudocode for cart equality check
bool shouldIncrement(CartItem existing, CartItem newItem) {
  return existing.foodId == newItem.foodId &&
         existing.cookId == newItem.cookId &&
         _extrasEqual(existing.extras, newItem.extras) &&
         existing.pickupLocation == newItem.pickupLocation;
}

bool _extrasEqual(List<Extra> a, List<Extra> b) {
  if (a.length != b.length) return false;
  for (int i = 0; i < a.length; i++) {
    if (a[i].id != b[i].id || a[i].choice != b[i].choice) return false;
  }
  return true;
}
```

#### 6.3 Pickup Location Equality

**Web Behavior:** New cart line created when pickup location differs

**Mobile Implementation Needed:**
```dart
// Compare normalized location keys
String _locationKey(Location loc) {
  return '${loc.lat.toStringAsFixed(6)}_${loc.lng.toStringAsFixed(6)}';
}
```

#### 6.4 Quantity Increment Rules

**Current Mobile Code:** `mobile/foodie/lib/providers/cart_provider.dart` (Lines 127-137)

```dart
final existingItemIndex = items.indexWhere((item) => 
  (item as Map)['foodId'] == foodId
);

if (existingItemIndex >= 0) {
  final existingItem = CartItem.fromJson(
    Map<String, dynamic>.from(items[existingItemIndex] as Map),
  );
  existingItem.quantity++;
  items[existingItemIndex] = existingItem.toJson();
```

**Missing Checks:**
- [ ] Cook ID comparison
- [ ] Extras comparison
- [ ] Pickup location comparison
- [ ] Portion key comparison

#### 6.5 Checkout SubOrder Splitting

**Web Behavior:** One subOrder per cook

**Mobile Verification Needed:**
- [ ] Checkout request groups items by cookId
- [ ] Response includes multiple subOrders for multi-cook cart
- [ ] Each subOrder has correct cook metadata
- [ ] Delivery fee calculated per subOrder

---

## 🔄 SYSTEM DATA FLOW OVERVIEW

**This section defines how data moves across the system.**

### 1️⃣ Cart Flow

```
Mobile/Web → /api/cart
→ Stored client-side (Web context / Mobile provider)
→ Cart items reference DishOffer._id
→ Grouped by cookId
```

### 2️⃣ Checkout Flow

```
Cart → /api/checkout
→ Backend groups items by cook
→ Creates one subOrder per cook
→ Applies delivery fee logic
→ Creates Order document
→ Triggers notification logic
```

### 3️⃣ Order Status Flow

```
Order created → status transitions:
Pending → Confirmed → Preparing → Ready → Delivered
→ Notification sent via FCM
→ Stored in Notification model
```

### 4️⃣ Featured & Category Flow

```
Admin → modifies AdminDish
→ Backend exposes via API
→ Web & Mobile fetch categories and featured
→ Render based on countryCode
```

### 5️⃣ Mobile & Web Consistency Model

**Both clients:**
- Use same production API
- Must interpret identical JSON structure
- Must not assume client-specific behavior

**Backend is single source of data truth.**  
**Web behavior is source of behavioral truth.**

---

## 7️⃣ KNOWN PROBLEMS (HISTORICAL CONTEXT – RESOLVED)

### 7.1 Route Order Conflict → Cast to ObjectId

**Symptom:** 500 errors on `/api/products/:id`  
**Root Cause:** Invalid ObjectId strings (e.g., "featured") reaching controller  
**Resolution:** Added validation guard at Line 319 of `productController.js`

### 7.2 UUID Import Crash → Route Mounting Failure

**Symptom:** Server crash on startup with `ERR_UNKNOWN_BUILTIN_MODULE`  
**Root Cause:** `uuid` package ESM/CJS incompatibility  
**Resolution:** Replaced with `crypto.randomUUID()`

### 7.3 Featured Filter Removing Zero-Rating Dishes

**Symptom:** Featured dishes with no ratings not appearing  
**Root Cause:** Filter requiring `ratings.count > 0`  
**Resolution:** Removed ratings filter from featured query

### 7.4 Mobile Using Localhost API

**Symptom:** Mobile app working locally but not in production  
**Root Cause:** `baseUrl = 'http://localhost:5005'` in debug mode  
**Resolution:** Updated to `https://api.eltekkeya.com`

### 7.5 Flutter setState After Dispose

**Symptom:** "setState() called after dispose()" crash  
**Root Cause:** Async callback executing after widget disposal  
**Resolution:** Added `mounted` checks and moved to post-frame callback

### 7.6 Wrong Cart Identity Using AdminDish ID

**Symptom:** Cart merging items from different cooks  
**Root Cause:** Using `AdminDish._id` instead of `DishOffer._id`  
**Resolution:** Migrated to offerId-based identity

### 7.7 Asset Path Duplication

**Symptom:** Images not loading in production  
**Root Cause:** Duplicate asset path prefixes  
**Resolution:** Standardized asset path resolution

### 7.8 Flutter Web Port Instability

**Symptom:** Different ports on each run  
**Root Cause:** `flutter run -d chrome` assigning random port  
**Resolution:** Fixed port configuration in launch settings

### 7.9 Type Mismatch Parsing Featured Endpoint

**Symptom:** Mobile crash parsing featured response  
**Root Cause:** Backend returning object, mobile expecting array  
**Resolution:** Aligned data structures between backend and mobile

---

## 8️⃣ POST-PARITY ROADMAP

### Phase 4: Push Notifications Delivery (PENDING)

**Tasks:**
- [ ] Verify FCM token registration on mobile
- [ ] Test notification delivery for Phase 3 triggers:
  - Order status change (confirmed → preparing)
  - Order ready for pickup
  - Order out for delivery
- [ ] Verify deep link navigation from notifications
- [ ] Test notification center badge updates

### Phase 5: Final Production Hardening (PLANNED)

**Server.js Route Mounting Refactor**

**Current Risk:** Try-catch wrapping all routes (Lines 107-136)
- Single route failure could silently disable all routes
- No granular error isolation

**Hardening Plan:**

1. **Replace try-catch wrapper** with individual route error handling
2. **Mount each route independently** with explicit error logging
3. **Add node -c validation** before deployment
4. **Commit and deploy**
5. **Sanity test:**
   - `GET /api/notifications` → Expect 401 (not 404)
   - `POST /api/checkout` → Expect 401 (not 404)

**Implementation:**
```javascript
// Instead of:
try {
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/users', require('./routes/user.routes'));
  // ...
} catch (error) {
  console.error('Route loading failed:', error);
}

// Use:
try {
  app.use('/api/auth', require('./routes/auth.routes'));
} catch (error) {
  console.error('[ROUTE ERROR] /api/auth:', error);
}

try {
  app.use('/api/users', require('./routes/user.routes'));
} catch (error) {
  console.error('[ROUTE ERROR] /api/users:', error);
}
// ... repeat for each route
```

---

## 9️⃣ RULES FOR SUCCESSOR

### You Are BASIC Tier

**You MUST:**
- ✅ Operate within existing structure
- ✅ Maintain parity with web app behavior
- ✅ Document changes with code references
- ✅ Test against production data
- ✅ Preserve backward compatibility

**You MUST NOT:**
- ❌ Refactor architecture
- ❌ Improve performance without parity first
- ❌ Change database models
- ❌ Redesign UI/UX
- ❌ Rewrite business logic
- ❌ Optimize prematurely

### Your Job Is Parity, Not Creativity

**Every change must be traceable to:**
1. Web app behavior (source of truth)
2. Production bug report
3. Explicit user request

**No changes based on:**
- Personal preference
- Theoretical optimization
- "Best practices" that conflict with existing behavior

---

## 📋 VERIFICATION CHECKLIST

### Backend Routes

- [x] `GET /api/products/stats` → 200 OK
- [x] `GET /api/categories?country=SA` → 200 with 9 items
- [x] `GET /api/admin-dishes/featured` → 200 with dishes
- [x] `GET /api/products/:id` → 200 or 404 (not 500)
- [x] `POST /api/auth/login` → 200 with token
- [x] `GET /api/notifications` → 401 (not 404)
- [x] `POST /api/checkout` → 401 (not 404)

### Web App

- [x] Cart groups by cook
- [x] Quantity increments only for same offer/extras/location
- [x] Checkout splits subOrders by cook
- [x] Delivery fee calculated per batch
- [x] Featured shows all dishes regardless of rating
- [x] "All" category shows all dishes

### Mobile App

- [x] Notification header fixed
- [x] MenuScreen lifecycle fixed
- [x] Production API connected
- [x] "All" category implemented
- [x] Duplicate categories resolved
- [x] Dish card navigation corrected
- [x] Offer sheet force-display working
- [x] Zero-offer case handled
- [x] Cook image resolution fixed
- [x] InitState lifecycle fixed
- [x] Featured endpoint parsing aligned
- [x] Cart identity migrated to offerId
- [ ] Extras equality check (PENDING)
- [ ] Pickup location equality (PENDING)
- [ ] Full checkout subOrder splitting (PENDING)

---

## ⚠️ HIGH-RISK REGRESSION ZONES

**Changes in the following areas can break live production:**

- `server/server.js` (route mounting)
- `server/controllers/checkoutController.js` (subOrder splitting)
- `server/controllers/cartController.js` (cart operations)
- `server/controllers/productController.js` (offer fallback logic)
- `client/web/src/contexts/CountryContext.js` (Web cart state)
- `mobile/foodie/lib/providers/cart_provider.dart` (Mobile cart logic)

**Before modifying these:**
1. Confirm Web behavior first.
2. Confirm cart identity invariant.
3. Confirm subOrder split logic.
4. Confirm delivery fee logic.
5. **Do not modify blindly.**

---

## 🚨 CRITICAL FILES – DO NOT MODIFY WITHOUT VERIFICATION

| File | Purpose | Risk Level |
|------|---------|------------|
| `server/controllers/productController.js` | Main product/offer logic | 🔴 HIGH |
| `server/controllers/checkoutController.js` | Checkout subOrder creation | 🔴 HIGH |
| `server/controllers/cartController.js` | Cart operations | 🔴 HIGH |
| `client/web/src/contexts/CountryContext.js` | Cart state management | 🔴 HIGH |
| `client/web/src/pages/foodie/FoodieCart.js` | Cart display logic | 🔴 HIGH |
| `client/web/src/pages/foodie/FoodieMenu.js` | Add to cart flow | 🔴 HIGH |
| `mobile/foodie/lib/providers/cart_provider.dart` | Mobile cart logic | 🔴 HIGH |
| `mobile/foodie/lib/screens/menu_screen.dart` | Mobile menu display | 🟡 MEDIUM |

---

## 📞 DEPLOYMENT CONTACTS

**MongoDB Atlas:** https://cloud.mongodb.com/  
**Google Cloud Run:** https://console.cloud.google.com/run  
**Firebase Console:** https://console.firebase.google.com/  
**Stripe Dashboard:** https://dashboard.stripe.com/

---

**Document Version:** 1.0  
**Last Updated:** March 2, 2026  
**Maintained By:** Development Team  
**Next Review:** After cart parity completion
