# ElTekkeya Marketplace — Master Project Handoff Brief

**Purpose:** This document is the operational handoff, technical blueprint, debugging guide, parity framework, deployment map, and rulebook for continuing ElTekkeya development in a new AI IDE/session with minimal context loss.

**Read first:** This is not only documentation. It is the project operating system. The new IDE must follow the rules, verify current code/runtime, and avoid assumptions.

**Last rebuilt from uploaded project files:** Batch 1–5 plus latest mobile review-related files.

---

## 0. How to Use This Brief

When starting a new AI IDE/session:

```text
Read this full brief completely before editing anything.

Do not summarize it.

Use it as project operating context.

Before any change:
1. identify platform scope,
2. inspect relevant files read-only,
3. identify the working reference flow,
4. compare working vs broken behavior,
5. propose the smallest targeted fix,
6. avoid unrelated refactors,
7. require runtime verification.

Web behavior is the source of truth.
Mobile must match web logic.
If uncertain, ask instead of guessing.
```

This file intentionally contains repeated warnings where mistakes have happened before. The repetition is deliberate.

---

# 1. Executive Summary

ElTekkeya is a multi-platform home-food marketplace.

## Platforms

| Platform | Stack | Location | Status |
|---|---|---|---|
| Backend API | Node.js / Express / MongoDB / Mongoose | `/server` | Production on Cloud Run |
| Web app | React / MUI / Firebase Hosting | `/client/web` | Production |
| Admin panel | React / MUI / Firebase Hosting | `/admin` | Production admin |
| Mobile app | Flutter / Dart / Provider | `/mobile/foodie` | Local development / Flutter web preview |

## Core Business Model

- Users can be foodies.
- Users can also become cooks.
- A cook account is **not** `role: "cook"`.
- A cook user is generally:
  - `role: "foodie"`
  - `isCook: true`
  - `role_cook_status: "active"`
  - plus a related `Cook` profile.
- `User._id` and `Cook._id` are different IDs.
- `DishOffer.cook` stores `Cook._id`.
- `Order.subOrders.cook` stores `User._id`, often as `Mixed` / string.
- This ID split is the biggest source of bugs in the project.

## Current Development Principle

- **Web is source of truth for business behavior.**
- **Mobile is parity target.**
- **Backend owns business logic.**
- **Runtime proof beats theoretical code correctness.**

---

# 2. Non-Negotiable Golden Rules

1. **Web app is the source of truth for behavior and business logic.**
2. **Mobile must match web behavior exactly** unless user explicitly says a specific mobile UI design is the new visual source of truth.
3. **Backend owns all business logic**: pricing, VAT, delivery fee, stock validation, grouping, order status, ratings aggregation, prep time, category calculations.
4. **Do not assume root cause.**
5. **Do not refactor unrelated code.**
6. **Do not add endpoints until proving existing endpoints cannot support the feature.**
7. **Do not change schema unless required and migration impact is understood.**
8. **Do not treat old historical data as clean.**
9. **Do not trust comments if code contradicts them.**
10. **If not visibly working, it is not done.**
11. **If an endpoint returns 401, debug auth before business logic.**
12. **Always compare broken flow against a working reference flow.**
13. **Always list exact files changed.**
14. **Always provide runtime verification steps.**
15. **Never commit debug scripts or accidental generated files.**

---

# 3. Current Stable State and Safepoints

## Repo

```text
https://github.com/AhmedElbedeawy/marketplace2.git
```

## Local workspace

```bash
/Users/AhmedElbedeawy/Documents/Qoder backups/ElTekkeya Marketplace
```

## Known current branch during latest stable work

```text
safepoint/rating-system-safepoint
```

## Known useful safepoint tag

```text
safepoint/cook-hub-overview-working
```

## Important commits

- `f4fc0ae` — `Fix cook hub overview auth and stats data flow`
- `8925136` — `Ignore debug scripts and firebase cache`

## Restore command

```bash
git checkout safepoint/cook-hub-overview-working
```

Older known restore point:

```bash
git checkout safepoint/best-stable-after-dish-profile-fix
```

---

# 4. Deployment Map

## 4.1 Backend API

Source:

```text
/server
```

Cloud Run service:

```text
eltekkeya-api
```

Region:

```text
us-central1
```

Production API domain:

```text
https://api.eltekkeya.com/api
```

Observed Cloud Run service URL:

```text
https://eltekkeya-api-967620840459.us-central1.run.app
```

Deploy from project root:

```bash
cd "/Users/AhmedElbedeawy/Documents/Qoder backups/ElTekkeya Marketplace"
gcloud run deploy eltekkeya-api --source ./server --region us-central1 --allow-unauthenticated
```

Cloud Run logs:

```bash
gcloud run services logs read eltekkeya-api --region us-central1 --limit=200
```

Filtered auth logs:

```bash
gcloud run services logs read eltekkeya-api --region us-central1 --limit=200 | grep -A 12 -B 3 "PROTECT MIDDLEWARE\|Authorization Check\|Not authorized\|Token decoded\|User loaded\|jwt expired"
```

## 4.2 Web App

Source:

```text
/client/web
```

Build/deploy:

```bash
cd "/Users/AhmedElbedeawy/Documents/Qoder backups/ElTekkeya Marketplace/client/web"
npm run build
firebase deploy --only hosting
```

Known domain:

```text
https://eltekkeya.com
```

Web app package includes React, MUI, Google Maps API library, Stripe, Axios, React Router, Redux, Recharts, UUID.

## 4.3 Admin Panel

Source:

```text
/admin
```

Known URL:

```text
https://eltekkeya-admin.web.app
```

Admin uses React, MUI, Axios, Redux, Recharts, date-fns, moment-timezone.

**Important:** Always inspect `firebase.json` and `.firebaserc` before admin deploy. Do not guess Firebase hosting target names.

Likely pattern:

```bash
cd "/Users/AhmedElbedeawy/Documents/Qoder backups/ElTekkeya Marketplace/admin"
npm run build
firebase deploy --only hosting:<admin-target>
```

or from root if configured:

```bash
firebase deploy --only hosting:admin
```

But exact command must be verified from Firebase config.

## 4.4 Mobile App

Source:

```text
/mobile/foodie
```

Status:

```text
Local development only.
No deployment unless user explicitly asks.
```

Fast Flutter web preview:

```bash
cd "/Users/AhmedElbedeawy/Documents/Qoder backups/ElTekkeya Marketplace/mobile/foodie"
lsof -ti tcp:8083 | xargs kill -9 2>/dev/null
flutter run -d web-server --web-port 8083 --web-hostname 127.0.0.1 --release
```

Open:

```text
http://localhost:8083
```

Do not paste terminal prompt text into commands.

---

# 5. Package / Startup Notes

## Backend package

Backend has scripts:
- `start`: `node server.js`
- `dev`: `nodemon server.js`

Use from `/server`.

## Root package

Root may also contain scripts pointing to `server/server.js`. Do not confuse root scripts with `/server/package.json`.

## Backend server.js facts

- Uses Express.
- Uses `cors()`.
- Uses HTTP server.
- Initializes Socket.IO.
- Connects MongoDB before starting server.
- Serves `/uploads` statically.
- Has `/proxy-image` endpoint used by Flutter Web to avoid CORS for GCS/Firebase image URLs.
- Loads env from `server/.env`.

---

# 6. Environment and Secrets

## 6.1 MongoDB

MongoDB Atlas is used.

Important:
- DB name has been confused historically (`marketplace`, `foodie_marketplace`, `test`).
- One current memory says active DB is `test` lowercase.
- **Do not assume DB name. Verify from deployed `MONGO_URI`.**
- Database name casing matters.

Security:
- MongoDB credentials were exposed in chats/logs.
- Rotate DB password after stabilization.
- Move `MONGO_URI` to Google Secret Manager.
- Do not paste connection strings into chats/logs.

Atlas hardening plan:
1. Cloud Run VPC connector.
2. Cloud NAT static egress.
3. Atlas allowlist fixed egress IPs only.
4. Remove `0.0.0.0/0` after stable.

## 6.2 Google Maps / Places

Known:
- Google Maps API setup exists with web, Android, and iOS keys.
- Web package includes `@react-google-maps/api`.
- Web production must have `REACT_APP_GOOGLE_MAPS_API_KEY` configured.
- Local `.env` does not automatically carry to Firebase production.
- Placeholder package/bundle IDs such as `com.example.foodie` must be replaced.
- Android release SHA-1 must be added later.
- Update web key referrers if domains change.
- Keep keys private.

Likely APIs:
- Maps JavaScript API
- Places API
- Geocoding API
- mobile Maps SDKs / Places-related package depending on Flutter config.

Before changing maps:
1. Inspect web address/map components.
2. Inspect mobile address/location screens.
3. Inspect `pubspec.yaml`.
4. Inspect env var usage.
5. Do not expose keys.

## 6.3 Stripe / Card Payments

Backend pricing/payment has Stripe payment intent route.
Web package includes Stripe React libraries.
Settings include card payment fields.
Do not assume production Stripe is complete.
Verify:
- env vars,
- settings,
- checkout payment method,
- payment intent route,
- frontend wiring.

---

# 7. Firebase / Cloud Storage / Images

## 7.1 Storage architecture

`storageService.js` is unified storage abstraction.

It supports:
- Google Cloud Storage upload,
- local fallback,
- migration of local files to cloud,
- file deletion,
- accessibility checks,
- categories:
  - offers
  - dishes
  - categories
  - hero
  - cooks
  - users

Cloud storage config:
- `FIREBASE_STORAGE_BUCKET`
- fallback bucket: `eltekkeya.appspot.com`
- project fallback: `eltekkeya`
- local service account path from `FIREBASE_SERVICE_ACCOUNT_KEY` or `./config/firebase-service-account.json`
- Cloud Run ADC fallback.

Uploads call `file.makePublic()` and return:

```text
https://storage.googleapis.com/<bucket>/<path>
```

## 7.2 Local uploads trap

Cloud Run filesystem is ephemeral.
Anything stored only in `/uploads` can disappear after deploy/restart.

Major upload areas:
- DishOffer images
- AdminDish images
- Category icons
- Hero images
- Cook avatars
- User avatars

Current confirmed:
- DishOffer images use `storageService`.
- AdminDish images use `storageService`.
- Category icons use `storageService`.
- Settings/hero images use `storageService`.

Still verify:
- Cook avatars.
- User avatars.
- Any older upload controller not using storageService.

## 7.3 Flutter Web image proxy

Mobile `ApiConfig.normalizeImageUrl` routes `storage.googleapis.com` or `firebasestorage.googleapis.com` images through:

```text
https://api.eltekkeya.com/proxy-image?url=<encoded>
```

Server has `/proxy-image`.

Reason:
- Flutter Web CORS issues with GCS/Firebase image URLs.

Do not remove proxy logic without testing Flutter Web.

---

# 8. Core Data Model Truth

## 8.1 User model

Important fields:
- `name`
- `email`
- `phone`
- `password`
- `role`
- `role_cook_status`
- `isCook`
- `countryCode`
- `profilePhoto`
- `storeName`
- `preferredView`
- `favorites.products`
- `favorites.cooks`
- `cookRatingAvg`
- `cookRatingCount`
- `adminBoost`
- `fcmToken`
- `notificationSettings`

Role enum:
```js
['foodie', 'admin', 'super_admin']
```

Cook status enum:
```js
['none', 'pending', 'active', 'rejected', 'suspended']
```

Critical:
```js
role !== 'cook'
```

Cook identity:
```js
user.isCook === true && user.role_cook_status === 'active'
```

## 8.2 Cook model

Important fields:
- `userId` → User
- `name`
- `email`
- `storeName`
- `countryCode`
- `profilePhoto`
- `originalPhoto`
- `ratings.average`
- `ratings.count`
- `ratings.userRatings`
- `isTopRated`
- `status`
- `dishesCount`
- `ordersCount`
- `phone`
- `area`
- `location.lat`
- `location.lng`
- `city`
- `bio`
- `isAvailable`

Critical:
- `Cook._id` is the cook profile ID.
- `Cook.userId` is the User ID.
- They are different.

## 8.3 DishOffer model

Important fields:
- `adminDishId` → AdminDish
- `cook` → Cook
- `price`
- `stock`
- `images`
- `portionSize`
- `variants[]`
  - `portionKey`
  - `portionLabel`
  - `price`
  - `stock`
- `prepReadyConfig`
- `fulfillmentModes.pickup`
- `fulfillmentModes.delivery`
- `deliveryFee`
- `countryCode`
- `isActive`
- `ratings.average`
- `ratings.count`

Critical:
```js
DishOffer.cook = Cook._id
```

Compound unique index:
```js
{ cook: 1, adminDishId: 1 }
```

Meaning:
- one cook can offer one AdminDish only once.

## 8.4 AdminDish model

Important fields:
- `nameEn`
- `nameAr`
- `descriptionEn`
- `descriptionAr`
- `longDescriptionEn`
- `longDescriptionAr`
- `category` → Category
- `imageUrl`
- `isActive`
- `isPopular`

Public menu is AdminDish + offer stats.

## 8.5 Category model

Important fields:
- `name` legacy
- `nameEn`
- `nameAr`
- `description`
- `descriptionAr`
- `icons.web`
- `icons.mobile`
- `icon` legacy
- `color`
- `mobileFontColor`
- `sortOrder`
- `isActive`

Mobile category UI depends on:
- mobile icon,
- mobile font color,
- sort order.

## 8.6 Order model

Top-level fields:
- `customer` → User
- `checkoutSession`
- `deliveryAddress`
- `subOrders[]`
- `totalAmount`
- `status`
- `notes`
- `hasDispute`
- `hasIssue`
- `ratingReminderScheduled`
- `ratingReminderSentAt`
- `completedAt`
- `vatSnapshot`
- `scheduledTime`

Parent order status enum:
```js
['pending', 'confirmed', 'partially_delivered', 'completed', 'cancelled']
```

## 8.7 SubOrder model

Fields:
- `cook` → Mixed, ref User, required
- `cookName`
- `pickupAddress`
- `cookLocationSnapshot`
- `totalAmount`
- `status`
- `prepTime`
- `scheduledTime`
- `cancellationReason`
- `fulfillmentMode`
- `timingPreference`
- `combinedReadyTime`
- `deliveryFee`
- `items[]`

SubOrder status enum:
```js
['order_received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'pickedup', 'cancelled']
```

Critical:
```js
subOrders.cook = User._id
```

And because it is `Mixed`, always compare:

```js
subOrder.cook?.toString() === req.user._id.toString()
```

## 8.8 OrderItem model

Fields:
- `product` → Mixed, legacy Product/AdminDish/string
- `dishOffer` → DishOffer
- `quantity`
- `price`
- `notes`
- `isUnavailable`
- `prepTime`
- `readyAt`
- `prepTimeText`
- `productSnapshot.name`
- `productSnapshot.image`
- `productSnapshot.description`
- `productSnapshot.category`

Important:
- `productSnapshot.category` exists for Sales by Category reporting.
- Historical orders may not have it.

## 8.9 CheckoutSession model

Fields:
- `user`
- `status`
- `cartSnapshot[]`
  - `cook` Mixed ref User
  - `dish` Mixed ref Product
  - `dishOffer` Mixed ref DishOffer
  - `dishName`
  - `quantity`
  - `unitPrice`
  - `notes`
  - `portionKey`
  - `fulfillmentMode`
  - `deliveryFee`
  - `prepTime`
  - `prepReadyConfig`
  - `dishImage`
- `cookPreferences`
- `addressSnapshot`
- `pricingBreakdown`
- `appliedCoupon`
- `paymentMethod`
- `paymentStatus`
- `paymentIntentId`
- `idempotencyKey`
- `expiresAt`

Note:
- Uploaded CheckoutSession schema does not explicitly list `category` in cartSnapshot.
- `checkoutController` appears to add `category` to snapshot. Verify strict mode behavior if relying on this field.

## 8.10 Cart model

One cart per user per country.

Fields:
- `user`
- `countryCode`
- `items[]`
  - `offerId` → DishOffer
  - `adminDishId` → AdminDish
  - `cookId` → User
  - `portionKey`
  - `quantity`
  - `fulfillmentMode`
  - `countryCode`
  - display snapshot:
    - `dishName`
    - `photoUrl`
    - `cookName`
    - `priceAtAdd`
    - `deliveryFee`
    - `prepTime`

Composite identity:
```text
offerId + portionKey + fulfillmentMode + countryCode
```

## 8.11 Notification model

Fields:
- `userId`
- `title`
- `message`
- `titleAr`
- `messageAr`
- `type`
- `entityType`
- `entityId`
- `deepLink`
- `role`
- `countryCode`
- `isRead`
- `readAt`

Supports routing/deep links.

## 8.12 OrderRating model

Fields:
- `order` → Order, unique in schema
- `customer` → User
- `cook` → User according to schema
- `dishRatings[]`
  - `product` → Product
  - `dishOffer` → DishOffer
  - `rating`
  - `review`
- `overallRating`
- `overallReview`
- `editCount`
- `reminderShown`
- `cookReply`

**Critical inconsistency / trap:**
- Model says `cook` refs `User`.
- Current ratingController logic converts `User._id → Cook._id` and may store Cook._id in `OrderRating.cook`.
- Controller also searches `OrderRating.findOne({ order, cook })`.
- Schema has `order` unique, which conflicts with “one rating per cook per order” unless the unique index has been changed/migrated in DB.
- Treat rating storage as high-risk. Verify actual indexes and DB before changing rating logic.

---

# 9. ID Mapping Table

| Field | Stores | Type | Notes |
|---|---|---|---|
| `User._id` | user account | ObjectId | auth identity |
| `Cook._id` | cook profile | ObjectId | DishOffer ownership |
| `Cook.userId` | User._id | ObjectId | maps cook profile to account |
| `DishOffer.cook` | Cook._id | ObjectId | offer owner |
| `Order.subOrders.cook` | User._id | Mixed/string | cook order owner |
| `CheckoutSession.cartSnapshot.cook` | User._id | Mixed | created by checkout conversion |
| `Cart.items.cookId` | User._id | ObjectId | backend cart model |
| `OrderRating.cook` | inconsistent | schema User, controller may use Cook | verify before changes |

---

# 10. Auth / Authorization

## 10.1 Auth routes

Auth routes:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/social-login`
- `POST /api/auth/become-cook`

Demo routes are disabled.

## 10.2 Auth controller

Register supports:
- normal foodie registration,
- `requestCook`,
- storeName/expertise/bio/city/area/location,
- `role_cook_status: pending` for cook request.

JWT:
```js
jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE || '30d' })
```

## 10.3 Middleware

`protect`:
- checks Bearer token,
- verifies JWT,
- loads User,
- attaches `req.user`.

`authorize('cook')`:
- should authorize:
```js
req.user.isCook === true &&
(req.user.role_cook_status === 'active' || req.user.role_cook_status === 'approved')
```

But model enum is `active`, not `approved`. `approved` is only fallback.

Do not use:
```js
req.user.role === 'cook'
```

## 10.4 Mobile token storage trap

Mobile `AuthProvider` stores token under:

```text
authToken
```

Mobile `NotificationProvider` reads:

```text
auth_token
```

This mismatch can cause notification 401 or missing notification auth unless another part writes `auth_token`.

This is a serious trap.

---

# 11. Backend Route Map

## 11.1 Checkout routes

Base:
```text
/api/checkout
```

Routes:
- `POST /session`
- `GET /session/:id`
- `PATCH /session/:id/country`
- `PATCH /session/:id/address`
- `POST /session/:id/coupon`
- `DELETE /session/:id/coupon`
- `PATCH /session/:id/payment-method`
- `POST /session/:id/payment-intent`
- `POST /session/:id/confirm`

All protected.

## 11.2 Order routes

Base:
```text
/api/orders
```

Routes:
- `POST /`
- `GET /`
- `GET /:id`
- `POST /:orderId/cancel`
- `POST /:id/report-issue`
- `POST /:orderId/sub-order/:subOrderId/cancel`
- `PUT /sub-order/:subOrderId/status`
- `GET /cook/sales-summary`
- `GET /cook/sales-by-category`
- `GET /cook/order-stats`
- `GET /cook/traffic-stats`
- `GET /cook/recent-activity`
- `GET /cook/performance-stats`
- `GET /cook/orders`
- `GET /cook/orders/:id`
- `PUT /:id/scheduled-time`
- `PUT /:id/items/:productId/unavailable`

Cook routes require:
```js
protect, authorize('cook')
```

## 11.3 Rating routes

Base:
```text
/api/ratings
```

Routes:
- `POST /order/:orderId`
- `GET /order/:orderId/status`
- `GET /order/:orderId`
- `GET /pending-reminders`
- `POST /order/:orderId/reminder-shown`
- `POST /:ratingId/reply`
- `GET /cook/:cookId/reviews`
- `GET /cook/:cookId/summary`
- `POST /batch-status`

## 11.4 DishOffer routes

Base:
```text
/api/dish-offers
```

Routes:
- `GET /my` protected
- `POST /` protected with images
- `PUT /:id` protected with images
- `PATCH /:id/stock` protected
- `DELETE /:id` protected
- `GET /:id`
- `GET /popular`
- `GET /by-admin-dish/:adminDishId`
- `GET /by-admin-dish-lite/:adminDishId`
- `GET /by-cook/:cookId`

**Critical route-order trap:**
`GET /:id` appears before `/popular`, `/by-admin-dish`, `/by-cook`. In Express, this can swallow routes like `/popular` as `id = popular` if earlier route matches. Verify runtime. Public specific routes should normally be before `/:id`.

## 11.5 Cart routes

Base:
```text
/api/cart
```

Routes:
- `GET /`
- `DELETE /`
- `POST /add`
- `POST /sync`
- `POST /refresh-stock`
- `POST /validate-stock`
- `PUT /:itemId`
- `DELETE /:itemId`

All protected.

## 11.6 Notification routes

Base:
```text
/api/notifications
```

Routes:
- `GET /`
- `PATCH /:id/read`
- `PATCH /read-all`
- `DELETE /:id`
- `POST /fcm-token`
- `GET /settings`
- `PUT /settings`
- `POST /broadcast` adminOnly

**Potential route-order trap:** `PATCH /:id/read` before `PATCH /read-all` is okay because `/read-all` does not match `/:id/read`. `DELETE /:id` does not affect later POST/GET settings due method differences.

## 11.7 AdminDish routes

Base depends mount, likely:
```text
/api/admin-dishes
```

Routes:
- `GET /`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `PATCH /:id/toggle-popular`
- `DELETE /`
- `DELETE /:id/hard`

Admin write routes require `protect`, but file does not use `authorize('admin')`. Verify server/mount/global admin protection before assuming safe.

## 11.8 Public AdminDish routes

Base likely:
```text
/api/admin-dishes/public
```

Routes:
- `GET /`
- `GET /featured`
- `GET /with-stats`
- `GET /search`
- `GET /:id`

Route order is correct: specific routes before `/:id`.

## 11.9 Category routes

Base:
```text
/api/categories
```

Routes:
- `GET /` public
- `GET /:id` public
- `POST /` admin/super_admin
- `PUT /:id` admin/super_admin
- `DELETE /:id` admin/super_admin
- `PATCH /:id/icons` admin/super_admin with uploads

## 11.10 Settings routes

Base:
```text
/api/settings
```

Routes:
- `GET /`
- `PUT /`
- `GET /hero-images`
- `POST /hero-images`
- `PUT /hero-images/:id`
- `DELETE /hero-images/:id`
- `PUT /hero-images/reorder`

Potential route-order trap:
- `PUT /hero-images/:id` appears before `PUT /hero-images/reorder`.
- In Express, `/hero-images/reorder` can match `:id = reorder`.
- Verify runtime route behavior before relying on reorder endpoint.

---

# 12. Checkout / Order Creation Flow

## 12.1 Modern checkout flow

Main modern flow:
1. Frontend/mobile sends cart items to `POST /api/checkout/session`.
2. Backend builds cart snapshot.
3. Backend resolves `dishId` as DishOffer first.
4. Backend resolves AdminDish via `dishOffer.adminDishId`.
5. Backend converts `Cook._id` to `User._id`.
6. Backend computes readyAt for cutoff rules.
7. Backend calculates pricing.
8. User confirms session.
9. Backend creates Order with subOrders.

## 12.2 Cook ID conversion

Frontend sends:
```text
item.cookId = Cook._id
```

Checkout converts:
```js
const cook = await Cook.findById(item.cookId)
const cookUserId = cook.userId.toString()
```

Order/subOrder stores:
```js
subOrder.cook = cookUserId
```

## 12.3 Grouping rule

Group cart/order items by:

```text
cook + fulfillmentMode
```

Same cook can have two subOrders:
- one pickup,
- one delivery.

This applies globally:
- cart grouping,
- checkout grouping,
- order display,
- cook orders,
- My Orders.

## 12.4 Prep time / cutoff logic

There are two backend utilities:
- `prepTimeUtils.js` mirrors Flutter using fixed country UTC offsets.
- `timezoneUtils.js` uses IANA timezone IDs and is used by checkout for server-side readyAt.

Do not change prep time logic without verifying which function each endpoint uses.

Cutoff rule known from project memory:
- prepTime must remain numeric minutes,
- cutoff display text can use time strings,
- readyAt should be computed Date,
- avoid putting strings like `"16:00"` into numeric prepTime.

## 12.5 Pricing

Pricing service:
- subtotal is sum of `unitPrice * quantity`,
- automatic discount campaigns,
- coupon campaigns,
- delivery fee based on cook/timing preference,
- VAT is inclusive,
- total does not increase due VAT display.

Delivery fee:
- delivery items only.
- grouped by cook.
- if timingPreference `combined`, charge one highest delivery fee per cook.
- if `separate`, group by ready time and charge per ready-time batch.

VAT:
- country settings from `Settings.vatByCountry`.
- prices are VAT-inclusive.
- `grossTotal = subtotal - discounts + deliveryFee`.
- `netTotal = grossTotal / (1 + rate/100)`.
- `vatAmount = grossTotal - netTotal`.

---

# 13. Cart System

## 13.1 Web cart

Web `CountryContext`:
- country currently locked to `SA`.
- storage key:
```text
cart_${userId}_${countryCode}
cart_guest_${countryCode}
```
- migrates old `cartsByCountry`.
- persists `foodie_cart` for legacy support.
- also has backend sync/merge logic elsewhere in same context/file.

## 13.2 Mobile cart

Mobile `CartProvider`:
- storage key matches web:
```text
cart_${userId}_${countryCode}
cart_guest_${countryCode}
```
- saves legacy `foodie_cart`.
- syncs to backend if logged in.
- sync payload:
  - `offerId`
  - `adminDishId`
  - `cookId`
  - `portionKey`
  - `quantity`
  - `fulfillmentMode`
  - `countryCode`
  - `dishName`
  - `photoUrl`
  - `cookName`
  - `priceAtAdd`
  - `deliveryFee`
  - `prepTime`

## 13.3 Backend cart

Cart item identity:
```text
offerId + portionKey + fulfillmentMode
```

Country-level cart:
```text
one cart per user + countryCode
```

## 13.4 Known cart traps

- Web localStorage can override backend if merge order wrong.
- Mobile fetch may need explicit refresh on cart screen.
- Empty cart sync must be allowed to clear backend.
- Do not drop `fulfillmentMode` from item identity.
- Do not use AdminDish ID as offer ID.

---

# 14. Cook Hub Orders — Working Reference

Cook Hub Orders is the best working reference for cook order data.

## Backend source

```text
GET /api/orders/cook/orders
```

## Web

Web `Orders.js`:
- fetches `/orders/cook/orders`,
- transforms subOrders,
- preserves real `subOrder._id`,
- groups by fulfillment mode and readyAt,
- has action state for selected subOrder,
- still contains sample/fallback data lower in file.

Important:
- Do not confuse fallback/sample data with real API behavior.

## Mobile

Mobile `CookOrdersPage`:
- uses `ApiConfig.cookOrdersEndpoint`,
- token from `AuthProvider`,
- groups by subOrders and keeps real subOrder IDs,
- search scans visible order content,
- active/completed filters use statuses.

## Status/actions

Labels:
- `order_received` → New / Received
- `preparing` → Preparing
- `ready` → Ready
- `out_for_delivery` → Out for Delivery
- `delivered` → Delivered
- `pickedup` → Picked Up
- `cancelled` → Cancelled

Actions:
- `preparing` → Mark as Ready → `ready`
- `ready` + delivery → Mark as Delivered → `delivered`
- `ready` + pickup → Mark as Picked Up → `pickedup`
- cancel available for active statuses → `cancelled`

Updating one subOrder should ideally update local state, not refetch the entire list unless needed.

---

# 15. Cook Hub Overview — Deep Debug History

## 15.1 Confirmed problems that happened

1. Dummy/static values existed.
2. Wrong endpoint/data source for active listings.
3. Wrong cook ID type.
4. 401 due stale/expired token.
5. Fetch loop risk.
6. `subOrders.cook` string/Mixed comparison bug.
7. Completion rate formula wrong.
8. Category graph depended on missing historical category data.
9. Traffic stats stub.

## 15.2 Correct overview endpoint list

- `/api/orders/cook/sales-summary?period=last30`
- `/api/orders/cook/sales-by-category`
- `/api/orders/cook/order-stats`
- `/api/orders/cook/traffic-stats?period=last30`
- `/api/orders/cook/recent-activity?limit=5`
- `/api/orders/cook/performance-stats?period=last30`
- `/api/dish-offers/my?active=true`

## 15.3 Mobile provider current state

Mobile `CookDashboardProvider`:
- receives `AuthProvider`,
- reads live token from AuthProvider,
- uses `_hasLoaded`,
- fetches overview endpoints in parallel.

Important:
- Top comment in provider still says active listings uses `/api/products?cook={cookId}`. This comment is outdated if code below uses `/dish-offers/my?active=true`.
- Do not trust comments over code.

## 15.4 Mobile overview page current state

Overview page:
- fetches when:
```dart
!dashboardProvider.isLoading && !dashboardProvider.hasLoaded
```
- uses post-frame callback.
- calls:
```dart
dashboardProvider.fetchDashboardData(cookId: authProvider.user!.id)
```

## 15.5 Provider wiring trap from main.dart

`main.dart` registers `CookDashboardProvider` with `ChangeNotifierProxyProvider<AuthProvider, CookDashboardProvider>` and update callback calls:

```dart
cookDash!..fetchDashboardData(cookId: auth.user?.id)
```

This can trigger fetches from provider update, not only page build.
This is a possible duplicate-fetch/side-effect risk.
Verify runtime before changing.

## 15.6 Completion rate rule

Wrong:
```text
completed / (completed + cancelled)
```

Correct:
```text
completedSubOrders / totalCookSubOrders
```

Completed:
- `delivered`
- `pickedup`
- maybe `completed` only if used consistently.

Not completed:
- `order_received`
- `preparing`
- `ready`
- `out_for_delivery`
- `cancelled`

## 15.7 Category graph rule

Preferred:
1. `item.productSnapshot.category`
2. fallback: `item.dishOffer` → DishOffer → AdminDish → Category
3. fallback: `Uncategorized`

Historical old orders may stay uncategorized.

## 15.8 Traffic section

Traffic stats are not real unless tracking events/collection exist.
Treat as stub / NOT VERIFIED.

---

# 16. Ratings and Reviews

## 16.1 Backend current direction

`ratingController` accepts:
```js
dishRatings
overallReview
cookReviews
```

`cookReviews` shape:
```js
[{ cookUserId, overallReview }]
```

Backend groups dish ratings by subOrder.

## 16.2 Critical rating storage inconsistency

Model says:
```js
OrderRating.cook ref User
order unique
```

Controller seems to:
- convert User._id → Cook._id,
- store/search `cook: cookId`.

This conflicts with schema/index.
Before any rating work:
1. inspect current controller,
2. inspect DB indexes,
3. test rating submission,
4. verify whether multiple cook ratings per order can actually be stored,
5. fix schema/index only if proven needed.

## 16.3 Web RatingDialog

Current `RatingDialog.js`:
- flattened dishRatings,
- minimal `cookReviews` state,
- groups UI by cook with `useMemo`,
- sends per-cook reviews.

`RatingDialog_OLD.js` also exists.
Repo hygiene:
- do not commit old duplicate files unless intentionally needed.
- new IDE must avoid editing wrong one.

## 16.4 Mobile review flow current truth

There is **no confirmed `multi_cook_review_screen.dart`** in current uploaded files.

Current mobile flow:
1. `CookOrderSelectionScreen`
2. resolves `Cook._id → User._id` by calling `/cooks/:id`
3. filters completed/pickedup/delivered orders by matching `subOrder.cookId` to `cookUserId`
4. opens `ReviewSubmissionScreen`
5. `ReviewSubmissionScreen` loads `/orders/:id`
6. finds matching subOrder using `cookUserId`
7. posts `/ratings/order/:orderId`
8. sends:
```json
{
  "dishRatings": [...],
  "overallReview": "...",
  "cookReviews": [
    {
      "cookUserId": "...",
      "overallReview": "..."
    }
  ]
}
```

This is single-cook-at-a-time mobile review, not all-cooks-in-one-screen.

## 16.5 Desired future parity

If web supports all cooks in one dialog, mobile may need to match later.
But do not claim mobile already has this unless implemented and visible.

---

# 17. Public Menu / AdminDish / DishOffer Flow

## 17.1 Public AdminDish endpoints

Public consumer endpoints:
- `/api/admin-dishes/public`
- `/api/admin-dishes/public/featured`
- `/api/admin-dishes/public/with-stats`
- `/api/admin-dishes/public/search`
- `/api/admin-dishes/public/:id`

`/with-stats`:
- AdminDish list,
- DishOffer aggregation,
- stock > 0,
- country filter,
- active offers,
- joins Cook data,
- computes stats such as minPrice/offer count.

## 17.2 Featured dishes

Featured:
- AdminDish `isPopular: true`,
- must have active DishOffer with stock and matching country.

## 17.3 DishOffer endpoints

Offer sheet / dish profile uses:
- `by-admin-dish`
- `by-admin-dish-lite`
- `by-cook`

But route-order trap exists in `dishOffer.routes.js`.

---

# 18. Notifications, FCM, and Message Center

## 18.1 Backend notifications

Notification model supports:
- type,
- entity type,
- entity ID,
- deepLink,
- role,
- country,
- read state.

Notification controller supports:
- list,
- mark read,
- mark all read,
- delete,
- FCM token update,
- settings,
- admin broadcast.

Utility `notifications.js`:
- creates in-app notification,
- checks user FCM token and preferences,
- sends push if available,
- broadcast can also create Message records if `senderId` provided.

## 18.2 FCM service

`fcmService.js`:
- uses Firebase Admin SDK.
- initializes from:
```text
../config/firebase-service-account.json
```
- no ADC fallback in fcmService itself.
- If service account file missing, FCM not initialized.

Therefore production push requires verifying:
- service account file availability,
- Secret Manager/env strategy,
- Cloud Run deployed file policy,
- Firebase Admin config.

## 18.3 Mobile NotificationProvider trap

Mobile `NotificationProvider` reads token key:
```text
auth_token
```

But `AuthProvider` writes:
```text
authToken
```

This mismatch likely breaks authenticated notification requests unless another write exists.

Do not debug notifications without checking token key first.

## 18.4 Web NotificationContext

`NotificationContext.js` in web is only a snackbar/toast provider.
It is not backend notification list/push system.

## 18.5 Message Center

Web `MessageCenter.js` contains large sample/local message arrays and some real `api` imports/contact state.

Treat Message Center as:
```text
PARTIAL / NOT VERIFIED
```

Do not assume real-time messaging fully works.

Socket.IO is initialized in backend server, but full message flow must be verified from message routes/controllers/models if working on messaging.

---

# 19. Admin Panel / Admin Logic

Admin has:
- dashboard stats,
- users,
- cooks,
- categories,
- admin dishes,
- settings,
- hero images,
- VAT/payment settings,
- orders oversight.

Admin dashboard:
- counts active cooks from Cook collection.
- uses Order aggregates.
- top cooks logic may use User lookup against orders.

Do not confuse admin dashboard logic with Cook Hub Overview.

AdminDish controller:
- uses storageService for dish images.

Category controller:
- uses storageService for web/mobile icons.
- returns legacy `icon` mapped from `icons.web` for backward compatibility.

Settings controller:
- handles VAT/settings,
- hero image upload using cloud storage.

---

# 20. Pricing, VAT, Discounts, Coupons

Pricing service:
- `calculatePricing(cartSnapshot, appliedCouponCode, userId, countryCode)`
- gets country context.
- reads Settings.
- computes subtotal.
- applies automatic discount campaigns.
- applies coupon if provided.
- computes delivery fee.
- computes VAT-inclusive breakdown.

## VAT-inclusive rule

Total should not increase because VAT is displayed.
VAT is extracted from gross total.

```js
grossTotal = subtotal - autoDiscount - couponDiscount + deliveryFee
netTotal = grossTotal / (1 + vatRate/100)
vatAmount = grossTotal - netTotal
total = grossTotal
```

## Campaign scope

Campaign scope can apply to:
- all,
- cook IDs,
- dish IDs.

Category campaign scope note exists but may not be fully implemented.

---

# 21. Prep Time Logic

DishOffer has `prepReadyConfig`:
- fixed,
- range,
- cutoff.

Backend:
- `prepTimeUtils.js` mirrors Flutter with simple country UTC offsets.
- `timezoneUtils.js` uses IANA timezone IDs for checkout readyAt.

Mobile also has prep time utilities.

Critical rules:
- numeric `prepTime` must remain minutes.
- cutoff time strings must not be saved into numeric `prepTime`.
- `readyAt` stores Date.
- `prepTimeText` stores display string.

---

# 22. UI / Design Rules

## Global tokens

- primary orange: `#FF7A00`
- rating star yellow: `#FCD535`
- dark text: `#40403F`
- fonts commonly used:
  - Inter
  - Noto Serif
  - Plus Jakarta Sans

## Mobile home

User finalized a new mobile home page design as the visual source of truth for mobile home UI.

## Mobile category cards

- normal card: 65 × 91 px
- Roasted / first category double width: 130 × 91 px
- label color controlled by admin setting:
  - `dark`
  - `light`

## Mobile bottom nav

- assets under `assets/navigation/`
- active variants suffixed `A`
- Cook Hub center icon special size/position.

## Out-of-stock note

Earlier user requested: if portion disabled because out of stock, keep disabled state but remove red “Out of stock” note.

---

# 23. Parity Framework

Use these statuses:
- MATCH
- PARTIAL
- MISSING
- NOT VERIFIED

Rules:
- Feature exists in backend but not visible in UI → NOT IMPLEMENTED for user-facing parity.
- Mobile differs from web → mobile wrong unless explicitly overridden.
- Runtime behavior required for MATCH.

## Current broad parity snapshot

This is a starting point, not final runtime proof.

| Feature | Web | Mobile | Admin | Status |
|---|---|---|---|---|
| Home | implemented | redesigned/active | N/A | PARTIAL |
| Menu | implemented | implemented/iterated | categories/admin dishes | PARTIAL |
| Categories | implemented | implemented/custom mobile | CRUD + icons | PARTIAL |
| Dish Profile | implemented | heavily iterated | N/A | PARTIAL |
| Cook Offer Sheet | implemented | iterated | N/A | PARTIAL |
| Cart | backend/local hybrid | backend/local sync | N/A | PARTIAL |
| Checkout | implemented | implemented | settings/VAT | PARTIAL |
| Foodie Orders | implemented | implemented | oversight | PARTIAL |
| Cook Hub Orders | implemented | implemented | oversight | PARTIAL / near MATCH if runtime passes |
| Cook Hub Overview | older web/dashboard differs | active focus | N/A | PARTIAL |
| Reviews/Ratings | current RatingDialog | single-cook review flow | N/A | PARTIAL |
| Favorites | verify | verify | N/A | NOT VERIFIED |
| Notifications | backend + UI snackbar context | token-key trap | broadcast | PARTIAL |
| Message Center | sample/partial real | verify | possible broadcast | PARTIAL / NOT VERIFIED |
| Admin Panel | N/A | N/A | implemented | MATCH for admin-only, verify target |

---

# 24. Known System Traps

1. `role === "cook"` is wrong.
2. `User._id` vs `Cook._id` confusion.
3. `subOrders.cook` is Mixed/string and stores User._id.
4. `DishOffer.cook` stores Cook._id.
5. OrderRating model/controller mismatch for `cook`.
6. OrderRating unique `order` index may conflict with multiple cooks per order.
7. Old orders missing `dishOffer`.
8. Old orders missing `productSnapshot.category`.
9. Historical orders may reference deleted cooks/offers.
10. Stale token can make one page fail while other pages work.
11. Mobile AuthProvider uses `authToken`; NotificationProvider uses `auth_token`.
12. DishOffer routes may be swallowed by `/:id`.
13. Settings hero reorder route may be swallowed by `:id`.
14. Web Orders has sample fallback data; do not treat as live.
15. Web MessageCenter has sample data.
16. Traffic stats are stub unless proven otherwise.
17. Local `/uploads` not persistent on Cloud Run.
18. Flutter Web image CORS requires proxy for GCS/Firebase URLs.
19. Debug scripts/generated docs can be accidentally committed.
20. Comments may be outdated; code/runtime wins.

---

# 25. Debugging Playbook

## 25.1 If everything returns 401

Check:
1. token exists,
2. correct key,
3. Authorization header,
4. token expiry,
5. Cloud Run logs,
6. `req.user`,
7. `authorize('cook')`.

Do not debug business logic until 401 fixed.

## 25.2 If cook data shows zero

Check:
1. actual logged-in user ID,
2. user isCook/status,
3. Cook profile exists,
4. whether endpoint expects User._id or Cook._id,
5. whether `subOrders.cook` matches logged-in User._id,
6. date range,
7. DB/environment.

## 25.3 If graph/category empty

Check:
1. whether orders exist,
2. whether items have `productSnapshot.category`,
3. whether `dishOffer` exists,
4. whether DishOffer still points to AdminDish,
5. whether AdminDish has Category,
6. whether old data is simply missing fields.

## 25.4 If mobile notification fails

Check:
1. token key mismatch (`authToken` vs `auth_token`),
2. `/notifications` network status,
3. `/notifications/fcm-token`,
4. FCM setup,
5. Firebase service account on backend,
6. mobile Firebase Messaging package/handlers.

## 25.5 If cart sync wrong

Check:
1. user ID,
2. country code,
3. local key,
4. backend cart,
5. item identity: offerId + portionKey + fulfillmentMode,
6. whether empty sync clears backend.

---

# 26. Git / Commit Hygiene

Before every commit:

```bash
git status
```

Avoid:
```bash
git add .
```

Prefer scoped add.

Watch for:
- `.firebase/`
- `server/check_*.js`
- `server/diagnose_*.js`
- `server/find_*.js`
- `server/test_*.js`
- `RatingDialog_OLD.js`
- generated docs unless intended,
- temporary package artifacts like `server/react-scripts`, `server/marketplace-web@1.0.0`.

If accidental files are untracked, either remove them or add to `.gitignore`.

---

# 27. Recommended Work Style for Future AI IDE

## For debugging uncertain issues

Use trace-only brief:

```text
Do not implement yet.
Trace the working flow and the broken flow.
Identify the exact mismatch with file/function names.
Do not guess root cause.
Return findings only.
```

## For proven root cause

Use targeted fix brief:

```text
Fix only the confirmed issue.
Do not refactor.
Do not touch unrelated files.
Run syntax/analyze check.
List exact files changed.
Provide runtime verification.
```

## For Qoder/basic model/new IDE

Keep instructions short and strict:
- problem,
- observed behavior,
- working reference,
- exact forbidden changes,
- expected output.

---

# 28. User Preferences / Communication Style

The user prefers:
- concise direct answers,
- English-only unless Arabic requested,
- copy-ready briefs,
- no defensive explanation,
- no guessing,
- “problem-only” summaries when root cause is uncertain,
- “Sams style” short briefs for Qoder,
- “My style” direct rephrasing as if user is speaking.

Avoid:
- long generic advice,
- pretending certainty,
- saying done without proof,
- giving implementation details when user asks for problem-only.

---

# 29. Minimal First Checklist for New IDE

Before doing real work, the new IDE should confirm:

```bash
git status
git branch --show-current
git log --oneline -5
```

Then inspect:
- `server/server.js`
- `server/middleware/auth.js`
- relevant route/controller/model
- corresponding web/mobile reference screen/provider.

For backend:
```bash
cd server
node -c controllers/<file>.js
```

For web:
```bash
cd client/web
npm run build
```

For mobile:
```bash
cd mobile/foodie
flutter analyze
```

Only run commands appropriate to task scope.

---

# 30. Final Operating Principle

Do not win by guessing.

Win by:

```text
inspect → compare → prove → fix minimally → verify runtime → commit safepoint
```

This project is complex because multiple layers are live and historical data is dirty. The safest path is disciplined, scoped, evidence-based work.
