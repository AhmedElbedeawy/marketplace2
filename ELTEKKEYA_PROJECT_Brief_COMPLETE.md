# ElTekkeya Marketplace - Complete Project Brief

**Generated:** 2026-03-03  
**Type:** READ-ONLY CODEBASE ANALYSIS  
**Scope:** Verified from actual source code only  

---

## 1) ARCHITECTURE

### Backend
- **Stack:** Node.js + Express + MongoDB (Mongoose ODM)
- **Hosting:** Google Cloud Run (production)
- **Port:** 5005 (development)
- **Source:** `/server/server.js`
- **Environment File:** `/server/.env`
- **Production API URL:** `https://api.Eltekkeya.com`
- **Development API URL:** `http://localhost:5005`

### Web App
- **Stack:** React 18 + Material-UI + React Router
- **Build Tool:** Create React App
- **Hosting:** Firebase Hosting (2 targets: `eltekkeya` for web, `eltekkeya-admin` for admin)
- **Source:** `/client/web/`
- **Environment File:** `/client/web/.env`
- **Production URL:** `https://Eltekkeya.com`
- **Development URL:** `http://localhost:3000`

### Admin Panel
- **Stack:** React 18 + Material-UI
- **Source:** `/admin/`
- **Development URL:** `http://localhost:3001`

### Mobile App
- **Stack:** Flutter (Dart)
- **Source:** `/mobile/foodie/`
- **Status:** Local development only (not deployed)
- **API Endpoint:** Uses same production API (`https://api.Eltekkeya.com`)

### External Services
- **Database:** MongoDB Atlas (MPCluster)
- **Authentication:** JWT (30-day expiry) + Firebase Admin SDK
- **Payment:** Stripe (test mode: `sk_test_51OyourTestKeyHere`)
- **Maps:** Google Maps API (`AIzaSyCyY13oShPFr3liGcA7rmZ7PQBKP6zBhIM`)
- **Storage:** Firebase Storage (`eltekkeya.firebasestorage.app`)

---

## 2) DATA MODELS (WITH EXACT FIELD PATHS)

### User Model (`/server/models/User.js`)

**Critical Fields:**
```
_id: ObjectId (auto-generated)
name: String (max 100 chars)
email: String (unique, lowercase)
password: String (min 6 chars, select: false by default)
phone: String (unique, sparse)
role_cook_status: String (enum: 'none' | 'pending' | 'active' | 'rejected' | 'suspended', default: 'none')
isCook: Boolean (default: false)
isEmailVerified: Boolean (default: false)
isPhoneVerified: Boolean (default: false)
isDeleted: Boolean (default: false)
countryCode: String (default: 'SA', indexed)
profilePhoto: String
walletId: String
storeName: String (unique, sparse, max 100 chars)
```

**Cook Identification Rule:**
- `isCook: true` AND `role_cook_status: 'active'` = Active Cook
- Both fields must be checked (not just `isCook`)

---

### Cook Model (`/server/models/Cook.js`)

**Critical Fields:**
```
_id: ObjectId (Cook profile ID - DIFFERENT from User._id)
userId: ObjectId (ref: User) - LINKS to User._id (unique)
name: String
email: String
storeName: String (required) - Kitchen display name
countryCode: String (default: 'SA', indexed)
expertise: [ObjectId] (ref: ExpertiseCategory)
profilePhoto: String
originalPhoto: String
ratings.average: Number (0-5)
ratings.count: Number
isTopRated: Boolean (default: false) - Admin override flag
status: String (enum: 'pending' | 'active' | 'rejected' | 'suspended', default: 'pending')
dishesCount: Number
ordersCount: Number
location: { lat: Number, lng: Number, address: String, city: String }
```

**IMPORTANT - Two-ID System:**
- `Cook._id` = Cook profile ID (used in DishOffer.cook)
- `Cook.userId` = User account ID (used in Order.subOrders.cook)
- **Conversion required:** `Cook.findOne({ userId: cookUserId })` to get profile

---

### Order Model (`/server/models/Order.js`)

**Top-Level Fields:**
```
_id: ObjectId
customer: ObjectId (ref: User)
checkoutSession: ObjectId (ref: CheckoutSession)
deliveryAddress: {
  addressLine1: String (required)
  addressLine2: String
  city: String (required)
  countryCode: String (default: 'SA')
  label: String (required)
  deliveryNotes: String
  lat: Number (required)
  lng: Number (required)
}
subOrders: [SubOrder] (array)
totalAmount: Number (required, min: 0)
status: String (enum: 'pending' | 'confirmed' | 'partially_delivered' | 'completed' | 'cancelled', default: 'pending')
notes: String
hasDispute: Boolean (default: false)
hasIssue: Boolean (default: false)
createdAt: Date (auto)
updatedAt: Date (auto)
```

---

### SubOrder Schema (embedded in Order.subOrders)

**Critical Fields:**
```
cook: Mixed (ObjectId OR String) - STORES User._id (NOT Cook._id)
cookName: String (enriched at runtime, not stored in DB)
pickupAddress: String (required)
cookLocationSnapshot: {
  lat: Number (required)
  lng: Number (required)
  address: String (required)
  city: String (required)
}
totalAmount: Number (required, min: 0)
status: String (enum: 'order_received' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'pickedup' | 'cancelled', default: 'order_received')
prepTime: Number (minutes)
scheduledTime: Date
cancellationReason: String
fulfillmentMode: String (enum: 'pickup' | 'delivery' | 'mixed', default: 'pickup')
timingPreference: String (enum: 'combined' | 'separate', default: 'separate')
combinedReadyTime: Date
deliveryFee: Number (default: 0)
items: [OrderItem]
createdAt: Date (auto)
updatedAt: Date (auto)
```

**CRITICAL BUG PATTERN - subOrders.cook:**
- **Type:** `mongoose.Schema.Types.Mixed` (allows ObjectId OR String)
- **Stores:** `User._id` (NOT `Cook._id`)
- **Stored As:** STRING (converted during checkout: `cook.userId.toString()`)
- **Query Must Use:** `toString()` comparison: `sub.cook.toString() === userId`
- **NEVER compare as ObjectId directly** - will fail on string IDs

---

### OrderItem Schema (embedded in SubOrder.items)

```
product: Mixed (ObjectId OR String) - Ref: Product (allows legacy data)
dishOffer: ObjectId (ref: DishOffer) - NULL for old orders
quantity: Number (required, min: 1)
price: Number (required, min: 0)
notes: String
isUnavailable: Boolean (default: false)
prepTime: Number (minutes)
readyAt: Date
prepTimeText: String (display text)
productSnapshot: {
  name: String
  image: String
  description: String
  category: String - Category NAME (for Sales by Category reporting)
}
```

**NOTE:** `dishOffer` field added in Phase 5. Old orders may have `dishOffer: null`.

---

### DishOffer Model (`/server/models/DishOffer.js`)

**Critical Fields:**
```
_id: ObjectId
adminDishId: ObjectId (ref: AdminDish, required, indexed)
cook: ObjectId (ref: Cook, required, indexed) - STORES Cook._id (NOT User._id)
price: Number (required, 1-10000)
stock: Number (default: 0, min: 0)
images: [String]
portionSize: String (enum: 'single' | 'small' | 'medium' | 'large' | 'family', default: 'medium')
variants: [{
  portionKey: String (required)
  portionLabel: String
  price: Number
  stock: Number
  image: String
}]
prepReadyConfig: {
  optionType: String (enum: 'fixed' | 'range' | 'cutoff', default: 'fixed')
  prepTimeMinutes: Number
  prepTimeMinMinutes: Number
  prepTimeMaxMinutes: Number
  cutoffTime: String (HH:MM format)
  beforeCutoffReadyTime: String (HH:MM)
  afterCutoffDayOffset: Number (default: 0)
}
isActive: Boolean (default: true)
createdAt: Date
updatedAt: Date
```

**IMPORTANT - DishOffer.cook vs SubOrder.cook:**
- `DishOffer.cook` = `Cook._id` (profile ID)
- `SubOrder.cook` = `User._id` (account ID)
- **Different fields, different IDs** - conversion required in checkout

---

### AdminDish Model (`/server/models/AdminDish.js`)

```
_id: ObjectId
nameEn: String (required, max 100)
nameAr: String (required, max 100)
descriptionEn: String (required, max 1000)
descriptionAr: String (required, max 1000)
longDescriptionEn: String (default: '')
longDescriptionAr: String (default: '')
category: ObjectId (ref: Category, required)
imageUrl: String
isActive: Boolean (default: true, indexed)
isPopular: Boolean (default: false, indexed)
```

**Indexes:**
- Text index: `{ nameEn, nameAr, descriptionEn, descriptionAr }`
- Compound: `{ category: 1, isActive: 1 }`
- Compound: `{ isPopular: 1, isActive: 1 }`

---

### Category Model (`/server/models/Category.js`)

```
_id: ObjectId
name: String (legacy, unique)
nameEn: String (required, max 50)
nameAr: String (required, max 50)
description: String
descriptionAr: String
icons: {
  web: String
  mobile: String
}
icon: String (legacy)
color: String (hex or empty for transparent)
mobileFontColor: String (enum: 'light' | 'dark', default: 'dark')
displayOrder: Number
isActive: Boolean (default: true)
```

---

### OrderRating Model (`/server/models/OrderRating.js`)

```
_id: ObjectId
order: ObjectId (ref: Order, required, unique) - One rating per order
customer: ObjectId (ref: User, required)
cook: ObjectId (ref: User, required) - STORES Cook._id (profile ID, converted from userId)
dishRatings: [{
  product: ObjectId (ref: Product, required)
  dishOffer: ObjectId (ref: DishOffer)
  rating: Number (1-5, required)
  review: String (max 500)
}]
overallRating: Number (1-5, calculated from dish ratings)
overallReview: String (max 500) - Per-cook review text
editCount: Number (default: 0, max: 2)
reminderShown: Boolean (default: false)
reminderShownAt: Date
cookReply: String (max 500)
cookReplyAt: Date
createdAt: Date
updatedAt: Date
```

**Indexes:**
- `{ order: 1 }` (unique)
- `{ customer: 1 }`
- `{ cook: 1 }`

**Edit Window Rules:**
- Max 2 edits per rating
- 7-day window from `createdAt`
- Disabled if `order.hasDispute: true`

---

## 3) CORE LOGIC FLOWS

### A) Order Creation Flow (Checkout → Order)

**Source Files:**
- `/server/controllers/checkoutController.js` (lines 26-1120)

**Step-by-Step:**

1. **Request:** `POST /api/checkout/create-session`
   - **Body:** `{ cartItems: [...], countryCode: 'SA', cookPreferences: {...} }`
   - **Cart Item Structure:** `{ dishId, cookId, quantity, unitPrice, notes, portionKey, fulfillmentMode, prepReadyConfig, photoUrl }`

2. **Cart Snapshot Creation** (lines 52-187):
   - For each cart item:
     - Validate `dishId` format (24 hex chars)
     - Lookup `DishOffer` by `item.dishId`
     - If found, populate `AdminDish` with category
     - **Convert Cook._id → User._id:**
       ```javascript
       const cook = await Cook.findById(item.cookId);
       cookUserId = cook.userId.toString(); // LINE 83
       ```
     - Compute `readyAt` using cook's timezone (NOT from frontend)
     - Resolve `dishOffer` ID (priority: `item.dishOffer` → `item.dishId` if DishOffer → lookup by adminDishId)
     - Fetch category name from AdminDish for reporting
     - Return snapshot: `{ cook: cookUserId, dish, dishOffer, category, dishName, dishImage, quantity, unitPrice, ... }`

3. **Pricing Calculation:**
   - Call `pricingService.calculatePricing(cartSnapshot, null, userId, countryCode)`
   - Returns subtotal, delivery fees, total

4. **Create CheckoutSession:**
   - Store cart snapshot, pricing, user, country

5. **Payment Processing (Stripe):**
   - Create Stripe Checkout Session
   - Return session URL to frontend

6. **Webhook: Payment Success** → Create Order (lines 920-1120):
   - **Group items by cook AND fulfillmentMode:**
     ```javascript
     const key = `${item.cook}_${item.fulfillmentMode || 'pickup'}`; // LINE 937
     ```
   - For each group:
     - Lookup Cook profile by `userId` (line 951)
     - Calculate subOrder total
     - Calculate delivery fee (combined vs separate logic)
     - Calculate combined ready time (max prep time)
     - **Create subOrder:**
       ```javascript
       subOrders.push({
         cook: cookUserId, // User._id as STRING (line 1055)
         cookName: cook.storeName || cook.name,
         pickupAddress: `${cook.city}, ${cook.area}`,
         cookLocationSnapshot: { lat, lng, address, city },
         totalAmount: subOrderTotal,
         status: 'order_received',
         fulfillmentMode,
         timingPreference,
         deliveryFee,
         items: [...] // LINE 1078-1125
       });
       ```
     - For each item in subOrder:
       - Resolve `dishOffer` ID (multiple fallback paths)
       - Save `productSnapshot.category` for Sales by Category

7. **Atomic Stock Decrement:**
   - Use `findOneAndUpdate` with `$inc: { stock: -quantity }`
   - Rollback on failure

8. **Create Order Document:**
   ```javascript
   const order = await Order.create({
     customer: userId,
     checkoutSession: session._id,
     deliveryAddress: session.deliveryAddress,
     subOrders,
     totalAmount: pricingResult.total,
     status: 'pending'
   });
   ```

**CRITICAL RULES:**
- `subOrders.cook` stores `User._id` (NOT `Cook._id`)
- Items grouped by `cook + fulfillmentMode` (same cook can have multiple subOrders)
- `dishOffer` resolved with fallbacks (may be null for old orders)
- Category saved as string name in `productSnapshot.category`

---

### B) Cook Hub Orders (Working Reference Flow)

**Source Files:**
- `/server/controllers/orderController.js` (line 914: `getCookOrderStats`)
- `/client/web/src/pages/Orders.js`

**Backend Logic (getCookOrderStats):**
```javascript
const userId = req.user._id.toString(); // LINE 917

const orders = await Order.find({
  'subOrders.cook': userId // Query by User._id as string
});

orders.forEach(order => {
  order.subOrders.forEach(sub => {
    if (sub.cook.toString() === userId) { // STRING comparison (line 932)
      allOrders++;
      // Count by status...
    }
  });
});
```

**Frontend Pattern:**
- Token: `localStorage.getItem('token')`
- API call: `api.get('/orders/cook/orders')`
- Auth interceptor adds `Authorization: Bearer ${token}`
- Response: Array of orders with subOrders filtered by cook

**Key Point:** Uses `.toString()` for comparison - matches DB storage format

---

### C) Cook Hub Overview (All Endpoints)

**Source Files:**
- `/server/controllers/orderController.js`
- `/client/web/src/utils/api.js` (lines 181-219)

**Endpoints:**

1. **`GET /api/orders/cook/sales-summary?period=last30`**
   - **Auth:** Requires JWT (User._id from token)
   - **Query:** `req.user._id.toString()` → match `subOrders.cook`
   - **Date Range:** Based on `period` param (today, last7, last30, last90)
   - **Returns:** `{ salesData: [...], totalSales, orderCount }`

2. **`GET /api/orders/cook/sales-by-category`**
   - **Source:** `subOrder.items[].productSnapshot.category`
   - **Group by:** Category name string
   - **Returns:** `[{ category, sales }]`

3. **`GET /api/orders/cook/order-stats`**
   - **Source:** All orders where `subOrders.cook === userId`
   - **Returns:** `{ allOrders, dispatched, awaitingPickup, inKitchen, cancellations }`

4. **`GET /api/orders/cook/recent-activity`**
   - **Source:** Recent orders with subOrders
   - **Returns:** Activity timeline

5. **`GET /api/orders/cook/performance-stats`**
   - **Source:** Order completion rates, ratings
   - **Returns:** Performance metrics

6. **`GET /api/orders/cook/traffic-stats`**
   - **Status:** STUB (not implemented)
   - **Returns:** Mock data

**Common Pattern:**
```javascript
const userId = req.user._id.toString();
const orders = await Order.find({ 'subOrders.cook': userId });
```

---

### D) Ratings Submission Flow (Web + Mobile)

**Source Files:**
- `/server/controllers/ratingController.js` (lines 1-200)
- `/client/web/src/components/RatingDialog.js`
- `/mobile/foodie/lib/screens/reviews/review_submission_screen.dart`

**API Endpoint:** `POST /api/ratings/order/:orderId`

**Request Body:**
```javascript
{
  dishRatings: [
    { product: ObjectId, dishOffer: ObjectId|null, rating: 1-5, review: String }
  ],
  overallReview: String, // Legacy fallback
  cookReviews: [
    { cookUserId: String, overallReview: String } // Per-cook review texts
  ]
}
```

**Backend Processing (Lines 14-200):**

1. **Validate:**
   - Order ID format
   - `dishRatings` array not empty
   - Each rating 1-5

2. **Find Order:** `Order.findById(orderId)` (NO populate - product is Mixed type)

3. **Verify Ownership:**
   ```javascript
   const orderCustomerId = order.customer?._id?.toString() || order.customer?.toString();
   if (orderCustomerId !== customerId) return 403;
   ```

4. **Verify Order Status:**
   ```javascript
   const finalizedStatuses = ['completed', 'delivered', 'pickedup'];
   if (!finalizedStatuses.includes(order.status)) return 400;
   ```

5. **Multi-Cook Grouping (Lines 76-128):**
   ```javascript
   const cookGroups = new Map();
   
   for (const subOrder of order.subOrders) {
     const cookUserId = subOrder.cook?._id?.toString() || subOrder.cook?.toString();
     
     // Get product IDs for this subOrder
     const subOrderProductIds = new Set();
     subOrder.items.forEach(item => {
       const productId = item.product._id || item.product;
       subOrderProductIds.add(productId.toString());
     });
     
     // Filter dishRatings to this subOrder
     const subOrderDishRatings = dishRatings.filter(dr => 
       subOrderProductIds.has(dr.product.toString())
     );
     
     // Convert User._id → Cook._id
     let cookId = cookUserId;
     const cookProfile = await Cook.findOne({ userId: cookUserId });
     if (cookProfile) {
       cookId = cookProfile._id.toString();
     }
     
     // Get per-cook review text
     const cookReviewEntry = cookReviews?.find(cr => 
       cr.cookUserId === cookUserId || cr.cookId === cookUserId
     );
     const perCookReview = cookReviewEntry?.overallReview || overallReview || '';
     
     cookGroups.set(cookUserId, {
       cookId,
       cookUserId,
       dishRatings: subOrderDishRatings,
       overallReview: perCookReview
     });
   }
   ```

6. **Create/Update Rating Per Cook (Lines 137-200):**
   ```javascript
   for (const [cookUserId, group] of cookGroups) {
     let orderRating = await OrderRating.findOne({
       order: orderId,
       cook: cookId // Cook._id (profile ID)
     });
     
     if (orderRating) {
       // Check edit eligibility (max 2 edits, 7-day window)
       const canEdit = await orderRating.canEdit();
       if (!canEdit.canEdit) return 400;
       
       orderRating.editCount += 1;
       orderRating.dishRatings = group.dishRatings;
       orderRating.overallReview = group.overallReview;
     } else {
       orderRating = new OrderRating({
         order: orderId,
         customer: customerId,
         cook: cookId,
         dishRatings: group.dishRatings,
         overallReview: group.overallReview
       });
     }
     
     orderRating.calculateOverallRating(); // Average of dish ratings
     await orderRating.save();
   }
   ```

**CRITICAL RULES:**
- One `OrderRating` document per cook per order (not one per order)
- `OrderRating.cook` stores `Cook._id` (profile ID)
- `Order.subOrders.cook` stores `User._id` (account ID)
- Conversion: `Cook.findOne({ userId: cookUserId })` to get `Cook._id`
- Per-cook review text from `cookReviews` array
- Edit window: 7 days, max 2 edits

---

## 4) CRITICAL SYSTEM RULES

### A) Cook Identification Logic

**Two-Step Verification:**
```javascript
// Step 1: Check User model
user.isCook === true
user.role_cook_status === 'active'

// Step 2: Find Cook profile
const cookProfile = await Cook.findOne({ userId: user._id });
if (!cookProfile) {
  // User has isCook=true but no Cook profile = ERROR
}
```

**IMPORTANT:**
- `isCook: true` alone ≠ Active Cook
- `role_cook_status: 'active'` alone ≠ Active Cook
- **Both must be true** + Cook profile must exist

---

### B) subOrders.cook Comparison Method

**WRONG (causes bugs):**
```javascript
// Comparing ObjectId to string - WILL FAIL
if (subOrder.cook === userId) { ... }

// Query without toString() - WILL FAIL on string IDs
Order.find({ 'subOrders.cook': userId })
```

**CORRECT:**
```javascript
// Convert both to strings
if (subOrder.cook.toString() === userId.toString()) { ... }

// Query: userId should already be string from req.user._id.toString()
const userId = req.user._id.toString();
Order.find({ 'subOrders.cook': userId })
```

**Reason:**
- Schema type: `mongoose.Schema.Types.Mixed`
- Stored as: STRING (converted during checkout: `cook.userId.toString()`)
- Some old records may be ObjectId, new records are strings

---

### C) Token Usage Pattern

**Web:**
```javascript
// Storage
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));

// Retrieval (ALWAYS fresh from localStorage)
const token = localStorage.getItem('token');

// API Interceptor (api.js line 119)
const token = localStorage.getItem('token');
if (token && token !== 'undefined' && token !== 'null') {
  config.headers.Authorization = `Bearer ${token}`;
}
```

**Mobile:**
- UNCERTAIN - Token management in Flutter not verified

**Auth Error Handling:**
- 401 response → Clear token + user from localStorage
- Redirect to `/signup`
- Dispatch `storage` and `authChange` events

---

### D) Category Resolution Chain

**Checkout Flow:**
```javascript
// Step 1: Get AdminDish
const product = await AdminDish.findById(dishOffer.adminDishId)
  .populate('category', 'name');

// Step 2: Extract category name
let category = null;
if (product && product.category) {
  if (typeof product.category === 'object' && product.category.name) {
    category = product.category.name; // Populated object
  } else if (typeof product.category === 'string') {
    // ObjectId string - fetch it
    const catDoc = await Category.findById(product.category).select('name').lean();
    if (catDoc) category = catDoc.name;
  }
}

// Step 3: Save in productSnapshot
productSnapshot: {
  category: category || null // String name, NOT ObjectId
}
```

**Sales by Category Reporting:**
- Source: `subOrder.items[].productSnapshot.category` (string name)
- NOT from AdminDish.category ObjectId
- Old orders without productSnapshot.category = excluded from report

---

## 5) API CONTRACTS

### A) `GET /api/orders/cook/sales-summary`

**Request:**
- **Auth:** JWT (User._id)
- **Query:** `?period=today|last7|last30|last90` (default: last30)

**Response:**
```javascript
{
  success: true,
  data: {
    salesData: [
      { date: "Oct 24", sales: 1200 }, // Format varies by period
      ...
    ],
    totalSales: Number,
    orderCount: Number
  }
}
```

**Calculation Logic:**
```javascript
// Source: req.user._id.toString()
const orders = await Order.find({
  'subOrders.cook': userId,
  createdAt: { $gte: startDate, $lte: now }
});

// Process:
orders.forEach(order => {
  order.subOrders.forEach(sub => {
    if (sub.cook.toString() === userId) {
      totalSales += sub.totalAmount;
      orderCount++;
      // Group by hour/day/week based on period
    }
  });
});
```

---

### B) `GET /api/orders/cook/order-stats`

**Request:**
- **Auth:** JWT (User._id)

**Response:**
```javascript
{
  success: true,
  data: {
    allOrders: Number,
    dispatched: Number,      // status: 'delivered'
    awaitingPickup: Number,  // status: 'ready'
    inKitchen: Number,       // status: 'order_received' | 'preparing'
    cancellations: Number    // status: 'cancelled'
  }
}
```

**Calculation Logic:**
```javascript
const orders = await Order.find({ 'subOrders.cook': userId });

orders.forEach(order => {
  order.subOrders.forEach(sub => {
    if (sub.cook.toString() === userId) {
      allOrders++;
      switch (sub.status) {
        case 'delivered': dispatched++; break;
        case 'ready': awaitingPickup++; break;
        case 'order_received':
        case 'preparing': inKitchen++; break;
        case 'cancelled': cancellations++; break;
      }
    }
  });
});
```

---

### C) `GET /api/orders/cook/sales-by-category`

**Request:**
- **Auth:** JWT (User._id)

**Response:**
```javascript
{
  success: true,
  data: [
    { category: "Grilled", sales: 3200 },
    { category: "Fried", sales: 2800 },
    ...
  ]
}
```

**Calculation Logic:**
```javascript
const orders = await Order.find({ 'subOrders.cook': userId });

const categorySales = {};

orders.forEach(order => {
  order.subOrders.forEach(sub => {
    if (sub.cook.toString() === userId) {
      sub.items.forEach(item => {
        const category = item.productSnapshot?.category;
        if (category) {
          categorySales[category] = (categorySales[category] || 0) + 
            (item.price * item.quantity);
        }
      });
    }
  });
});

// Convert to array
Object.entries(categorySales).map(([category, sales]) => ({ category, sales }));
```

**NOTE:** Items without `productSnapshot.category` are excluded.

---

### D) `GET /api/orders/cook/recent-activity`

**Request:**
- **Auth:** JWT (User._id)

**Response:**
```javascript
{
  success: true,
  data: [
    {
      orderId: String,
      type: 'new_order' | 'status_change',
      subOrderId: String,
      status: String,
      amount: Number,
      createdAt: Date
    }
  ]
}
```

**Source:** Recent orders filtered by `subOrders.cook`

---

### E) `GET /api/orders/cook/performance-stats`

**Request:**
- **Auth:** JWT (User._id)

**Response:**
```javascript
{
  success: true,
  data: {
    completionRate: Number, // Percentage
    averageRating: Number,
    totalRatings: Number,
    responseTime: Number
  }
}
```

**Completion Rate Logic:**
```javascript
const totalSubOrders = // count all subOrders for cook
const completedSubOrders = // count subOrders with status in ['delivered', 'pickedup']
const completionRate = (completedSubOrders / totalSubOrders) * 100;
```

---

### F) `GET /api/orders/cook/traffic-stats`

**Status:** ⚠️ STUB - Returns mock data

**Response:**
```javascript
{
  success: true,
  data: {
    views: Number,
    clicks: Number,
    conversionRate: Number
  }
}
```

**Source:** Hardcoded values (not calculated from real data)

---

## 6) FRONTEND DATA FLOW

### A) Web App Token Flow

**1. Login:**
```javascript
// /client/web/src/pages/Login.js (line 56)
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
window.dispatchEvent(new Event('storage'));
window.dispatchEvent(new Event('authChange'));
```

**2. API Calls:**
```javascript
// /client/web/src/utils/api.js (line 108)
const api = axios.create({
  baseURL: API_URL, // https://api.Eltekkeya.com/api (production)
});

// Interceptor (line 116-138)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // ALWAYS fresh read
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['x-country-code'] = localStorage.getItem('platformCountryCode') || 'EG';
  return config;
});
```

**3. Protected Routes:**
```javascript
// /client/web/src/components/ProtectedRoute.js
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;

if (!token || !user) {
  return <Navigate to={`/login?redirect=${location.pathname}`} />;
}

if (requireCook && (!user.isCook || user.role_cook_status !== 'active')) {
  return <Navigate to="/" />;
}
```

**4. Auth Error Handling:**
```javascript
// /client/web/src/utils/api.js (line 152-174)
if (isAuthError(error)) {
  if (backendCode === 'AUTH_SESSION_EXPIRED' || error.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/signup';
  }
}
```

---

### B) Cook Hub Orders (Working Pattern)

**Source:** `/client/web/src/pages/Orders.js`

**Data Fetch:**
```javascript
const fetchOrders = async () => {
  const token = localStorage.getItem('token');
  const response = await api.get('/orders/cook/orders');
  setOrders(response.data);
};
```

**Key Characteristics:**
- Uses `api` instance (auto-attaches token via interceptor)
- No manual header setting
- Token read fresh from localStorage on every request
- Handles 401 automatically via interceptor

---

### C) Cook Dashboard Overview (Current State)

**Source:** `/client/web/src/pages/Dashboard.js`

**⚠️ ISSUE:** Dashboard.js uses SAMPLE DATA, not API calls:
```javascript
// Line 61-94
const sampleSalesData = {
  today: [...],
  last7: [...],
  last30: [...],
  last90: [...]
};

// Line 127
const [salesData, setSalesData] = useState(sampleSalesData.last7);
```

**API Functions Exist but NOT Used:**
```javascript
// /client/web/src/utils/api.js (line 181-219)
export const getCookSalesSummary = async (period) => {
  const response = await api.get(`/orders/cook/sales-summary?period=${period}`);
  return response.data;
};

export const getCookSalesByCategory = async () => {
  const response = await api.get('/orders/cook/sales-by-category');
  return response.data;
};

export const getCookOrderStats = async () => {
  const response = await api.get('/orders/cook/order-stats');
  return response.data;
};
```

**These functions are exported but Dashboard.js does NOT import or call them.**

---

### D) Required Correct Pattern

**For overview to show real data:**
```javascript
// Import API functions
import { getCookSalesSummary, getCookOrderStats, getCookSalesByCategory } from '../utils/api';

// Fetch on mount
useEffect(() => {
  const fetchData = async () => {
    const salesData = await getCookSalesSummary(salesPeriod);
    const orderStats = await getCookOrderStats();
    const categoryData = await getCookSalesByCategory();
    
    setSalesData(salesData.data.salesData);
    setOrderStats(orderStats.data);
    setCategoryData(categoryData.data);
  };
  
  fetchData();
}, [salesPeriod]);
```

---

## 7) CURRENTLY WORKING (CONFIRMED)

### Backend
- ✅ User authentication (JWT + Firebase)
- ✅ Cook authorization (isCook + role_cook_status)
- ✅ Order creation (checkout → subOrders with cook grouping)
- ✅ Cook ID conversion (Cook._id → User._id in checkout)
- ✅ Atomic stock decrement
- ✅ Order status updates
- ✅ Multi-cook rating submission (separate OrderRating per cook)
- ✅ Rating edit window (7 days, max 2 edits)
- ✅ Sales summary endpoint
- ✅ Order stats endpoint
- ✅ Sales by category endpoint

### Frontend (Web)
- ✅ Login/Signup flow
- ✅ Token storage + auto-attachment via interceptor
- ✅ Protected routes (cook verification)
- ✅ Cook Hub Orders page (real data from API)
- ✅ Order status update UI
- ✅ Rating submission dialog (multi-cook grouping implemented)
- ✅ Cart management
- ✅ Checkout flow
- ✅ Country code handling

### Verified Working Flows
- ✅ User registers → becomes cook → appears in Cook Hub
- ✅ Customer adds dishes to cart → checkout → payment → order created
- ✅ Cook sees orders in Cook Hub Orders
- ✅ Cook updates subOrder status
- ✅ Customer rates completed order (single or multi-cook)
- ✅ Rating appears in cook profile

---

## 8) KNOWN LIMITATIONS

### Data Model Issues
- ⚠️ `subOrders.cook` is Mixed type (ObjectId OR String) - causes query bugs
- ⚠️ Old orders missing `dishOffer` field (Phase 5 addition)
- ⚠️ Old orders missing `productSnapshot.category` (excluded from category reports)
- ⚠️ `OrderRating.cook` stores `Cook._id` but `Order.subOrders.cook` stores `User._id` - conversion required
- ⚠️ Deleted cook references may cause orphan subOrders

### API Limitations
- ⚠️ Traffic stats endpoint returns stub data (not implemented)
- ⚠️ No endpoint for cook profile views/clicks
- ⚠️ Performance stats calculation incomplete (UNCERTAIN implementation)

### Frontend Issues
- ⚠️ Cook Dashboard Overview uses SAMPLE DATA (not connected to API)
- ⚠️ API functions exist in `api.js` but not imported in Dashboard.js
- ⚠️ Mobile review screen only handles single cook (multi-cook refactor pending)

### Deployment Constraints
- ⚠️ Backend changes require Cloud Run deployment (not hot-reloadable)
- ⚠️ Web app changes require Firebase deployment
- ⚠️ Mobile app not deployed (local only)

### Business Logic Gaps
- ⚠️ Cook rejection reason display (implemented but UNCERTAIN if working)
- ⚠️ Kitchen photo upload flow (implemented but UNCERTAIN if working)
- ⚠️ Dispute handling (hasDispute field exists but workflow UNCERTAIN)
- ⚠️ Cook reply to reviews (field exists but UI UNCERTAIN)

---

## 9) DO NOT BREAK RULES

### Source of Truth
- 🚨 **Web app is source of truth** for UI/UX patterns
- 🚨 **Mobile must match web logic** (not vice versa)
- 🚨 **Backend changes require deployment** - test thoroughly before deploying

### Completion Criteria
- 🚨 **If not visibly working → not done** (sample data ≠ working feature)
- 🚨 **No partial implementations** - complete the full flow or don't start
- 🚨 **No breaking existing logic** - verify all affected paths

### Change Management
- 🚨 **Backend changes** → Test with existing frontend before deploying
- 🚨 **API contract changes** → Update ALL consumers (web + mobile)
- 🚨 **Data model changes** → Migration script required for existing data

### Testing Order
1. Auth flow (401 / token staleness)
2. Cook matching (string vs ObjectId)
3. Data existence (old orders missing fields)
4. Logic correctness (calculations, aggregations)

---

## 10) DEBUGGING ORDER

### Step 1: Authentication (401 / Token)
```javascript
// Check token exists
const token = localStorage.getItem('token');
console.log('Token:', token ? 'Present' : 'Missing');

// Check token validity
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;
console.log('User:', user);

// Check API request
// Look for: Authorization: Bearer <token> in request headers
```

**Common Issues:**
- Token missing → Login expired or cleared
- Token invalid → User deleted or token revoked
- Token stale → Backend restarted, old tokens invalidated

---

### Step 2: Cook Matching
```javascript
// Verify User is cook
console.log('isCook:', user.isCook);
console.log('role_cook_status:', user.role_cook_status);

// Verify Cook profile exists
const cookProfile = await Cook.findOne({ userId: user._id });
console.log('Cook profile:', cookProfile);

// Verify subOrders.cook comparison
console.log('subOrder.cook type:', typeof subOrder.cook);
console.log('subOrder.cook value:', subOrder.cook);
console.log('userId:', userId);
console.log('Match:', subOrder.cook.toString() === userId);
```

**Common Issues:**
- User.isCook = true but no Cook profile → Registration incomplete
- SubOrder.cook stored as ObjectId but compared as string → Query fails
- Cook._id vs User._id confusion → Wrong ID used in query

---

### Step 3: Data Existence
```javascript
// Check orders exist for cook
const orders = await Order.find({ 'subOrders.cook': userId });
console.log('Orders count:', orders.length);

// Check subOrders have expected fields
orders.forEach(order => {
  order.subOrders.forEach(sub => {
    console.log('SubOrder cook:', sub.cook);
    console.log('Items count:', sub.items.length);
    console.log('First item dishOffer:', sub.items[0]?.dishOffer);
    console.log('First item category:', sub.items[0]?.productSnapshot?.category);
  });
});
```

**Common Issues:**
- No orders → Cook has no sales yet
- Orders exist but subOrders.cook doesn't match → ID type mismatch
- dishOffer null → Old order (before Phase 5)
- productSnapshot.category null → Old order (category not saved)

---

### Step 4: Logic Correctness
```javascript
// Verify calculation logic
let totalSales = 0;
orders.forEach(order => {
  order.subOrders.forEach(sub => {
    if (sub.cook.toString() === userId) {
      totalSales += sub.totalAmount;
    }
  });
});
console.log('Calculated total:', totalSales);

// Verify aggregation
const categorySales = {};
orders.forEach(order => {
  order.subOrders.forEach(sub => {
    sub.items.forEach(item => {
      const category = item.productSnapshot?.category;
      if (category) {
        categorySales[category] = (categorySales[category] || 0) + 
          (item.price * item.quantity);
      }
    });
  });
});
console.log('Category sales:', categorySales);
```

**Common Issues:**
- Double counting → Not filtering by cook properly
- Missing categories → productSnapshot.category is null
- Wrong totals → Including/excluding delivery fees incorrectly

---

## QUICK REFERENCE

### Critical ID Mappings

| Field | Stores | Type | Notes |
|-------|--------|------|-------|
| `User._id` | User account ID | ObjectId | Primary key |
| `Cook._id` | Cook profile ID | ObjectId | Different from User._id |
| `Cook.userId` | Links to User._id | ObjectId | One-to-one mapping |
| `DishOffer.cook` | Cook._id | ObjectId | Profile ID |
| `Order.subOrders.cook` | User._id | **Mixed (String)** | Account ID - stored as string |
| `OrderRating.cook` | Cook._id | ObjectId | Profile ID (converted from userId) |

### Conversion Patterns

```javascript
// Cook._id → User._id
const cook = await Cook.findById(cookId);
const userId = cook.userId;

// User._id → Cook._id
const cook = await Cook.findOne({ userId: userId });
const cookId = cook._id;

// SubOrder.cook comparison
if (subOrder.cook.toString() === userId.toString()) { ... }
```

### Status Enums

**Order.status:** `'pending' | 'confirmed' | 'partially_delivered' | 'completed' | 'cancelled'`

**SubOrder.status:** `'order_received' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'pickedup' | 'cancelled'`

**User.role_cook_status:** `'none' | 'pending' | 'active' | 'rejected' | 'suspended'`

**Cook.status:** `'pending' | 'active' | 'rejected' | 'suspended'`

---

## END OF BRIEF

**Last Updated:** 2026-03-03  
**Verified From:** Actual source code only  
**UNCERTAIN Items:** Mobile token management, performance stats calculation, dispute workflow, cook reply UI  

