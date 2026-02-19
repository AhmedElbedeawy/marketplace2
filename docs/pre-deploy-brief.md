# Project Deployment & Environment Brief

**Document Version:** 1.0  
**Last Updated:** February 18, 2026  
**Verification Date:** February 18, 2026

---

## 1. Safepoint & Version State

| Property | Value |
|----------|-------|
| Ready for Deployment Tag | `ready-for-deployment` |
| Deployment Verified Tag | `deployment-verified` |
| Safe Return Commit | `e1c5865` |
| Current Commit | `a06a950` |
| Active Branch | `rescue/capture-working-state` |
| Verification Date | February 18, 2026 |

---

## 2. Project Structure Overview

### Core Directories

| Directory | Purpose |
|-----------|---------|
| `server/` | Express.js backend API - handles all business logic, database operations, authentication, payments |
| `client/web/` | React-based web application for Foodie users and Cook dashboard |
| `admin/` | React-based admin panel for platform management |
| `mobile/foodie/` | Flutter mobile application for Foodie users |
| `docs/` | Technical documentation and deployment briefs |

### Asset Locations

| Asset Type | Location |
|------------|----------|
| Static Assets | `client/web/public/assets/` |
| Category Icons | `client/web/public/assets/categories/` |
| Branding & Hero Images | `client/web/public/assets/images/` |
| User Uploads | `server/uploads/` (served via `/uploads/*` route) |

### Storage Method

- **Uploads Storage:** Local filesystem at `server/uploads/`
- **Database:** MongoDB Atlas (cloud-hosted)
- **Static Assets:** Served from React public folder

---

## 3. Technology Stack

### Backend

| Component | Technology |
|-----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose ODM) |
| Authentication | JWT (jsonwebtoken) |
| Storage | Local filesystem + Firebase (for notifications) |
| Payments | Stripe (Test Mode) |
| Notifications | Firebase Cloud Messaging |

### Frontend (client/web)

| Component | Technology |
|-----------|------------|
| Framework | React (Create React App) |
| UI Library | Material-UI (MUI) |
| State Management | React Context API |
| Maps Integration | Google Maps JavaScript API + Places Library |
| Language Support | Arabic (RTL) + English - using Cairo, Tajawal, Inter fonts |

### Admin Panel

| Component | Technology |
|-----------|------------|
| Framework | React (Create React App) |
| UI Library | Material-UI (MUI) |
| API Communication | REST API via axios |

---

## 4. Environment Variables (CONFIG CONTRACT)

### Backend Required Variables

Located in: `server/.env`

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default: 5005) |
| `NODE_ENV` | Environment mode (development/production) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRE` | JWT token expiration (e.g., 30d) |
| `CLIENT_URL` | Frontend URL for CORS |
| `ADMIN_URL` | Admin panel URL for CORS |
| `STRIPE_SECRET_KEY` | Stripe payment secret key |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Path to Firebase service account JSON |

### Frontend Hosting Variables

Located in: `client/web/.env`

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_URL` | Backend API base URL |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |

### Safety Confirmation

- **No secrets stored in source code** - All credentials are in `.env` files
- **Production hosting must contain variables** - Deployments require environment configuration

---

## 5. Database & Storage

### Database Configuration

| Property | Value |
|----------|-------|
| Type | MongoDB |
| Host | MongoDB Atlas (Cloud) |
| Connection | mongoose.connect() with URI |

### Collections

| Collection | Purpose |
|------------|---------|
| `users` | User accounts (Foodies, Cooks, Admins) |
| `cooks` | Cook profiles and kitchen settings |
| `products` | Admin-managed dishes (AdminDish) |
| `dishoffers` | Cook-specific dish offers with variations |
| `orders` | Customer orders |
| `invoices` | Billing records |
| `notifications` | Push notifications and alerts |
| `categories` | Dish categories |

### Read/Write Operations

- **Status:** VERIFIED - Database read/write operations functional
- **API Test:** `GET /api/products/stats` returns valid data

---

## 6. API Architecture & Connectivity

### Frontend ↔ Backend Communication

| Component | URL | Status |
|-----------|-----|--------|
| Backend API | `http://localhost:5005` | Running |
| Client Web | `http://localhost:3000` | Running |
| Admin Panel | `http://localhost:3001` | Running |

### API Base URL Usage

Frontend uses `process.env.REACT_APP_API_URL` with fallback to `http://localhost:5005`

### CORS Configuration

Server CORS configured to allow:
- `CLIENT_URL` (frontend)
- `ADMIN_URL` (admin panel)

### HTTPS Requirement

- Currently running in development mode (HTTP)
- Production requires HTTPS configuration

---

## 7. Google Maps & Location Services

### Required APIs

| API | Purpose |
|-----|---------|
| Maps JavaScript API | Map rendering |
| Places API | Address autocomplete |

### Configuration Requirements

| Requirement | Status |
|-------------|--------|
| API Key Configured | `REACT_APP_GOOGLE_MAPS_API_KEY` in client/web/.env |
| Domain Referrers | Must match production domain |
| Autocomplete | Implemented in FoodieOrderDetails.js |
| Coordinates Capture | Implemented - marker selection saves lat/lng |

### Functionality Verification

- **Status:** VERIFIED - Maps load, autocomplete works, coordinates save correctly

---

## 8. Payments Integration

### Payment Provider

| Property | Value |
|----------|-------|
| Provider | Stripe |
| Mode | Test Mode (`sk_test_*`) |
| Webhook Endpoint | Configured in checkout routes |

### Checkout Flow

1. Foodie selects items → Cart
2. Proceeds to checkout → Stripe Payment
3. Payment success → Order created
4. Order status updates → Notifications sent

---

## 9. Static Assets & Branding

### Asset Locations

| Asset Type | Path |
|------------|------|
| Icons | `client/web/public/assets/Icons/` |
| Category Icons | `client/web/public/assets/categories/` |
| Cook Images | `client/web/public/assets/cooks/` |
| Dish Images | `client/web/public/assets/dishes/` |
| Hero Images | `client/web/public/assets/images/` |

### Font Loading

Google Fonts loaded in `client/web/public/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Typography Configuration

| Language | Font |
|----------|------|
| Arabic | Cairo, Tajawal |
| English | Inter |

### RTL Support

- Full Arabic (RTL) support implemented
- Language switching via i18n

---

## 10. Build & Deployment Process

### Build Command

```bash
cd client/web
npm run build
```

### Build Output

- Location: `client/web/build/`
- Contains: Optimized production assets (JS, CSS, HTML)
- Deployment: Serve with static server (e.g., `serve -s build`)

### Build Verification

**Status:** ✅ SUCCESSFUL

```
Compiled successfully.

File sizes after gzip:
  455.48 kB  build/static/js/main.347cbfef.js
  895 B      build/static/css/main.c4f0c9b1.css
```

---

## 11. Functional System Overview

### Platform Features

| Feature | Status |
|---------|--------|
| Authentication | JWT-based login/registration |
| Dish Management | AdminDish (admin) + DishOffer (cook) |
| Image Handling | Local filesystem storage with URL serving |
| Country-Based Filtering | Implemented via `x-country-code` header |
| Hero Statistics | Real-time counting with variations support |

### Orders & Checkout

| Feature | Implementation |
|---------|----------------|
| VAT Handling | Calculated in checkoutController |
| Order Flow | placed → preparing → ready → delivered/pickup |
| Notifications | Firebase Cloud Messaging |

### Maps & Address

| Feature | Implementation |
|---------|----------------|
| Address Search | Google Places Autocomplete |
| Coordinate Saving | Lat/lng stored with delivery address |

### Mobile & Responsiveness

| Feature | Status |
|---------|--------|
| Responsive Layout | Material-UI Grid system |
| Mobile Optimization | Touch-friendly components |
| Flutter App | Available in `mobile/foodie/` |

---

## 12. Security & Configuration Safety

### Secrets Management

| Rule | Status |
|------|--------|
| Secrets in environment variables | ✅ All credentials in `.env` |
| No credentials in source code | ✅ Verified |
| Production HTTPS required | ⚠️ Must configure in production |

### Upload Safety

- File type restrictions implemented in multer configuration
- Storage location: `server/uploads/` (not publicly writable)

---

## 13. Recovery & Rollback Reference

### Safe Return Points

| Reference | Command | When to Use |
|-----------|---------|-------------|
| Working State | `git checkout rescue/capture-working-state` | General rollback |
| Pre-Deployment | `git checkout ready-for-deployment` | After deployment issues |

### Tags

- `ready-for-deployment` - Created before verification
- `deployment-verified` - Confirmed after verification

---

## 14. Deployment Readiness Status

| Status | Details |
|--------|--------- Status**|
| **Deployment | **READY** |
| Backend API | ✅ Running |
| Client Web | ✅ Running |
| Admin Panel | ✅ Running |
| Database | ✅ Connected |
| Build | ✅ Successful |
| Auth Routes | ✅ Functional |
| Demo Routes | ✅ Disabled (production hardened) |

### Issues Found

None - All systems operational.

---

## 15. Notes for Future Environment Setup

### Required Configuration Steps

1. **Environment Variables** - Must be configured in hosting platform
2. **Maps Referrers** - Google Cloud Console must whitelist production domain
3. **Storage Permissions** - `server/uploads/` must be writable
4. **Build Regeneration** - Run `npm run build` before each deployment
5. **Production URLs** - Configure `REACT_APP_API_URL` and `CLIENT_URL` for production domain
6. **HTTPS** - Enable HTTPS on production server

---

## Appendix: Current Data State

### Users (3)

| Email | Role | Cook Status |
|-------|------|-------------|
| cook@test.com | foodie | active |
| cooksecond@test.com | foodie | active |
| admin@test.com | admin | N/A |

### Hero Statistics (SA)

| Metric | Count |
|--------|-------|
| Total Dishes | 15 (includes variations) |
| Total Cooks | 2 |

---

**Document End**
