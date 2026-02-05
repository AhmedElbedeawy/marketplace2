# ElTekkeya - Technical Project Brief

> Multi-Vendor Home Food Marketplace Platform
> Last Updated: February 2026

---

## 1. Project Overview

ElTekkeya is a multi-vendor home food marketplace combining Amazon-style buyer experience with eBay-style seller management. The platform enables local home cooks to sell their dishes while giving customers access to diverse homemade meal options.

### Core Features

| Feature | Description |
|---------|-------------|
| **Unified Account System** | Single account for both buying (Foodie) and selling (Cook) |
| **Multi-Seller Cart** | Automatic cart splitting by cook; single checkout creates multiple sub-orders |
| **Real-time Order Tracking** | Status updates from order received to delivered |
| **Favorites System** | Save favorite dishes and cooks for quick access |
| **Bilingual Support** | English and Arabic with automatic RTL layout |
| **Photo Validation** | Ensures high-quality product images |
| **Smart Sale Control** | Scheduled sales with admin oversight |
| **Campaign System** | Admin-controlled promotional campaigns |
| **VAT Management** | Per-country VAT configuration |
| **Hero Image Management** | Admin-controlled homepage carousel |

### User Roles

| Role | Permissions |
|------|-------------|
| **Foodie** | Browse, search, order, rate, favorite |
| **Cook** | Manage products, view orders, update status, message customers |
| **Admin** | Full platform control: users, products, orders, campaigns, settings |
| **Super Admin** | Create other admins, platform-wide settings |

---

## 2. Project Structure

```
/Users/AhmedElbedeawy/Desktop/Marketplace Project/
├── server/                    # Node.js Backend API (Port 5005)
│   ├── controllers/           # 24 request handlers
│   ├── models/                # 21 Mongoose schemas
│   ├── routes/                # 22 API route files
│   ├── middleware/            # Authentication & authorization
│   ├── config/                # Database configuration
│   ├── services/              # Business logic services
│   ├── utils/                 # Utility functions
│   ├── uploads/               # Uploaded images (dishes, cooks)
│   └── server.js              # Entry point
│
├── client/web/                # Cook Dashboard (React, Port 3000)
│   ├── src/
│   │   ├── components/        # 14 reusable components
│   │   ├── pages/             # 14 pages + foodie/ subfolder
│   │   │   └── foodie/        # 28 foodie-specific pages
│   │   ├── contexts/          # React contexts
│   │   ├── utils/             # Utilities
│   │   ├── App.js
│   │   └── i18n-translations.json
│   └── package.json
│
├── mobile/foodie/             # Flutter Mobile App
│   ├── lib/
│   │   ├── config/            # Theme & API config
│   │   ├── models/            # 7 data models
│   │   ├── providers/         # 18 state providers
│   │   ├── routes/            # Navigation routes
│   │   ├── screens/           # 17 screen directories
│   │   │   ├── main/          # Home, Categories
│   │   │   ├── auth/          # Login, Register
│   │   │   ├── menu/          # Dishes, Categories
│   │   │   ├── cart/          # Shopping cart
│   │   │   ├── checkout/      # Checkout flow
│   │   │   ├── orders/        # Order management
│   │   │   ├── cook_hub/      # Cook seller dashboard
│   │   │   └── ...
│   │   ├── services/          # API services
│   │   ├── utils/             # Utilities
│   │   └── widgets/           # 7 reusable widgets
│   ├── android/               # Android configuration
│   ├── ios/                   # iOS configuration
│   └── pubspec.yaml
│
├── admin/                     # Admin Panel (React, Port 3001)
│   ├── src/
│   │   ├── components/        # 7 UI components
│   │   ├── pages/             # 16 admin pages
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── .env.example               # Environment template
├── PROJECT_BRIEF.md           # Previous brief
├── README.md                  # Project documentation
└── start-dev.sh               # Development startup script
```

---

## 3. Backend Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.x |
| Database | MongoDB with Mongoose 7.x |
| Authentication | JWT (jsonwebtoken) |
| Real-time | Socket.IO 4.x |
| Validation | Joi |
| Image Processing | Sharp + Multer |
| HTTP Client | Axios |
| Date Handling | Moment Timezone |

### Directory Breakdown

```
server/
├── config/
│   └── db.js                  # MongoDB connection setup
├── controllers/               # Request handlers
│   ├── authController.js      # Login, register, token management
│   ├── userController.js      # User profile management
│   ├── cookController.js      # Cook registration & profile
│   ├── productController.js   # Product CRUD
│   ├── orderController.js     # Order lifecycle management
│   ├── cartController.js      # Cart operations
│   ├── checkoutController.js  # Checkout flow & payment
│   ├── categoryController.js  # Category management
│   ├── adminController.js     # Admin operations
│   ├── adminDishController.js # Admin dish management
│   ├── ratingController.js    # Ratings & reviews
│   ├── favoriteController.js  # Favorites management
│   ├── notificationController.js  # Push notifications
│   ├── invoiceController.js   # Invoice generation
│   ├── campaignController.js  # Marketing campaigns
│   ├── dishOfferController.js # Dish offers
│   ├── dashboardController.js # Analytics & stats
│   ├── settingsController.js  # Platform settings
│   ├── addressController.js   # Address management
│   ├── supportController.js   # Customer support
│   ├── expertiseController.js # Cook expertise
│   ├── adminDishPublicController.js  # Public dish access
│   └── ...
├── middleware/
│   └── auth.js                # JWT verification & role authorization
├── models/                    # Mongoose schemas
│   ├── User.js                # User accounts with roles
│   ├── Cook.js                # Cook profiles (legacy)
│   ├── Product.js             # Product catalog
│   ├── Order.js               # Orders with sub-orders
│   ├── Category.js            # Categories
│   ├── AdminDish.js           # Admin-managed dishes
│   ├── DishOffer.js           # Special offers
│   ├── Campaign.js            # Marketing campaigns
│   ├── Invoice.js             # Financial invoices
│   ├── Notification.js        # User notifications
│   ├── Address.js             # User addresses
│   ├── OrderRating.js         # Order ratings
│   ├── CheckoutSession.js     # Payment sessions
│   ├── Coupon.js              # Discount coupons
│   ├── Settings.js            # Platform settings
│   ├── AdminActionLog.js      # Admin audit trail
│   └── ...
├── routes/                    # API route definitions
│   ├── auth.routes.js
│   ├── users.routes.js
│   ├── products.routes.js
│   ├── orders.routes.js
│   ├── cart.routes.js
│   ├── checkout.routes.js
│   ├── admin.routes.js
│   ├── campaigns.routes.js
│   └── ... (22 route files)
├── services/
│   ├── invoiceService.js      # Invoice generation logic
│   ├── notificationScheduler.js  # Phase 3 notification triggers
│   └── pricingService.js      # VAT & pricing calculations
├── utils/
│   ├── fcmService.js          # Firebase Cloud Messaging
│   ├── notifications.js       # In-app notification logic
│   ├── countryContext.js      # Country-specific settings
│   ├── geo.js                 # Geolocation utilities
│   ├── prepReadyUtils.js      # Preparation time utilities
│   ├── stockUtils.js          # Stock management
│   └── normalization.js       # Data normalization
├── uploads/
│   ├── dishes/                # Product images
│   ├── cooks/                 # Cook profile photos
│   └── ...                    # Other uploads
└── server.js                  # Express app entry point
```

### Authentication Flow

```
1. User logs in → /api/auth/login
2. Server validates credentials
3. Server issues JWT token (30-day expiration)
4. Client stores token (localStorage/mobile secure storage)
5. Subsequent requests include: Authorization: Bearer <token>
6. Middleware (auth.js) verifies token and attaches user to request
7. Role-based authorization restricts access
```

### JWT Token Structure

```javascript
{
  id: user._id,
  role: 'foodie' | 'cook' | 'admin',
  isCook: boolean,
  role_cook_status: 'none' | 'pending' | 'active' | 'rejected' | 'suspended'
}
```

### Role Authorization

```javascript
// Middleware examples
protect                    // Verify token
authorize('admin')         // Admin only
authorize('cook')          // Cook with approved status
authorize('foodie')        // Regular users
```

### File Upload Handling

```
Upload Flow:
1. Client sends multipart/form-data via Multer
2. Sharp processes image (resize, compress, optimize)
3. File saved to server/uploads/{category}/
4. Static URL returned: http://localhost:5005/uploads/dishes/filename.jpg

Storage Location:
- Dishes: server/uploads/dishes/
- Cooks: server/uploads/cooks/
- Categories: server/uploads/categories/
- Static serving: /uploads route with 1-day cache
```

### Notification System

```
Types:
- FCM Push Notifications (mobile)
- In-App Notifications (database stored)
- Campaign-driven notifications

Trigger Points:
- Order status changes
- New messages
- Promotions
- Rating reminders

Scheduler:
- Phase 3 notification triggers via notificationScheduler.js
- Only runs in production or when ENABLE_NOTIFICATION_SCHEDULER=true
```

### Order Status Lifecycle

```
Parent Order:    pending → confirmed → partially_delivered → completed / cancelled
                                                                 ↑
Sub-Orders:      order_received → preparing → ready → delivered → cancelled
```

### Multi-Seller Cart Logic

```
Cart Structure:
{
  items: [
    { productId, cookId, quantity, price, notes }
  ],
  groupedByCook: {
    "cookId1": [items from cook1],
    "cookId2": [items from cook2]
  }
}

Checkout Process:
1. Cart items grouped by cook
2. Sub-order created for each cook
3. Payment split per sub-order
4. Each sub-order has independent status tracking
```

---

## 4. Frontend Applications

### 4.1 Cook Dashboard (client/web)

**Tech Stack:**
- React 18 with Create React App
- Material-UI (MUI) 5
- Redux + Redux Thunk (state management)
- React Router DOM 6
- Axios (HTTP client)
- Recharts (charts & analytics)
- react-quill (rich text editor)

**Key Pages:**

| Page | Purpose |
|------|---------|
| `Dashboard.js` | Business overview, stats, charts |
| `Orders.js` | Order management, status updates |
| `Products.js` | Product inventory |
| `Menu.js` | Menu configuration |
| `Analytics.js` | Sales & performance charts |
| `Marketing.js` | Campaigns & promotions |
| `MessageCenter.js` | Customer communication |
| `CookInvoices.js` | Financial records |
| `CookOrderDetails.js` | Order detail view |

**Components:**

| Component | Purpose |
|-----------|---------|
| `Header.js` | App header |
| `Sidebar.js` | Navigation sidebar |
| `CreateDishDialog.js` | Product creation modal |
| `CookDetailsDialog.js` | Cook profile display |
| `OrderSummary.js` | Order details widget |
| `FoodieHeader.js` | Foodie-specific header |
| `FoodieSidebar.js` | Foodie sidebar |

**State Management:**
- Redux store with slices for: auth, products, orders, cart, notifications
- Redux Thunk for async API calls

**API Integration:**
- Base URL: `http://localhost:5005/api`
- Auth token passed in headers
- Automatic retry on 401 (token refresh)

---

### 4.2 Admin Panel (admin/)

**Tech Stack:**
- React 18 with Create React App
- Material-UI (MUI) 5
- Redux + Redux Thunk
- React Router DOM 6
- Axios
- Recharts (analytics)
- date-fns, moment-timezone (date handling)

**Key Pages:**

| Page | Purpose |
|------|---------|
| `Login.js` | Admin authentication |
| `Dashboard.js` | Basic statistics |
| `EnhancedDashboard.js` | Comprehensive analytics |
| `Users.js` | User management |
| `Cooks.js` | Cook verification & management |
| `Products.js` | Product moderation |
| `Orders.js` | Order oversight |
| `Categories.js` | Category management |
| `Campaigns.js` | Marketing campaign management |
| `Issues.js` | Customer issue resolution |
| `Settings.js` | Platform configuration |

**Platform Control Capabilities:**

| Feature | Description |
|---------|-------------|
| **Hero Images** | Homepage carousel management |
| **VAT Settings** | Per-country VAT configuration |
| **Campaigns** | Create/manage promotional campaigns |
| **User Management** | View, edit, suspend users |
| **Cook Verification** | Approve/reject cook applications |
| **Product Moderation** | Review/approve products |
| **Order Oversight** | View all orders, intervene if needed |
| **Expertise Categories** | Manage cook expertise categories |

---

### 4.3 Mobile App (mobile/foodie)

**Tech Stack:**
- Flutter 3.x (Dart)
- Provider (state management)
- http package (API calls)
- Google Maps Flutter
- socket_io_client (real-time)
- shared_preferences (local storage)
- intl + flutter_localizations (i18n)
- image_picker (camera/gallery)
- Google Sign-In, Facebook Auth

**Folder Structure:**

```
lib/
├── main.dart                  # App entry point
├── app.dart                   # App configuration
├── config/
│   ├── api_config.dart        # API endpoints & URLs
│   └── theme.dart             # Light/dark themes
├── models/
│   ├── user_model.dart
│   ├── product_model.dart
│   ├── order_model.dart
│   └── ...
├── providers/                 # 18 state providers
│   ├── auth_provider.dart
│   ├── cart_provider.dart
│   ├── order_provider.dart
│   ├── category_provider.dart
│   ├── product_provider.dart
│   ├── notification_provider.dart
│   ├── language_provider.dart
│   ├── app_mode_provider.dart  # Toggle Foodie/Cook Hub
│   └── ...
├── routes/
│   └── app_routes.dart         # Navigation setup
├── screens/
│   ├── main/
│   │   ├── home_screen.dart
│   │   ├── categories_screen.dart
│   │   └── search_screen.dart
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── register_screen.dart
│   ├── menu/
│   │   ├── dishes_screen.dart
│   │   └── dish_detail_screen.dart
│   ├── cart/
│   │   └── cart_screen.dart
│   ├── checkout/
│   │   ├── address_screen.dart
│   │   └── payment_screen.dart
│   ├── orders/
│   │   ├── order_list_screen.dart
│   │   └── order_detail_screen.dart
│   ├── cook_hub/              # Cook seller dashboard
│   │   ├── cook_hub_home_screen.dart
│   │   ├── cook_products_screen.dart
│   │   ├── cook_orders_screen.dart
│   │   ├── cook_dashboard_screen.dart
│   │   ├── cook_earnings_screen.dart
│   │   └── ...
│   ├── settings/
│   ├── notifications/
│   └── ...
├── services/
│   └── api_service.dart       # HTTP service
├── utils/
│   └── helpers.dart
└── widgets/
    ├── rating_stars.dart
    └── ...
```

**Providers & Responsibilities:**

| Provider | Responsibility |
|----------|----------------|
| `AuthProvider` | Authentication state, login/logout |
| `CartProvider` | Shopping cart items & totals |
| `OrderProvider` | Order list & details |
| `CategoryProvider` | Category data |
| `ProductProvider` | Products list & details |
| `NotificationProvider` | Push notifications |
| `LanguageProvider` | Locale & translations (en/ar) |
| `AppModeProvider` | Toggle between Foodie/Cook Hub |
| `CountryProvider` | Country settings & VAT |
| `FavoriteProvider` | Favorites management |
| `CheckoutProvider` | Checkout flow state |
| `FilterProvider` | Product filtering |
| `MessageProvider` | Messaging |
| `AddressProvider` | Address management |
| `CampaignProvider` | Active campaigns |
| `MenuProvider` | Menu state |
| `FoodProvider` | Food-specific data |
| `NavigationProvider` | Navigation state |

**Key Feature Modules:**

| Module | Screens | Purpose |
|--------|---------|---------|
| **Main** | Home, Categories, Search | Browse dishes & cooks |
| **Auth** | Login, Register | User authentication |
| **Menu** | Dishes, Details | Product browsing |
| **Cart** | Cart | Multi-seller cart |
| **Checkout** | Address, Payment | Order placement |
| **Orders** | List, Details, Tracking | Order management |
| **Cook Hub** | Products, Orders, Dashboard, Earnings | Seller interface |
| **Settings** | Profile, Addresses, Notifications | User preferences |

**RTL Handling:**

```dart
// Supported locales
supportedLocales: [
  Locale('en', 'US'),
  Locale('ar', 'SA'),
]

// Locale determined by LanguageProvider
locale: languageProvider.locale

// UI automatically adjusts for RTL in Arabic mode
```

---

## 5. Environment Configuration

### Development Setup

```
Backend:     http://localhost:5005
Cook Web:    http://localhost:3000
Admin Panel: http://localhost:3001
Mobile:      localhost:5005 (via API config)

MongoDB:     MongoDB Atlas (cloud)
```

### Environment Variables

**Backend (server/.env):**

```env
# Server Configuration
PORT=5005
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRE=30d

# Client URLs (CORS)
CLIENT_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Google Maps
GOOGLE_MAPS_API_KEY=...

# Uploads
UPLOAD_DIR=./uploads

# Notifications
ENABLE_NOTIFICATION_SCHEDULER=false
```

**Web App (client/web/.env):**

```env
REACT_APP_API_URL=http://localhost:5005/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
REACT_APP_GOOGLE_MAPS_API_KEY=...
```

**Admin Panel (admin/.env):**

```env
REACT_APP_API_URL=http://localhost:5005/api
```

**Mobile App (mobile/foodie/lib/config/api_config.dart):**

```dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:5005/api';
  static const String staticBaseUrl = 'http://localhost:5005';
  static const String socketUrl = 'http://localhost:5005';
  // ... other endpoints
}
```

### Static Assets

```env
STATIC_BASE_URL=http://localhost:5005
# Used for: /uploads/dishes/, /uploads/cooks/, /uploads/categories/
```

### Service Dependencies

| Service | Used By | Purpose |
|---------|---------|---------|
| **MongoDB Atlas** | Backend | Primary database |
| **Stripe** | Backend, Web | Payment processing |
| **FCM** | Backend, Mobile | Push notifications |
| **Google Maps** | Mobile, Web | Location services |
| **Socket.IO** | Backend, Mobile | Real-time updates |

---

## 6. External Services Status

| Service | Status | Notes |
|---------|--------|-------|
| **MongoDB Atlas** | ✅ Fully Implemented | Cloud database, clustered |
| **Stripe** | ⚠️ Partially Implemented | Basic checkout, no Connect |
| **FCM** | ⚠️ Partially Implemented | Push notifications exist |
| **Google Maps** | ✅ Fully Implemented | Location selection, address |
| **Google Sign-In** | ✅ Implemented | Mobile social login |
| **Facebook Auth** | ✅ Implemented | Mobile social login |
| **Socket.IO** | ✅ Fully Implemented | Real-time connections |
| **Stripe Connect** | ❌ Not Implemented | Future: split payments to cooks |
| **Apple Sign-In** | ❌ Not Implemented | Future feature |

---

## 7. Deployment Overview (Current State)

### Development Environment

```
Node Version:     18.x (LTS recommended)
MongoDB:          MongoDB Atlas (cloud)
Process Manager:  None (run directly with node/npm)
Reverse Proxy:    None
SSL/TLS:          Handled by Atlas/proxy
```

### Recommended Production Setup

```
Node Version:     18.x (LTS)
MongoDB:          MongoDB Atlas (production cluster)
Process Manager:  PM2 (pm2 start server.js -i max)
Reverse Proxy:    Nginx (port 80/443 → 5005)
SSL/TLS:          Let's Encrypt or cloud load balancer
Domain:           api.eltekkeya.com → backend
                  web.eltekkeya.com → Cook Dashboard
                  admin.eltekkeya.com → Admin Panel
```

### Build Commands

```bash
# Backend
cd server && npm install && npm start

# Cook Dashboard
cd client/web && npm install && npm run build

# Admin Panel
cd admin && npm install && npm run build

# Mobile App
cd mobile/foodie && flutter build apk --release  # Android
cd mobile/foodie && flutter build ipa --release  # iOS
```

---

## 8. Data & System Initialization

### Seed Test Users

```bash
cd server
node seedDemoData.js        # Creates demo users, products, categories
node seedTestAccounts.js    # Creates test accounts
```

### Default Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin.p2@test.com | password123 | Admin |
| cook.p2@test.com | password123 | Cook |
| user.p2@test.com | password123 | Foodie |

### First Admin Creation

The first admin account is typically created manually by:
1. Direct database insertion
2. Or via a seed script that creates the initial admin user

### Migration Scripts

```bash
server/migrateCategories.js    # Category data migration
server/migrateExpertise.js     # Expertise categories migration
server/migrateContactHistory.js # Contact history migration
```

### Required Initial Settings

After first deployment, create these via Admin Panel or API:

1. **Settings Document** - Auto-created on first access
2. **Categories** - Seed with food categories
3. **Expertise Categories** - Seed for cook registration
4. **Hero Images** - Upload homepage carousel images
5. **VAT Configuration** - Set per-country VAT rates
6. **Campaigns** - Create initial promotional campaigns

---

## 9. Local Setup Run Order

### Step 1: Start MongoDB
```bash
# MongoDB Atlas - ensure cluster is accessible
# No local MongoDB needed (cloud-based)
```

### Step 2: Start Backend Server
```bash
cd /Users/AhmedElbedeawy/Desktop/Marketplace Project/server
npm run dev      # Development with nodemon (auto-reload)
# OR
npm start        # Production mode
# Server runs on http://localhost:5005
```

### Step 3: Start Cook Dashboard (Optional)
```bash
cd /Users/AhmedElbedeawy/Desktop/Marketplace Project/client/web
npm start
# Opens at http://localhost:3000
```

### Step 4: Start Admin Panel (Optional)
```bash
cd /Users/AhmedElbedeawy/Desktop/Marketplace Project/admin
npm start
# Opens at http://localhost:3001
```

### Step 5: Start Mobile App
```bash
cd /Users/AhmedElbedeawy/Desktop/Marketplace Project/mobile/foodie
flutter pub get
flutter run
# Connects to localhost:5005 API
```

### Quick Start Script
```bash
# All services (terminal tabs required)
./start-dev.sh  # May need customization
```

---

## 10. System Verification Checklist

### Authentication
- [ ] User can register new account
- [ ] User can login with email/password
- [ ] Social login works (Google/Facebook)
- [ ] JWT token is issued and valid
- [ ] Logout clears tokens

### Cook Flow
- [ ] Cook can complete registration questionnaire
- [ ] Cook can create products with images
- [ ] Product appears in marketplace after approval
- [ ] Cook can view incoming orders
- [ ] Cook can update order status
- [ ] Cook receives order notifications

### Foodie Flow
- [ ] User can browse categories
- [ ] User can search for dishes
- [ ] User can add items from multiple cooks to cart
- [ ] Cart correctly groups items by cook
- [ ] Checkout creates multiple sub-orders
- [ ] Payment processes successfully
- [ ] User receives order confirmation
- [ ] Order tracking updates in real-time

### Multi-Seller Cart
- [ ] Cart shows items from multiple cooks
- [ ] Subtotals per cook are calculated
- [ ] Checkout creates sub-orders per cook
- [ ] Each sub-order has independent status

### Order Management
- [ ] Order status transitions correctly
- [ ] Cook receives notification for new order
- [ ] Customer receives status updates
- [ ] Order completion triggers rating prompt
- [ ] Rating is recorded and affects cook score

### Notifications
- [ ] Push notifications arrive on mobile
- [ ] In-app notifications display correctly
- [ ] Notification preferences are respected

### RTL/Layout
- [ ] Arabic locale switches to RTL
- [ ] All UI elements mirror correctly
- [ ] Text alignment is correct for Arabic
- [ ] No overlapping elements in RTL mode

### Admin Functions
- [ ] Admin can view all users
- [ ] Admin can approve/suspend cooks
- [ ] Admin can manage hero images
- [ ] Admin can configure VAT per country
- [ ] Admin can create campaigns
- [ ] Admin can resolve customer issues

---

## 11. Known Sensitive or Complex Areas

### Multi-Seller Cart Logic
**Files:** `server/controllers/cartController.js`, `server/controllers/orderController.js`
**Risk:** High - Changes can break checkout and order splitting
**Care:** Test thoroughly with multiple cooks in cart

### Country & VAT Switching
**Files:** `server/models/Settings.js`, `server/services/pricingService.js`
**Risk:** Medium - Affects pricing calculations
**Care:** VAT is snapshotted at order time; changes don't retroactively affect orders

### Campaign System
**Files:** `server/controllers/campaignController.js`, `admin/src/pages/Campaigns.js`
**Risk:** Medium - Marketing feature with scheduling
**Care:** Campaign scheduling uses server time; verify timezone handling

### Hero Image Management
**Files:** `server/models/Settings.js`, `admin/src/pages/Settings.js`
**Risk:** Low - Visual only
**Care:** Order index affects display; max 5 images

### Cook Hub Marketing Visibility
**Files:** `mobile/foodie/lib/providers/campaign_provider.dart`
**Risk:** Medium - Affects product discoverability
**Care:** Admin boost flag affects ranking; don't expose to public API

### Notification Scheduler
**Files:** `server/services/notificationScheduler.js`
**Risk:** Medium - Runs in background, affects user experience
**Care:** Only enabled in production; verify triggers work correctly

### Socket.IO Real-time
**Files:** `server/server.js`, `mobile/foodie/lib/services/socket_service.dart`
**Risk:** Low - Connection handling
**Care:** Ensure connection survives network glitches

---

## 12. Linked Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| `README.md` | Root | Basic project overview and setup |
| `PROJECT_SUMMARY.md` | Root | Phase scope and constraints |
| `PROJECT_BRIEF.md` | Root | Previous technical brief |
| `ADMIN_DASHBOARD_IMPLEMENTATION.md` | Root | Admin panel details |
| `FLUTTER_APPS_SETUP.md` | Root | Mobile app configuration |
| `MOBILE_APPS_QUICKSTART.txt` | Root | Mobile quick reference |
| `NEXT_STEPS.md` | Root | Future development plans |
| `.env.example` | Root | Environment variable template |

---

## 13. API Endpoint Reference

### Authentication
```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login
POST   /api/auth/become-cook       # Upgrade to cook
POST   /api/auth/social-login      # Social authentication
```

### Users
```
GET    /api/users/profile          # Get user profile
PUT    /api/users/profile          # Update profile
POST   /api/users/switch-view      # Toggle Foodie/Cook view
```

### Products
```
GET    /api/products               # List products
GET    /api/products/:id           # Get product
POST   /api/products               # Create product (cook)
PUT    /api/products/:id           # Update product (cook)
DELETE /api/products/:id           # Delete product (cook)
GET    /api/products/popular       # Popular dishes
```

### Orders
```
GET    /api/orders                 # List orders
POST   /api/orders                 # Create order
GET    /api/orders/:id             # Get order
PUT    /api/orders/:id/status      # Update status
POST   /api/orders/:id/cancel      # Cancel order
```

### Cart
```
GET    /api/cart                   # Get cart
POST   /api/cart/add               # Add item
PUT    /api/cart/:id               # Update item
DELETE /api/cart/:id               # Remove item
DELETE /api/cart                   # Clear cart
```

### Categories
```
GET    /api/categories             # List categories
POST   /api/categories             # Create (admin)
PUT    /api/categories/:id         # Update (admin)
DELETE /api/categories/:id         # Delete (admin)
```

### Admin
```
GET    /api/admin/dashboard        # Stats
GET    /api/admin/users            # All users
PUT    /api/admin/users/:id        # Update user
GET    /api/admin/products         # All products
POST   /api/admin/campaigns        # Create campaign
PUT    /api/admin/settings         # Platform settings
```

### Cooks
```
GET    /api/cooks                  # List cooks
GET    /api/cooks/top-rated        # Top rated
GET    /api/cooks/:id              # Cook profile
```

### Ratings
```
GET    /api/ratings                # List ratings
POST   /api/ratings                # Create rating
GET    /api/ratings/product/:id    # Product ratings
```

### Favorites
```
GET    /api/favorites              # Get favorites
POST   /api/favorites/product      # Toggle product favorite
POST   /api/favorites/cook         # Toggle cook favorite
```

### Campaigns
```
GET    /api/campaigns              # List campaigns
POST   /api/campaigns              # Create (admin)
GET    /api/campaigns/active       # Active campaigns
```

### Settings
```
GET    /api/settings               # Get settings
PUT    /api/settings               # Update (admin)
GET    /api/settings/hero-images   # Hero images
POST   /api/settings/hero-images   # Add hero image
```

### Notifications
```
GET    /api/notifications          # List notifications
PUT    /api/notifications/:id/read # Mark read
```

### Invoices
```
GET    /api/invoices               # List invoices
GET    /api/invoices/:id           # Get invoice
POST   /api/invoices/:id/payouts   # Create payout (admin)
```

---

## 14. Important Notes for Developers

### Database Schema Rules
- Always use `select: false` for password fields
- Use `enum` for status fields with documented values
- Include `timestamps: true` on all schemas
- Snapshot immutable data at order time (addresses, VAT)

### API Design
- All routes prefixed with `/api`
- Protected routes use `protect` middleware
- Admin routes use `authorize('admin')`
- Always return consistent JSON structure

### Frontend State
- Use Redux for global state (web)
- Use Providers for state (mobile)
- Never hardcode API URLs (use environment/config)

### Security
- Never commit `.env` files
- Rotate MongoDB password if exposed
- Use environment variables for all secrets
- Validate all inputs with Joi schemas

### Testing
- Use `server/test_*.js` scripts for manual testing
- Run `node test_mongo.js` to verify database connection
- Seed data before testing checkout flow

---

*This document reflects the current state of the ElTekkeya platform as of February 2026. Updates should be made as the system evolves.*
