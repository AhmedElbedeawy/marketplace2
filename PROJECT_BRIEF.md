# Home Food Marketplace - Technical Project Brief

## Project Overview

A multi-vendor home food marketplace platform combining Amazon-style buyer experience with eBay-style seller management. Users can browse and order home-cooked meals from local cooks with a unique multi-seller cart system that automatically splits orders by cook.

**Key Features:**
- Unified Account System (single account for buying and selling)
- Multi-Seller Cart (automatically splits orders by cook)
- Real-time Order Tracking
- Favorites System (dishes and cooks)
- Bilingual Support (English/Arabic with RTL)
- Photo Validation for product images
- Smart Sale Control with admin oversight

---

## Project Structure

```
marketplace-project/
├── server/                 # Node.js Backend API
├── client/
│   ├── web/               # Cook Dashboard (React)
│   └── mobile/            # Foodie Mobile App (Flutter)
├── admin/                 # Admin Panel (React)
├── cook-registration-server.js
├── cook-registration-mobile-server.js
└── .env.example
```

---

## Backend (server/)

### Purpose
RESTful API server handling all business logic, authentication, database operations, and real-time communications.

### Directory Structure
```
server/
├── controllers/     # Request handlers for each module
├── models/          # Mongoose schemas for MongoDB
├── routes/          # API route definitions
├── middleware/      # Custom middleware (auth, validation)
├── config/          # Database configuration
├── services/        # Business logic services (invoice, notifications, pricing)
├── utils/           # Utility functions (FCM, geo, notifications)
├── uploads/         # Uploaded files storage
└── server.js        # Entry point
```

### Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **Real-time:** Socket.IO
- **Image Processing:** Sharp + Multer
- **Validation:** Joi
- **Payments:** Stripe
- **Push Notifications:** Firebase Cloud Messaging

### Controllers (24 modules)
| Controller | Purpose |
|------------|---------|
| `authController.js` | User authentication, registration, login, JWT token management |
| `userController.js` | User profile management, account settings |
| `cookController.js` | Cook registration, profile, expertise management |
| `productController.js` | Product CRUD operations |
| `orderController.js` | Order creation, tracking, status updates |
| `cartController.js` | Multi-seller cart management |
| `checkoutController.js` | Checkout flow, payment processing |
| `categoryController.js` | Category management |
| `adminController.js` | Admin operations, user/product management |
| `adminDishController.js` | Admin dish management |
| `ratingController.js` | Ratings and reviews |
| `favoriteController.js` | Favorites management |
| `notificationController.js` | Push notifications |
| `invoiceController.js` | Invoice generation |
| `campaignController.js` | Marketing campaigns |
| `dishOfferController.js` | Dish offers and promotions |
| `dashboardController.js` | Analytics and statistics |
| `settingsController.js` | Platform settings |
| `addressController.js` | Address management |
| `supportController.js` | Customer support |
| `expertiseController.js` | Cook expertise categories |
| `adminDishPublicController.js` | Public dish access |

### Models (21 schemas)
| Model | Description |
|-------|-------------|
| `User.js` | User accounts with roles (user, cook, admin) |
| `Cook.js` | Cook profiles with expertise and ratings |
| `Product.js` | Product catalog items |
| `Order.js` | Orders with sub-orders per cook |
| `Category.js` | Product categories |
| `AdminDish.js` | Admin-managed dishes |
| `DishOffer.js` | Special offers and promotions |
| `Campaign.js` | Marketing campaigns |
| `Invoice.js` | Financial invoices |
| `Notification.js` | User notifications |
| `Address.js` | User addresses |
| `OrderRating.js` | Ratings for orders |
| `CheckoutSession.js` | Payment sessions |
| `Coupon.js` | Discount coupons |
| `Settings.js` | Platform settings |
| `AdminActionLog.js` | Admin audit trail |
| `AuditLog.js` | General system audit |

### API Routes
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth` | POST | Register, login, become-cook |
| `/api/users` | GET, PUT | User profile management |
| `/api/cooks` | GET, PUT | Cook profiles |
| `/api/products` | GET, POST, PUT, DELETE | Product management |
| `/api/orders` | GET, POST, PUT | Order operations |
| `/api/cart` | GET, POST, PUT, DELETE | Cart management |
| `/api/checkout` | POST | Checkout flow |
| `/api/categories` | GET, POST, PUT, DELETE | Categories |
| `/api/admin` | GET, PUT, DELETE | Admin operations |
| `/api/favorites` | GET, POST | Favorites |
| `/api/ratings` | GET, POST | Ratings |
| `/api/campaigns` | GET, POST, PUT | Marketing campaigns |
| `/api/invoices` | GET | Invoice management |
| `/api/notifications` | GET | Notifications |
| `/api/settings` | GET, PUT | Platform settings |

---

## Web App (client/web/)

### Purpose
Cook Dashboard - Web interface for sellers to manage their products, orders, and business.

### Tech Stack
- **Framework:** React 18
- **UI Library:** Material-UI (MUI) 5
- **State Management:** Redux + Redux Thunk
- **Routing:** React Router DOM 6
- **HTTP Client:** Axios
- **Charts:** Recharts
- **Build Tool:** Create React App (react-scripts)

### Directory Structure
```
client/web/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   ├── CreateDishDialog.js
│   │   ├── CookDetailsDialog.js
│   │   ├── OrderSummary.js
│   │   └── ...
│   ├── pages/           # Route pages
│   │   ├── Dashboard.js
│   │   ├── Orders.js
│   │   ├── Products.js
│   │   ├── Menu.js
│   │   ├── Analytics.js
│   │   ├── Marketing.js
│   │   ├── MessageCenter.js
│   │   └── foodie/      # Foodie-specific pages
│   ├── contexts/        # React contexts
│   ├── utils/           # Utility functions
│   ├── App.js
│   ├── App.css
│   └── i18n-translations.json
└── package.json
```

### Key Pages
| Page | Description |
|------|-------------|
| `Dashboard.js` | Business overview, statistics |
| `Orders.js` | Order management, status updates |
| `Products.js` | Product inventory management |
| `Menu.js` | Menu configuration |
| `Analytics.js` | Sales and performance charts |
| `Marketing.js` | Campaigns and promotions |
| `MessageCenter.js` | Customer communication |
| `CookInvoices.js` | Financial records |

---

## Mobile App (mobile/foodie/)

### Purpose
Unified consumer and cook mobile application built with Flutter.

### Tech Stack
- **Framework:** Flutter 3.x
- **State Management:** Provider
- **Localization:** flutter_localizations + intl
- **HTTP:** http package
- **Maps:** Google Maps Flutter
- **Storage:** shared_preferences
- **Real-time:** socket_io_client
- **Image Picking:** image_picker
- **Authentication:** Google Sign-In, Facebook Auth

### Directory Structure
```
mobile/foodie/
├── lib/
│   ├── main.dart           # App entry point
│   ├── app.dart            # App configuration
│   ├── config/             # App configuration
│   ├── models/             # Data models
│   ├── providers/          # State providers (18 providers)
│   ├── routes/             # Navigation routes
│   ├── screens/            # App screens (17 directories)
│   │   ├── main/           # Main screens (home, categories)
│   │   ├── auth/           # Authentication screens
│   │   ├── menu/           # Menu browsing
│   │   ├── cart/           # Shopping cart
│   │   ├── checkout/       # Checkout flow
│   │   ├── orders/         # Order management
│   │   ├── cook_hub/       # Cook seller dashboard
│   │   ├── dashboard/      # Analytics
│   │   └── ...
│   ├── services/           # API services
│   ├── utils/              # Utilities
│   └── widgets/            # Reusable widgets
├── android/                # Android configuration
├── ios/                    # iOS configuration
├── pubspec.yaml            # Dependencies
└── assets/                 # Images, icons, categories
```

### Key Screen Categories
| Category | Screens |
|----------|---------|
| **Main** | Home, Categories, Search |
| **Auth** | Login, Registration |
| **Menu** | Dishes, Categories, Dish Details |
| **Cart** | Cart, Add-ons |
| **Checkout** | Address, Payment, Confirmation |
| **Orders** | Order List, Order Details, Tracking |
| **Cook Hub** | Products, Orders, Analytics, Earnings |
| **Account** | Profile, Settings, Addresses |

### Providers (18 state managers)
| Provider | Purpose |
|----------|---------|
| `AuthProvider` | Authentication state |
| `LocationProvider` | GPS and location |
| `CategoryProvider` | Categories data |
| `ProductProvider` | Products |
| `CartProvider` | Shopping cart |
| `OrderProvider` | Orders |
| `FavoriteProvider` | Favorites |
| `CookProvider` | Cook profile |
| `NotificationProvider` | Push notifications |
| `SettingsProvider` | App settings |
| `MapProvider` | Map services |
| `ChatProvider` | Messaging |
| `CampaignProvider` | Promotions |
| `FilterProvider` | Product filtering |
| `LanguageProvider` | i18n |
| `ThemeProvider` | Dark/light mode |
| `CookingModeProvider` | Cook mode toggle |
| `RatingProvider` | Reviews |

---

## Admin Panel (admin/)

### Purpose
Platform administration interface for managing users, products, orders, and platform settings.

### Tech Stack
- **Framework:** React 18
- **UI Library:** Material-UI (MUI) 5
- **State Management:** Redux + Redux Thunk
- **Routing:** React Router DOM 6
- **HTTP Client:** Axios
- **Charts:** Recharts
- **Date Handling:** date-fns, moment-timezone

### Directory Structure
```
admin/
├── public/              # Static assets
├── src/
│   ├── components/      # UI components
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   ├── HeroImagesManager.js
│   │   └── ...
│   ├── pages/           # Admin pages
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   ├── EnhancedDashboard.js
│   │   ├── Users.js
│   │   ├── Products.js
│   │   ├── Orders.js
│   │   ├── Categories.js
│   │   ├── Cooks.js
│   │   ├── Campaigns.js
│   │   ├── Issues.js
│   │   └── Settings.js
│   ├── App.js
│   └── index.js
└── package.json
```

### Admin Pages
| Page | Description |
|------|-------------|
| `Login.js` | Admin authentication |
| `Dashboard.js` | Basic statistics |
| `EnhancedDashboard.js` | Comprehensive analytics |
| `Users.js` | User management |
| `Cooks.js` | Cook verification and management |
| `Products.js` | Product moderation |
| `Orders.js` | Order oversight |
| `Categories.js` | Category management |
| `Campaigns.js` | Marketing campaign management |
| `Issues.js` | Customer issue resolution |
| `Settings.js` | Platform configuration |

---

## Local Development Setup

### Backend
```bash
cd server
npm install           # Install dependencies
npm run dev           # Start with nodemon (auto-reload)
# OR
npm start             # Start production
```

**Access:** http://localhost:5000

### Web App (Cook Dashboard)
```bash
cd client/web
npm install           # Install dependencies
npm start             # Start development server
```

**Access:** http://localhost:3000

### Admin Panel
```bash
cd admin
npm install           # Install dependencies
npm start             # Start development server
```

**Access:** http://localhost:3001

### Mobile App
```bash
cd mobile/foodie
flutter pub get       # Install dependencies
flutter run           # Start on connected device/emulator
```

**Platforms:** iOS and Android

---

## Environment Variables

### Backend (server/.env)
```env
# Server Configuration
PORT=5000                    # Server port
NODE_ENV=development         # Environment mode

# Database Configuration
MONGO_URI=mongodb://localhost:27017/marketplace  # MongoDB connection

# JWT Configuration
JWT_SECRET=your-secret-key   # Token signing secret
JWT_EXPIRE=30d               # Token expiration

# Client URLs (CORS)
CLIENT_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# Optional: Payment Processing
STRIPE_SECRET_KEY=sk_test_...    # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook endpoint

# Optional: Firebase Cloud Messaging
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Optional: Maps API
GOOGLE_MAPS_API_KEY=...
```

### Web App (client/web/.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
REACT_APP_GOOGLE_MAPS_API_KEY=...
```

### Admin Panel (admin/.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Mobile App (mobile/foodie/.env)
```yaml
# In lib/config/api_config.dart or environment variables
API_BASE_URL=http://localhost:5000
STRIPE_PUBLISHABLE_KEY=pk_test_...
GOOGLE_MAPS_API_KEY=...
FIREBASE_PROJECT_ID=...
```

---

## External Services Integrated

| Service | Purpose | Where Used |
|---------|---------|------------|
| **MongoDB** | Primary database | Backend (all data) |
| **Stripe** | Payment processing | Backend checkout, Web payments |
| **Firebase Cloud Messaging** | Push notifications | Backend notifications, Mobile app |
| **Google Maps** | Location services | Mobile app, Address selection |
| **Google Sign-In** | Social authentication | Mobile app |
| **Facebook Auth** | Social authentication | Mobile app |
| **Socket.IO** | Real-time updates | Backend, Mobile app |
| **Image Processing (Sharp)** | Image optimization | Backend uploads |
| **Geolocation (Geolocator)** | GPS coordinates | Mobile app |

---

## Build & Deployment Process

### Backend
```bash
cd server
npm install --production
npm start
```

**Production Considerations:**
- Set `NODE_ENV=production`
- Use process manager (PM2): `pm2 start server.js`
- Configure reverse proxy (Nginx)

### Web App
```bash
cd client/web
npm run build
# Creates build/ directory with static files
serve -s build -l 3000
```

### Admin Panel
```bash
cd admin
npm run build
# Creates build/ directory with static files
serve -s build -l 3001
```

### Mobile App
```bash
cd mobile/foodie
# iOS
flutter build ipa --release
# Android
flutter build apk --release
```

---

## Important Configuration Notes

### Bilingual Support (RTL/LTR)
- **Frontend:** Uses `isRTL` context variable to switch layouts
- **CSS:** Direction-sensitive margins/padding
- **i18n:** English/Arabic translations in `i18n-translations.json` (web) and `intl` (mobile)
- **Fonts:** Supports both LTR and RTL text direction

### Multi-Seller Cart Logic
- Cart items grouped by cook
- Sub-orders created per cook during checkout
- Each sub-order has independent status tracking
- Payment split handled by Stripe Connect (if implemented)

### Image Validation
- Backend uses `Sharp` for image processing
- Automatic compression and resizing
- Uploaded files stored in `server/uploads/`
- Static files served from `STATIC_BASE_URL`

### Authentication Flow
1. User logs in via `/api/auth/login`
2. JWT token issued (30-day expiration)
3. Token stored in localStorage (web) or secure storage (mobile)
4. Protected routes require `Authorization: Bearer <token>` header
5. Admin routes require `role: 'admin'` in user object

### Order Status Flow
```
Pending → Received → Preparing → Ready → Picked Up → Delivered
          ↓
       Cancelled
```

### Notification System
- Push notifications via Firebase Cloud Messaging
- In-app notifications stored in `Notification` model
- Deduplication via `NotificationDedupe` model
- Campaign-driven notifications via `Campaign` model

---

## Common Pitfalls to Avoid

1. **File Save Failures**
   - When editing backend files, stop dev server first
   - Use search_replace tool with exact original_text matching
   - Verify changes with get_problems tool

2. **Authentication Issues**
   - JWT tokens expire after 30 days
   - Clear localStorage and re-login for fresh token
   - Admin panel runs on port 3001 (not 3000)

3. **Mobile Hot Reload**
   - Flutter hot reload may not reflect native changes
   - Full restart required for some modifications
   - iOS: `flutter clean && flutter run` after pod updates

4. **Database Migrations**
   - Never modify models in production without backup
   - Use migration scripts in `server/migrate*.js`
   - Test migrations on staging first

5. **Environment Variables**
   - Backend reads `.env` in server/ directory
   - Web/admin read from `.env` or environment
   - Mobile uses dart configuration files

6. **Z-Index and Overlays**
   - MUI components have specific z-index stacking
   - Active tabs require z-index 200+ to overlay
   - Directional overlays differ for RTL (right-to-left)

---

## Testing & Quality Assurance

### Backend Tests
```bash
cd server
npm test
```

### Manual Testing Scripts
| Script | Purpose |
|--------|---------|
| `test_login.js` | Authentication testing |
| `test_order_create.js` | Order flow testing |
| `test_phase2.js` | Phase 2 feature testing |
| `e2e_phase3_test.js` | End-to-end testing |
| `seedTestAccounts.js` | Create test users |

---

## Support & Documentation

- **API Documentation:** See README.md for endpoint details
- **Architecture:** See PROJECT_SUMMARY.md
- **Admin Implementation:** See ADMIN_DASHBOARD_IMPLEMENTATION.md
- **Mobile Setup:** See FLUTTER_APPS_SETUP.md

---

*Document generated for developer handover. Last updated: February 2026*
