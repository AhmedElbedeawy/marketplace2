# ElTekkeya - Master Technical Project Brief

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Purpose:** Long-term technical reference and system blueprint

---

## 1. Project Overview

ElTekkeya is a multi-vendor home food marketplace platform that combines an Amazon-style buyer experience with an eBay-style seller management system. The platform enables local home cooks to sell their dishes while customers can browse, order, and track their meals through a unified ecosystem.

### Core Platform Capabilities

- **Unified Account System:** Single account supports both buying (Foodie mode) and selling (Cook mode)
- **Multi-Seller Cart:** Automatically groups items by cook and splits orders accordingly
- **Real-Time Order Tracking:** Live status updates from order placement to delivery
- **Bilingual Support:** Complete English and Arabic localization with full RTL layout support
- **Admin-Controlled Campaigns:** Platform-wide marketing campaigns managed through admin panel
- **VAT & Country Context:** Per-country VAT configuration and pricing display
- **Hero Image Management:** Admin-controlled homepage hero images with language variants

---

## 2. Platform Access & Role Model

### Critical Concept: Role-Based, Not Device-Based

ElTekkeya is fundamentally role-based. Users can access both Foodie and Cook capabilities through the same account, with role switching happening within the application.

| Mode | Capabilities |
|------|--------------|
| **Foodie Mode** | Browse dishes, search/filter, manage cart, checkout, view orders, rate/reviews, manage favorites |
| **Cook Mode** | Manage dishes/products, receive orders, update status, view analytics, track earnings |
| **Admin Panel** | Platform administration (separate system) - user/cooks management, campaigns, VAT, hero images |

### Web Application (client/web)

- **Foodie View:** Home, Menu, Categories, Cart, Checkout, Orders, Favorites, Settings
- **Cook View:** Dashboard, Products, Orders, Analytics, Marketing, Invoices, Messages

### Mobile Application (mobile/foodie)

- **Foodie Tab:** Home, Categories, Search, Cart, Orders, Profile
- **Cook Hub Tab:** Products, Orders, Analytics, Earnings, Messages

### Admin Panel (admin)

- **Separate System:** Only for platform administrators
- **No User/Cook Functions:** Does not provide Foodie or Cook capabilities
- **Access:** Separate login, dedicated port in development

### Cross-Platform Consistency Rule

> Any change affecting marketplace behavior (cart logic, checkout, VAT, campaigns, filtering, orders) must be validated across both Web and Mobile applications to maintain functional parity.

---

## 3. Final Project Structure

```
<project-root>/
├── server/                          # Node.js Backend API
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/                 # 24 request handler modules
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── cookController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   ├── cartController.js
│   │   ├── checkoutController.js
│   │   ├── categoryController.js
│   │   ├── adminController.js
│   │   ├── adminDishController.js
│   │   ├── adminDishPublicController.js
│   │   ├── ratingController.js
│   │   ├── favoriteController.js
│   │   ├── notificationController.js
│   │   ├── invoiceController.js
│   │   ├── campaignController.js
│   │   ├── dishOfferController.js
│   │   ├── dashboardController.js
│   │   ├── settingsController.js
│   │   ├── addressController.js
│   │   ├── supportController.js
│   │   └── expertiseController.js
│   ├── middleware/
│   │   └── auth.js                  # JWT verification & role checking
│   ├── models/                      # 21 Mongoose schemas
│   │   ├── User.js
│   │   ├── Cook.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Category.js
│   │   ├── AdminDish.js
│   │   ├── DishOffer.js
│   │   ├── Campaign.js
│   │   ├── Invoice.js
│   │   ├── Notification.js
│   │   ├── NotificationDedupe.js
│   │   ├── CheckoutSession.js
│   │   ├── OrderRating.js
│   │   ├── Address.js
│   │   ├── Settings.js
│   │   ├── Coupon.js
│   │   ├── ExpertiseCategory.js
│   │   ├── CampaignRedemption.js
│   │   ├── AdminActionLog.js
│   │   ├── AuditLog.js
│   │   └── UserContactHistory.js
│   ├── routes/                      # 22 route definitions
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── cooks.routes.js
│   │   ├── products.routes.js
│   │   ├── orders.routes.js
│   │   ├── cart.routes.js
│   │   ├── checkout.routes.js
│   │   ├── categories.routes.js
│   │   ├── admin.routes.js
│   │   ├── adminDish.routes.js
│   │   ├── adminDishPublic.routes.js
│   │   ├── ratings.routes.js
│   │   ├── favorites.routes.js
│   │   ├── notifications.routes.js
│   │   ├── invoices.routes.js
│   │   ├── campaigns.routes.js
│   │   ├── dishOffers.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── settings.routes.js
│   │   ├── addresses.routes.js
│   │   ├── support.routes.js
│   │   └── expertise.routes.js
│   ├── services/                    # Business logic services
│   │   ├── invoiceService.js
│   │   ├── notificationScheduler.js
│   │   └── pricingService.js
│   ├── utils/                       # Utility functions
│   │   ├── countryContext.js
│   │   ├── fcmService.js
│   │   ├── geo.js
│   │   ├── normalization.js
│   │   ├── notifications.js
│   │   ├── prepReadyUtils.js
│   │   └── stockUtils.js
│   ├── uploads/                     # Uploaded files storage
│   ├── server.js                    # Application entry point
│   └── package.json
│
├── client/web/                      # React Web Application
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Sidebar.js
│   │   │   ├── FoodieSidebar.js
│   │   │   ├── FoodieHeader.js
│   │   │   ├── CookDetailsDialog.js
│   │   │   ├── TopRatedCookCard.js
│   │   │   ├── OrderSummary.js
│   │   │   └── LocationGate.js
│   │   ├── contexts/                # React contexts
│   │   │   ├── LanguageContext.js   # isRTL, language, translations
│   │   │   ├── CountryContext.js    # countryCode, currency, cart
│   │   │   └── NotificationContext.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js         # Cook analytics
│   │   │   ├── Orders.js
│   │   │   ├── Products.js
│   │   │   ├── Menu.js
│   │   │   ├── Analytics.js
│   │   │   ├── Marketing.js
│   │   │   ├── MessageCenter.js
│   │   │   ├── CookInvoices.js
│   │   │   ├── Customers.js
│   │   │   ├── Reviews.js
│   │   │   ├── Settings.js
│   │   │   └── foodie/              # Foodie pages
│   │   │       ├── FoodieHome.js
│   │   │       ├── FoodieMenu.js
│   │   │       ├── FoodieOrders.js
│   │   │       ├── FoodieCart.js
│   │   │       ├── FoodieFavorites.js
│   │   │       ├── FoodieSettings.js
│   │   │       ├── DishDetail.js
│   │   │       ├── SinglePageCheckout.js
│   │   │       ├── Checkout.js
│   │   │       ├── FeaturedDishes.js
│   │   │       ├── TopRatedCooks.js
│   │   │       ├── Signup.js
│   │   │       ├── CookRegistration.js
│   │   │       └── ...
│   │   ├── utils/
│   │   │   ├── typography.js        # Typography system with Arabic scaling
│   │   │   ├── api.js
│   │   │   ├── localeFormatter.js
│   │   │   └── i18n-translations.json
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
│
├── mobile/foodie/                   # Flutter Mobile Application
│   ├── lib/
│   │   ├── main.dart               # App entry point
│   │   ├── app.dart                # App configuration
│   │   ├── config/
│   │   │   ├── api_config.dart
│   │   │   ├── theme.dart          # Theme with TypographySystem
│   │   │   └── ...
│   │   ├── models/                 # Data models
│   │   ├── providers/              # 18 state providers
│   │   │   ├── auth_provider.dart
│   │   │   ├── cart_provider.dart
│   │   │   ├── order_provider.dart
│   │   │   ├── cook_provider.dart
│   │   │   ├── category_provider.dart
│   │   │   ├── product_provider.dart
│   │   │   ├── notification_provider.dart
│   │   │   ├── settings_provider.dart
│   │   │   ├── language_provider.dart
│   │   │   ├── theme_provider.dart
│   │   │   └── ...
│   │   ├── routes/
│   │   │   └── app_router.dart
│   │   ├── screens/                 # 17 screen directories
│   │   │   ├── main/               # Home, categories, search
│   │   │   ├── auth/               # Login, registration
│   │   │   ├── menu/               # Dishes, categories
│   │   │   ├── cart/               # Shopping cart
│   │   │   ├── checkout/           # Checkout flow
│   │   │   ├── orders/             # Order management
│   │   │   ├── cook_hub/           # Cook dashboard
│   │   │   ├── dashboard/          # Analytics
│   │   │   └── account/            # Profile, settings
│   │   ├── services/               # API services
│   │   ├── utils/                  # Utilities
│   │   └── widgets/                # Reusable widgets
│   ├── android/
│   ├── ios/
│   ├── assets/                     # Images, icons, categories
│   ├── pubspec.yaml
│   └── pubspec.lock
│
├── admin/                           # React Admin Panel
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── Sidebar.js
│   │   │   └── HeroImagesManager.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── EnhancedDashboard.js
│   │   │   ├── Users.js
│   │   │   ├── Cooks.js
│   │   │   ├── Products.js
│   │   │   ├── Orders.js
│   │   │   ├── Categories.js
│   │   │   ├── Campaigns.js
│   │   │   ├── Issues.js
│   │   │   ├── Settings.js
│   │   │   └── Expertise.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── cook-registration-server.js      # Cook registration webhook
├── cook-registration-mobile-server.js
├── .env.example
├── PROJECT_BRIEF.md
├── PROJECT_SUMMARY.md
├── ADMIN_DASHBOARD_IMPLEMENTATION.md
└── FLUTTER_APPS_SETUP.md
```

---

## 4. Backend Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18.x |
| Framework | Express.js 4.x |
| Database | MongoDB with Mongoose ODM 7.x |
| Authentication | JWT (jsonwebtoken 9.x) |
| Real-time | Socket.IO 4.x |
| Image Processing | Sharp 0.34.x + Multer 1.4.x |
| Validation | Joi 17.x |
| Payments | Stripe 20.x |
| Push Notifications | Firebase Admin SDK 13.x |

### Authentication Flow

1. User authenticates via `/api/auth/login` or `/api/auth/register`
2. Server generates JWT token with 30-day expiration
3. Token includes user ID and role(s)
4. Protected endpoints verify token via `auth` middleware
5. Admin routes require `role: 'admin'`

```javascript
// JWT Payload Structure
{
  userId: "user_id",
  role: "user" | "cook" | "admin",
  cookStatus: "none" | "pending" | "active" | "suspended" // for cooks
}
```

#### Cook Status Lifecycle

Cook status transitions through the following states:

```
none → pending → active → suspended → rejected
```

| Status | Meaning |
|--------|---------|
| `none` | User has not applied to become a cook |
| `pending` | Application submitted, awaiting admin approval |
| `active` | Approved cook, can receive orders and appear in marketplace |
| `suspended` | Temporarily disabled, cannot receive orders |
| `rejected` | Application denied by admin |

**Only cooks with status `active` are allowed to receive orders and appear in the marketplace.**

### Backend as Single Source of Business Logic

All core business logic must remain in the backend API. Frontend applications (Web and Mobile) consume API responses and must not duplicate or reimplement these rules locally:

- **Pricing & VAT Calculation:** Calculated server-side, returned in API responses
- **Cart Splitting:** Logic handled in cartController.js and checkoutController.js
- **Order Creation:** Sub-orders generated by the backend
- **Campaign Application:** Promotions applied during checkout API call

This ensures:
- Consistent behavior across all clients
- Security (business rules cannot be bypassed)
- Single source of truth for pricing and calculations
- Easier maintenance and updates to business rules

### Multi-Seller Cart Logic

The cart system automatically groups items by cook:

```javascript
// Cart item structure
{
  offerId: "offer_id",
  dishId: "admin_dish_id",
  kitchenId: "cook_id",
  kitchenName: "Cook Name",
  name: "Dish Name",
  price: 100,
  quantity: 2,
  photoUrl: "url",
  prepTime: 30,
  countryCode: "SA"
}
```

**Checkout behavior:**
- Creates parent `Order` document
- Creates sub-order per unique cook
- Each sub-order has independent status tracking
- Total calculated from all sub-orders

### Order Status Flow

```
Pending → Received → Preparing → Ready → Picked Up → Delivered
    ↓
 Cancelled
```

### File Upload Flow

1. Client uploads image via multipart/form-data
2. Multer processes upload
3. Sharp optimizes/resizes image
4. File saved to `server/uploads/`
5. Static URL returned: `STATIC_BASE_URL/uploads/filename`

### VAT & Country Context

- Per-country VAT rates configured in Settings model
- Country context determined by user's location or selection
- VAT calculated during checkout based on country
- Prices displayed with VAT inclusive

### Notification System

- **Push Notifications:** FCM for mobile devices
- **In-App Notifications:** Stored in Notification model
- **Deduplication:** NotificationDedupe model prevents spam
- **Campaign Notifications:** Scheduled via notificationScheduler.js

---

## 5. Frontend Applications

### Web Application (client/web)

| Aspect | Technology |
|--------|------------|
| Framework | React 18.2 |
| UI Library | Material-UI 5.14 |
| State Management | Redux + Redux Thunk |
| Routing | React Router DOM 6.15 |
| HTTP Client | Axios 1.13 |
| Charts | Recharts 3.3 |

**Key Pages:**

| Page | Path | Purpose |
|------|------|---------|
| FoodieHome | `/` `/foodie/home` | Homepage with featured dishes/cooks |
| FoodieMenu | `/foodie/menu` | Browse dishes by category/kitchen |
| DishDetail | `/foodie/offer/:offerId` | View dish details |
| Cart | `/foodie/cart` | Shopping cart |
| Checkout | `/foodie/checkout` | Single page checkout |
| Orders | `/foodie/orders` | Order history |
| Favorites | `/foodie/favorites` | Saved dishes/cooks |
| Settings | `/foodie/settings` | User settings |
| Dashboard | `/cook-dashboard` | Cook analytics |
| Menu | `/menu` | Cook product management |
| Orders | `/orders` | Cook order management |
| Products | `/products` | Product inventory |
| Analytics | `/analytics` | Sales charts |
| Marketing | `/marketing` | Campaigns |
| Invoices | `/invoices` | Financial records |

### Mobile Application (mobile/foodie)

| Aspect | Technology |
|--------|------------|
| Framework | Flutter 3.16.x |
| State Management | Provider 6.0 |
| Localization | flutter_localizations + intl 0.20 |
| HTTP | http 1.1 |
| Maps | google_maps_flutter 2.5 |
| Storage | shared_preferences 2.2 |
| Real-time | socket_io_client 2.0 |
| Image Picking | image_picker 1.0 |

**Key Screen Categories:**

| Category | Screens |
|----------|---------|
| Main | HomeScreen, CategoriesScreen, SearchScreen |
| Auth | LoginScreen, RegisterScreen |
| Menu | DishListScreen, DishDetailScreen |
| Cart | CartScreen, AddonsScreen |
| Checkout | AddressScreen, PaymentScreen, ConfirmationScreen |
| Orders | OrderListScreen, OrderDetailScreen, TrackingScreen |
| Cook Hub | ProductsScreen, CookOrdersScreen, AnalyticsScreen, EarningsScreen |
| Account | ProfileScreen, SettingsScreen, AddressesScreen |

**Providers (18 total):**

| Provider | Purpose |
|----------|---------|
| AuthProvider | Authentication state management |
| LocationProvider | GPS and location services |
| CategoryProvider | Categories data |
| ProductProvider | Products and offers |
| CartProvider | Shopping cart operations |
| OrderProvider | Order management |
| FavoriteProvider | Favorites management |
| CookProvider | Cook profile and status |
| NotificationProvider | Push notifications |
| SettingsProvider | App settings |
| MapProvider | Map services |
| ChatProvider | Messaging |
| CampaignProvider | Promotions |
| FilterProvider | Product filtering |
| LanguageProvider | Localization (RTL/LTR) |
| ThemeProvider | Dark/light mode |
| CookingModeProvider | Cook mode toggle |
| RatingProvider | Reviews and ratings |

#### Mobile Role Modes Summary

The mobile app supports both Foodie and Cook roles within the same application. Users switch between modes via the `CookingModeProvider`.

| Area | Foodie Mode | Cook Mode | Shared |
|------|-------------|-----------|--------|
| Browsing & Menu | Yes | No | — |
| Cart & Checkout | Yes | No | — |
| Orders | Yes (view/track) | Yes (manage/update) | Shared order data |
| Products/Dishes | No | Yes (create/manage) | — |
| Analytics/Earnings | No | Yes | — |
| Profile & Settings | Yes | Yes | Shared account data |

> **Note:** Marketplace-related behaviors (cart, checkout, VAT, campaigns) must remain consistent with the Web application as per the Cross-Platform Consistency Rule.

### Admin Panel (admin)

| Aspect | Technology |
|--------|------------|
| Framework | React 18.2 |
| UI Library | Material-UI 5.14 |
| State Management | Redux + Redux Thunk |
| Routing | React Router DOM 6.15 |

**Admin Pages:**

| Page | Purpose |
|------|---------|
| Login | Admin authentication |
| Dashboard | Basic platform statistics |
| EnhancedDashboard | Comprehensive analytics |
| Users | User management |
| Cooks | Cook verification and management |
| Products | Product moderation |
| Orders | Order oversight |
| Categories | Category management |
| Campaigns | Marketing campaign management |
| Issues | Customer issue resolution |
| Settings | Platform configuration |
| Expertise | Expertise category management |

#### Admin-Controlled Settings Inventory

The following platform settings affect runtime behavior and can be modified by admins:

| Setting | System Behavior Impact |
|---------|------------------------|
| **Stripe Card Payment Toggle** | When disabled, checkout does not create Stripe payment intents. Falls back to alternative payment method configured. |
| **VAT Configuration per Country** | Affects pricing calculations and checkout totals. Each country has independent VAT rate and enabled/disabled flag. |
| **Campaign Activation** | Active campaigns apply promotional pricing, discounts, and trigger notification workflows. |
| **Hero Image Management** | Controls homepage hero images shown on entry. Language-specific variants determine which image displays per locale. |
| **Cook Approval & Status** | Only `active` cooks can receive orders and appear in marketplace. Status changes (pending → active) enable marketplace visibility. |
| **User Suspension** | Suspended users cannot authenticate or access platform features. Login requests rejected with account disabled message. |

---

## 6. Environment Configuration

### Environment Variables Structure

#### Backend (server/.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development
UPLOAD_DIR=./uploads

# Database Configuration
MONGO_URI=mongodb://localhost:27017/marketplace

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=30d

# Client URLs (CORS)
CLIENT_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# Stripe Configuration (Payments to platform only)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...

# Google Maps
GOOGLE_MAPS_API_KEY=your_maps_api_key

# Static File Base URL
STATIC_BASE_URL=http://localhost:5000
```

#### Web App (client/web/.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
REACT_APP_GOOGLE_MAPS_API_KEY=your_maps_api_key
REACT_APP_STATIC_BASE_URL=http://localhost:5000
```

#### Admin Panel (admin/.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
```

#### Mobile App (mobile/foodie/lib/config/api_config.dart)

```dart
const String API_BASE_URL = 'http://localhost:5000';
const String STATIC_BASE_URL = 'http://localhost:5000';
const String STRIPE_PUBLISHABLE_KEY = 'pk_test_your_key';
const String GOOGLE_MAPS_API_KEY = 'your_maps_key';
```

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| NODE_ENV | development | production |
| MongoDB | localhost | Atlas cluster |
| Server | nodemon auto-reload | PM2 process manager |
| Frontend | react-scripts start | npm run build |
| CORS | All origins allowed | Specific origins |
| Logging | Console + file | Structured logging |

---

## 7. External Services Status

### Service Configuration

| Service | Status | Purpose | Integration Point |
|---------|--------|---------|-------------------|
| **Stripe** | ✅ Implemented | Payment processing | Backend checkoutController.js |
| **Stripe Connect** | ❌ NOT Implemented | Cook payouts | Manual/off-platform |
| **Firebase Cloud Messaging** | ✅ Implemented | Push notifications | Backend utils/fcmService.js |
| **Google Maps** | ✅ Implemented | Location services | Mobile app + Web |
| **Google Sign-In** | ✅ Configured | Social auth | Mobile app only |
| **Facebook Auth** | ✅ Configured | Social auth | Mobile app only |
| **Socket.IO** | ✅ Implemented | Real-time updates | Backend server.js |

### Important Payment Clarification

> **Payments are processed through Stripe to the platform account only.** Stripe Connect is NOT implemented. Cook payouts are handled manually/off-platform through the invoicing system.

---

## 8. Version Lock

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 18.19.x | LTS version required |
| React | 18.2.0 | |
| React DOM | 18.2.0 | |
| Flutter | 3.16.x | Stable channel |
| MongoDB | 6.x+ | |
| Express | 4.18.x | |
| Mongoose | 7.5.x | |
| Material-UI | 5.14.x | |
| Redux | 4.2.x | |
| Stripe | 20.2.x | |

---

## 9. Deployment Overview

### Development Setup

| Component | Command | URL |
|-----------|---------|-----|
| Backend | `cd server && npm run dev` | http://localhost:5000 |
| Web App | `cd client/web && npm start` | http://localhost:3000 |
| Admin Panel | `cd admin && npm start` | http://localhost:3001 |
| Mobile | `cd mobile/foodie && flutter run` | Device/Emulator |

### Production Setup Recommendations

**Backend:**
```bash
cd server
npm install --production
pm2 start server.js --name marketplace-api
# Set NODE_ENV=production
```

**Frontend (Web):**
```bash
cd client/web
npm run build
serve -s build -l 3000
```

**Frontend (Admin):**
```bash
cd admin
npm run build
serve -s build -l 3001
```

**Recommended Stack:**
- Reverse Proxy: Nginx
- Process Manager: PM2
- Database: MongoDB Atlas
- CDN: Cloudflare (for static assets)

### Domain Structure (Example)

| Service | Domain |
|---------|--------|
| API | api.eltekkeya.com |
| Web App | web.eltekkeya.com |
| Admin | admin.eltekkeya.com |
| Static Assets | cdn.eltekkeya.com |

---

## 10. Data & System Initialization

### Seed Scripts

| Script | Purpose |
|--------|---------|
| `seedDemoData.js` | Create demo users, cooks, products |
| `seedTestAccounts.js` | Create test accounts |
| `createDemoInvoices.js` | Generate sample invoices |
| `createSecondDemoCook.js` | Additional demo cook |

### Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| User (Foodie) | user@example.com | password123 |
| Cook | cook@example.com | password123 |
| Admin | admin@example.com | admin123 |

**Note:** Actual test accounts created by seed scripts. Run scripts to initialize.

### First Admin Creation

Admins are created directly in database or via seed script. No self-registration for admin accounts.

### Migration Scripts

| Script | Purpose |
|--------|---------|
| `migrateCategories.js` | Category data migration |
| `migrateExpertise.js` | Expertise categories migration |
| `migrateContactHistory.js` | Contact history migration |

### Required Initial Settings

1. **Platform Settings:** VAT rates per country, delivery fees, platform fees
2. **Categories:** Initialize product categories
3. **Expertise Categories:** Initialize cook expertise options
4. **Hero Images:** Upload default homepage images (English/Arabic variants)

---

## 11. Local Setup Run Order

### Step 1: Start Database
```bash
# Ensure MongoDB is running locally
mongod --dbpath /path/to/data
# Or use MongoDB Atlas connection string
```

### Step 2: Start Backend
```bash
cd server
npm install
npm run dev  # Runs on http://localhost:5000
```

### Step 3: Start Web App
```bash
cd client/web
npm install
npm start  # Runs on http://localhost:3000
```

### Step 4: Start Admin Panel
```bash
cd admin
npm install
npm start  # Runs on http://localhost:3001
```

### Step 5: Run Mobile App
```bash
cd mobile/foodie
flutter pub get
flutter run  # On connected device/emulator
```

### Verification Order
1. Backend running → http://localhost:5000/api/health
2. Web app loading → http://localhost:3000
3. Admin panel loading → http://localhost:3001
4. Mobile app connecting to localhost API

---

## 12. System Verification Checklist

### Authentication Flow
- [ ] User registration creates account
- [ ] Login returns JWT token
- [ ] Token stored and sent with requests
- [ ] Protected endpoints reject invalid tokens
- [ ] Admin routes require admin role

### Cook Flow
- [ ] User can apply to become cook
- [ ] Admin can approve/verify cooks
- [ ] Cook can add products/dishes
- [ ] Cook can manage orders
- [ ] Cook receives order notifications

### Foodie Flow
- [ ] Browse dishes by category
- [ ] Search functionality works
- [ ] Add items to cart
- [ ] Multi-seller cart groups by cook
- [ ] Checkout processes payment
- [ ] Order created with sub-orders
- [ ] Can track order status
- [ ] Can rate/review completed orders

### Multi-Seller Cart
- [ ] Items from multiple cooks in one cart
- [ ] Cart displays grouped items
- [ ] Checkout creates sub-orders per cook
- [ ] Payment splits correctly

### Orders
- [ ] Parent order created
- [ ] Sub-orders created per cook
- [ ] Status updates propagate correctly
- [ ] Cook receives order notification
- [ ] Customer receives status updates

### Notifications
- [ ] Push notifications arrive
- [ ] In-app notifications display
- [ ] Notification deduplication works

### RTL Layout
- [ ] Arabic language switches to RTL
- [ ] Layout mirrors correctly
- [ ] Icons aligned properly
- [ ] Text alignment correct

### Admin Features
- [ ] User management works
- [ ] Cook verification works
- [ ] Product moderation works
- [ ] Campaign creation works
- [ ] Hero image management works
- [ ] VAT settings apply correctly

---

## 13. Known Sensitive / Complex Areas

### 1. Multi-Seller Cart Logic
- **Complexity:** High
- **Risk:** Incorrect splitting leads to order issues
- **Files:** cartController.js, checkoutController.js, Order model
- **Care Points:** Always test with multiple cooks, verify sub-order creation

### 2. VAT & Country Switching
- **Complexity:** Medium
- **Risk:** Wrong VAT calculation, pricing display issues
- **Files:** pricingService.js, Settings model, CountryContext
- **Care Points:** Test with different countries, verify VAT display

### 3. Campaign System
- **Complexity:** Medium
- **Risk:** Incorrect promotions, notification spam
- **Files:** campaignController.js, notificationScheduler.js
- **Care Points:** Test campaign scheduling, verify redemption logic

### 4. Hero Image Management
- **Complexity:** Low
- **Risk:** Wrong images shown, language mismatch
- **Files:** admin pages, FoodieHome.js
- **Care Points:** Upload both English/Arabic variants

### 5. Notification Scheduler
- **Complexity:** High
- **Risk:** Missed notifications, duplicate alerts
- **Files:** notificationScheduler.js, NotificationDedupe model
- **Care Points:** Test scheduling, verify deduplication

### 6. Cross-Platform Consistency
- **Complexity:** High
- **Risk:** Different behavior between Web and Mobile
- **Files:** All shared logic files
- **Care Points:** Test new features on both platforms

---

## 14. Cross-Platform Consistency Rule

> **CRITICAL:** Any change affecting marketplace behavior must be validated across both Web and Mobile applications to maintain functional parity.

### Affected Areas (require dual testing):
- Cart logic and splitting
- Checkout flow
- VAT calculation
- Campaign application
- Search/filter functionality
- Order status tracking
- Rating/review system
- Notification triggers

### Validation Process:
1. Implement feature on Web
2. Test thoroughly on Web
3. Implement on Mobile
4. Test same scenarios on Mobile
5. Verify API responses match expectations
6. Document any intentional differences

---

## 15. Linked Documentation

| Document | Purpose |
|----------|---------|
| PROJECT_BRIEF.md | Original project brief (reference only) |
| PROJECT_SUMMARY.md | High-level system summary |
| ADMIN_DASHBOARD_IMPLEMENTATION.md | Admin panel details |
| FLUTTER_APPS_SETUP.md | Mobile app configuration |
| TYPOGRAPHY_IMPLEMENTATION_GUIDE.md | Typography system documentation |

---

## 16. Development Guidelines

### Code Style
- Use ESLint for JavaScript/React
- Use flutter_lints for Flutter
- Follow existing naming conventions
- Add JSDoc comments for complex functions

### Git Workflow
- Feature branches from main
- Meaningful commit messages
- Pull requests for review
- Squash merge to main

### Testing
- Test scripts in server/ for backend
- Manual testing before push
- Verify on both platforms for frontend changes

### Security
- Never commit real credentials
- Use environment variables
- Validate all inputs
- Sanitize outputs

---

*Document generated for developer handover. Use as primary technical reference for ElTekkeya platform development.*
