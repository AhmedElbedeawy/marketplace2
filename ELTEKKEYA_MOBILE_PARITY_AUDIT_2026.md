# ELTEKKEYA MOBILE vs WEB PARITY AUDIT 2026

**Date:** March 3, 2026  
**Source of Truth:** Web App (client/web)  
**Audit Method:** Code analysis, flow tracing, NOT runtime verification

---

## 1. CONFIRMED WORKING ON MOBILE

| Feature | Web Implementation | Mobile Implementation | Status | Notes |
|---------|-------------------|---------------------|--------|-------|
| **Home Page** | FoodieHome.js with featured dishes, categories, search | FoodieHome equivalent in main/ | MATCH | Both show featured dishes |
| **Dish Cards** | Grid layout with image, name, rating, price | Dish cards in menu | MATCH | Similar card layout |
| **Categories Slider** | Horizontal scrollable categories | Categories in home | MATCH | Both show category icons |
| **Dish Detail Page** | MenuDishModalHost.js modal | dish_detail_screen.dart | PARTIAL | Missing portion selector |
| **Cart Storage** | LocalStorage cart | Provider-based cart | MATCH | Both persist cart |
| **Delivery Fee Calculator** | deliveryFeeCalculator.js | delivery_fee_calculator.dart | MATCH | Same logic |
| **Add to Cart Logic** | Adds to cart with full metadata | Adds with portionKey='default' | PARTIAL | Metadata captured but limited |
| **Notifications** | Notifications.js with real data | notifications_screen.dart | MATCH | Uses notificationProvider |
| **Single Page Checkout** | SinglePageCheckout.js | single_page_checkout_screen.dart | PARTIAL | UI similar, missing some fields |
| **Bottom Navigation** | Global nav bar | GlobalBottomNavigation | MATCH | Same tabs |

---

## 2. PARTIALLY IMPLEMENTED

| Feature | Difference | Impact | Required Fix |
|---------|-----------|--------|--------------|
| **Portion/Size Selector** | Web has variant selector (small/medium/large/family) in offer sheet. Mobile hardcodes `portionKey = 'default'` | Users cannot select portion size on mobile | Implement portion selector UI in dish_detail_screen.dart |
| **Fulfillment Mode Toggle** | Web has delivery/pickup toggle in offer sheet. Mobile hardcodes `fulfillmentMode = 'delivery'` | No pickup option on mobile | Add delivery/pickup toggle in dish detail |
| **Cook Offer Sheet** | Web shows full offer sheet with price placement, variant buttons. Mobile shows simplified cook cards with PageView | Different UX, less information | Align cook selection behavior |
| **Description Display** | Web shows longDescription with fallback chain. Mobile shows truncated description | Less dish info on mobile | Implement description fallback chain |
| **Cart Combine Toggle** | Web has cook-level timing preference (combined/separate). Mobile has per-cook toggle. | Different UI, same logic | Verify behavior matches |
| **Image Handling** | Web uses getAbsoluteUrl(). Mobile uses normalizeImageUrl() | Potential URL inconsistencies | Verify image URLs work identically |

---

## 3. MISSING ON MOBILE

| Feature | Web Implementation | Mobile Status | Notes |
|---------|-------------------|---------------|-------|
| **Messages/Inbox** | Real chat functionality with API calls | **NOT IMPLEMENTED** | messages_screen.dart has DUMMY DATA only |
| **Cook Profile Page** | Dedicated cook profile with full details | **NOT IMPLEMENTED** | Only shown in dish detail |
| **Settings Page** | Full settings with language, notifications, addresses | **PARTIAL** | Basic settings exist |
| **Favorites Page** | FoodieFavorites.js with toggle | EXISTS | Implemented but needs parity check |
| **Order Tracking** | Real-time order status | **PARTIAL** | order details screen exists |
| **Image Gallery** | Multiple images with thumbnails in offer sheet | **NOT IMPLEMENTED** | Only single image shown |
| **Fly Animation** | Item flies to cart on add | **NOT IMPLEMENTED** | No animation feedback |
| **Cutoff Time Logic** | Shows cutoff time for pickup orders | **NOT FULLY IMPLEMENTED** | Prep time shown but not cutoff logic |
| **Stock Display** | Shows "In stock: X" for variants | **NOT IMPLEMENTED** | Stock not shown to users |
| **Promo/Coupon Application** | Applies discount to order | **UI EXISTS** | UI implemented, logic unclear |

---

## 4. MOBILE BUGS DISCOVERED

| Bug | Location | Description |
|-----|----------|-------------|
| **Hardcoded Portion Key** | dish_detail_screen.dart:114 | `const portionKey = 'default'; // No portion selector in mobile yet` - Always sends 'default' |
| **Hardcoded Fulfillment Mode** | dish_detail_screen.dart:112 | `const fulfillmentMode = 'delivery'; // Default to delivery for mobile` - No pickup option |
| **Dummy Messages** | messages_screen.dart:45-50 | Hardcoded names/messages - not connected to real chat API |
| **API URL Hardcoding** | dish_detail_screen.dart:121 | `const apiBaseUrl = 'https://api.eltekkeya.com';` - Should use config |
| **Missing Image Fallback** | dish_detail_screen.dart:104-106 | Logic exists but may fail for missing images |

---

## 5. API DIFFERENCES

| Aspect | Web API | Mobile API | Risk |
|--------|---------|------------|------|
| **Endpoint Base** | Uses `api` wrapper with STATIC_BASE_URL | Hardcoded `https://api.eltekkeya.com` | URL mismatch potential |
| **Image Path Handling** | getAbsoluteUrl() prepends STATIC_BASE_URL | normalizeImageUrl() prepends api.eltekkeya.com | Different base URLs |
| **Cart Payload** | Sends offerId as dishId | Sends foodId as dishId | **POTENTIAL BUG** - reversed |
| **Cook Preferences** | Stored in localStorage as JSON | Stored in SharedPreferences | Different persistence |

### Cart Payload Issue (CRITICAL)
Web sends:
```javascript
dishId: item.offerId,  // Uses offerId as dishId
cookId: item.kitchenId,
```

Mobile sends:
```dart
foodId: widget.dishId,  // Uses original dishId
dishId: _dishData?.id,  // Different field
```

This mismatch could cause order processing issues.

---

## 6. FINAL PARITY CHECKLIST

### Critical (Must Fix)
- [ ] **FIX:** Implement portion selector in mobile dish detail
- [ ] **FIX:** Implement pickup/delivery toggle
- [ ] **FIX:** Connect messages to real chat API (remove dummy data)
- [ ] **FIX:** Align cart payload (offerId vs dishId) with web

### High Priority
- [ ] Add image gallery to mobile dish detail
- [ ] Implement stock display for variants
- [ ] Add cutoff time display for pickup
- [ ] Verify promo code application works end-to-end
- [ ] Align image URL handling between web and mobile

### Medium Priority
- [ ] Add fly animation on add to cart
- [ ] Implement cook profile page
- [ ] Align description/longDescription display
- [ ] Verify order tracking flow

### Low Priority
- [ ] Settings page parity
- [ ] Notification settings parity

---

## 7. DETAILED FLOW COMPARISON

### Home → Dish → Cart → Checkout

#### Web Flow:
1. **Home**: Featured dishes, categories, search
2. **Dish Tap**: Opens MenuDishModalHost with cook offers
3. **Cook Select**: Shows offer variants (portion selector)
4. **Fulfillment**: Toggle between delivery/pickup
5. **Add to Cart**: Fly animation, updates cart
6. **Cart**: Shows grouped items, combine toggle per cook
7. **Checkout**: Single page with address, coupon, payment, review

#### Mobile Flow:
1. **Home**: Featured dishes, categories, search
2. **Dish Tap**: Opens dish_detail_screen with PageView for cooks
3. **Cook Swipe**: PageView between cook variants
4. **No Portion**: Hardcoded 'default' portion
5. **Delivery Only**: Hardcoded 'delivery' mode
6. **Add to Cart**: No animation, updates cart
7. **Cart**: Shows grouped items, combine toggle per cook
8. **Checkout**: Single page similar to web

---

## 8. KEY FILES REFERENCE

### Web (client/web/src)
| File | Purpose |
|------|---------|
| pages/foodie/FoodieHome.js | Home page |
| pages/foodie/FoodieMenu.js | Menu page |
| pages/foodie/DishDetail.js | Dish detail |
| pages/foodie/FoodieCart.js | Cart with combine logic |
| pages/foodie/SinglePageCheckout.js | Checkout flow |
| components/foodie/MenuDishModalHost.js | Offer sheet with variants |
| utils/deliveryFeeCalculator.js | Delivery fee logic |
| contexts/CountryContext.js | Cart context |

### Mobile (mobile/foodie/lib)
| File | Purpose |
|------|---------|
| screens/main/home_screen.dart | Home page |
| screens/menu/menu_screen.dart | Menu page |
| screens/dish/dish_detail_screen.dart | Dish detail |
| screens/cart/cart_screen.dart | Cart with combine toggle |
| screens/checkout/single_page_checkout_screen.dart | Checkout |
| utils/delivery_fee_calculator.dart | Delivery fee logic |
| providers/cart_provider.dart | Cart state management |

---

## 9. ESTIMATED PARITY PROGRESS

| Category | Percentage |
|----------|------------|
| Core Shopping Flow | 70% |
| User Account | 50% |
| Notifications | 80% |
| Checkout | 75% |
| Search/Discovery | 60% |
| **Overall Estimate** | **~65-70%** |

---

## 10. RECOMMENDATIONS

1. **Immediate**: Fix cart payload mismatch (offerId vs dishId)
2. **Immediate**: Implement portion selector UI
3. **Immediate**: Add pickup/delivery toggle
4. **Short-term**: Connect messages to real API
5. **Medium-term**: Add image gallery, stock display
6. **Long-term**: Full feature parity pass

---

*This audit was generated through code analysis. Runtime verification recommended before making changes.*
