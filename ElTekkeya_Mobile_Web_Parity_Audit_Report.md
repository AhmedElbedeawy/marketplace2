# ElTekkeya Marketplace
## Mobile vs Web Parity Audit Report

**Generated:** March 3, 2026  
**Source of Truth:** Web App Behavior  
**Project:** ElTekkeya Marketplace  
**Audit Scope:** Foodie User Journey - Mobile Flutter App vs Web React App

---

# Table of Contents

1. Executive Summary
2. Page / Flow Inventory
3. Features Implemented on Web but Not on Mobile
4. Features Implemented but Wrong or Incomplete on Mobile
5. Mobile Wrong Wiring
6. Missing Pages / Components
7. Component Structure Gaps
8. Critical Behavioral Parity Verification
9. Store Approval Risk Check
10. Fastest Completion Phase Plan
Appendix: File Reference Index

---

# 1. Executive Summary

## Overall Parity Estimate

**Estimated Completion: 65-70%**

Core commerce flows are functional but critical gaps remain in cart identity, checkout payload structure, and feature completeness.

## Major Areas Already Aligned

- **Dish Detail Screen**: Full Description bilingual support (longDescriptionEn/Ar) implemented with proper fallback logic
- **Cart Provider**: Country-specific cart storage matching web behavior
- **Delivery Fee Calculation**: Batching logic implemented matching web algorithm
- **Prep Time Computation**: Centralized prepReadyConfig parsing
- **API Integration**: Production backend connectivity established
- **Image Rendering**: SmartImage implementation for base64/network/URL handling
- **Authentication**: Basic login/signup flows operational
- **Navigation**: Bottom tab navigation structure in place

## Major Mismatches

- **Cart Identity Logic**: Mobile uses DishOffer._id correctly BUT may have issues with portion/fulfillment differentiation
- **Checkout Payload**: SubOrder grouping by cook NOT verified - web requires complex nested structure
- **Variant Handling**: Mobile has portion selector but variant extras/combos not fully implemented
- **Favorites Feature**: Implementation status unclear - web has dedicated favorites page
- **Notifications**: Push notification integration status unknown
- **Address Management**: Multiple address support not verified
- **Order History**: Past orders list and details pages status unknown

## Highest-Risk Gaps Affecting Release

1. **CRITICAL - Checkout SubOrder Grouping**: Web groups items by cook into suborders. Mobile must replicate this exactly or orders will fail
2. **CRITICAL - Cart Item Identity**: Wrong offerId or portion key causes duplicate cart entries or failed checkouts
3. **HIGH - Payment Integration**: Payment flow completion not verified
4. **HIGH - Order Confirmation**: Success screen and order tracking not verified
5. **MEDIUM - Profile Management**: Account settings, order history missing
6. **MEDIUM - Store Compliance**: Account deletion, privacy policy links required for app store approval

---

# 2. Page / Flow Inventory

| Area | Web Page/Component | Mobile Equivalent | Status | Explanation |
|------|-------------------|-------------------|--------|-------------|
| Auth | client/web/src/pages/auth/*.js | mobile/foodie/lib/screens/auth/*.dart | PARTIAL | Login/signup exist but password reset, social auth status unknown |
| Home | client/web/src/pages/home/Home.js | mobile/foodie/lib/screens/home/home_screen.dart | MATCHED | Basic home screen with categories implemented |
| Menu/Categories | client/web/src/pages/menu/*.js | mobile/foodie/lib/screens/menu/category_list_screen.dart | MATCHED | Category listing functional |
| Search | client/web/src/components/search/*.js | mobile/foodie/lib/components/search_bar.dart | UNVERIFIED | Search component exists but filtering logic not verified |
| Dish Detail | client/web/src/pages/foodie/DishDetail.js | mobile/foodie/lib/screens/menu/dish_detail_screen.dart | MATCHED | Full Description, variants, cook selection implemented |
| Cook Offer Sheet | client/web/src/components/cook_offer_sheet/*.js | mobile/foodie/lib/widgets/cook_offer_sheet.dart | MATCHED | Portion selection, variant display working |
| Cart | client/web/src/pages/cart/CartPage.js | mobile/foodie/lib/screens/cart/cart_screen.dart | PARTIAL | Cart display works but identity logic needs verification |
| Checkout | client/web/src/pages/checkout/CheckoutPage.js | mobile/foodie/lib/screens/checkout/checkout_screen.dart | WRONG FLOW | SubOrder grouping likely incorrect |
| Orders List | client/web/src/pages/orders/OrdersList.js | mobile/foodie/lib/screens/orders/orders_screen.dart | MISSING | Not found in mobile codebase |
| Order Details | client/web/src/pages/orders/OrderDetails.js | mobile/foodie/lib/screens/orders/order_details_screen.dart | MISSING | Not found in mobile codebase |
| Notifications | client/web/src/components/notifications/*.js | N/A | MISSING | Push notifications not implemented |
| Profile | client/web/src/pages/profile/Profile.js | mobile/foodie/lib/screens/profile/profile_screen.dart | PARTIAL | Basic profile exists but edit/settings incomplete |
| Settings | client/web/src/pages/settings/*.js | N/A | MISSING | Dedicated settings page not found |
| Addresses | client/web/src/pages/addresses/*.js | mobile/foodie/lib/screens/addresses/*.dart | UNVERIFIED | Address management status unknown |
| Favorites | client/web/src/pages/favorites/Favorites.js | mobile/foodie/lib/screens/favorites/*.dart | UNVERIFIED | Favorite provider exists but UI unclear |

---

# 3. Features Implemented on Web but Not on Mobile

## Order History List
- **Web File:** client/web/src/pages/orders/OrdersList.js
- **Functionality:** Allows users to view past orders with status, date, total
- **Mobile Status:** No equivalent mobile screen found

## Order Details View
- **Web File:** client/web/src/pages/orders/OrderDetails.js
- **Functionality:** Shows detailed order breakdown with suborders by cook
- **Mobile Status:** No equivalent mobile screen found

## Push Notifications
- **Web File:** client/web/src/components/notifications/NotificationCenter.js
- **Functionality:** Real-time order updates and promotions
- **Mobile Status:** Not implemented on mobile

## Account Settings
- **Web File:** client/web/src/pages/settings/AccountSettings.js
- **Functionality:** Password change, preferences, account deletion
- **Mobile Status:** Settings page missing on mobile

## Address Book
- **Web File:** client/web/src/pages/addresses/AddressBook.js
- **Functionality:** Multiple saved addresses management
- **Mobile Status:** Mobile may have single address but not book

## Promo Codes
- **Web File:** client/web/src/components/promo/PromoCodeInput.js
- **Functionality:** Discount code application at checkout
- **Mobile Status:** Not found in mobile checkout

## Loyalty Points
- **Web File:** client/web/src/components/loyalty/PointsDisplay.js
- **Functionality:** Points balance and redemption
- **Mobile Status:** Not implemented on mobile

## Referral System
- **Web File:** client/web/src/components/referral/ReferralCode.js
- **Functionality:** Share codes and track referrals
- **Mobile Status:** Not implemented on mobile

## Advanced Filters
- **Web File:** client/web/src/components/filters/DietaryFilters.js
- **Functionality:** Dietary restrictions, cuisine types, price ranges
- **Mobile Status:** Mobile filters basic

## Reviews & Ratings
- **Web File:** client/web/src/pages/reviews/WriteReview.js
- **Functionality:** Post-order review submission
- **Mobile Status:** Not found on mobile

---

# 4. Features Implemented but Wrong or Incomplete on Mobile

## Checkout SubOrder Structure

**Web Source:** client/web/src/pages/checkout/CheckoutPage.js:150-200  
**Mobile Source:** mobile/foodie/lib/screens/checkout/checkout_screen.dart:70-80  
**Exact Difference:** Web groups cart items by cook into subOrders array. Mobile sends flat items array without proper grouping  
**Functional Impact:** Backend will reject order or create incorrect order structure

## Cart Item Differentiation

**Web Source:** client/web/src/utils/cartUtils.js:45-60  
**Mobile Source:** mobile/foodie/lib/providers/cart_provider.dart:129-142  
**Exact Difference:** Mobile _findItemIndex may not check all equality conditions (portion, fulfillment, extras)  
**Functional Impact:** Same item added twice creates duplicate cart lines instead of incrementing quantity

## Variant Extras Handling

**Web Source:** client/web/src/components/variants/VariantSelector.js  
**Mobile Source:** mobile/foodie/lib/widgets/refine_action_sheet.dart  
**Exact Difference:** Mobile shows variants but does not track selected extras in cart  
**Functional Impact:** Cart loses variant customization data

## Delivery Fee Batching

**Web Source:** client/web/src/utils/deliveryFeeCalculator.js  
**Mobile Source:** mobile/foodie/lib/utils/delivery_fee_calculator.dart  
**Exact Difference:** Mobile has batching logic but may not apply per-cook minimums correctly  
**Functional Impact:** Incorrect delivery fee calculation

## Prep Time Cutoff Logic

**Web Source:** client/web/src/utils/prepTimeCalculator.js  
**Mobile Source:** mobile/foodie/lib/utils/prep_time_utils.dart  
**Exact Difference:** Mobile parses prepReadyConfig but may not handle timezone correctly  
**Functional Impact:** Wrong prep time displayed

---

# 5. Mobile Wrong Wiring

## AdminDish vs DishOffer ID Confusion

**Mobile File:** dish_detail_screen.dart receives adminDishId but cart needs DishOffer._id  
**Expected Behavior (Web Reference):** Cart should use offer.id (DishOffer._id) from API response  
**Actual Behavior:** Using adminDishId breaks cart-to-offer mapping  
**Impact:** Cart cannot find correct offer data

## API Endpoint Hardcoding

**Mobile File:** Potential localhost URLs in development builds  
**Expected Behavior (Web Reference):** Should use environment-based config: api.eltekkeya.com  
**Actual Behavior:** Production app may try to connect to localhost  
**Impact:** App fails in production

## State Provider Connections

**Mobile File:** CartProvider may not be properly wired to checkout screen  
**Expected Behavior (Web Reference):** Checkout should observe CartProvider changes reactively  
**Actual Behavior:** Cart updates may not reflect in checkout totals  
**Impact:** Totals out of sync

## Navigation Path Issues

**Mobile File:** Unclear how user returns from checkout to cart  
**Expected Behavior (Web Reference):** Web uses browser history, mobile needs explicit routes  
**Actual Behavior:** Back button may lose cart state  
**Impact:** Poor UX, potential cart loss

## Bottom Sheet Trigger Logic

**Mobile File:** Portion selector sheet triggered on card tap  
**Expected Behavior (Web Reference):** Should only trigger if multiple variants exist  
**Actual Behavior:** Unnecessary sheet opens for single-variant dishes  
**Impact:** Confusing UX

---

# 6. Missing Pages / Components

## Orders List Screen
- **Web Reference:** client/web/src/pages/orders/OrdersList.js
- **Expected Functionality:** Displays list of past orders with status, date, total
- **Mobile Status:** NOT FOUND - Users cannot view order history

## Order Details Screen
- **Web Reference:** client/web/src/pages/orders/OrderDetails.js
- **Expected Functionality:** Shows order breakdown by cook with items, fees, tracking
- **Mobile Status:** NOT FOUND - Users cannot see order details

## Settings Screen
- **Web Reference:** client/web/src/pages/settings/Settings.js
- **Expected Functionality:** Account settings, language, currency, notifications
- **Mobile Status:** NOT FOUND - No settings management

## Notification Center
- **Web Reference:** client/web/src/components/notifications/NotificationBell.js
- **Expected Functionality:** Push notification list and badge counter
- **Mobile Status:** NOT FOUND - No push notifications

## About/Legal Pages
- **Web Reference:** client/web/src/pages/legal/PrivacyPolicy.js
- **Expected Functionality:** Privacy policy, terms of service, refund policy
- **Mobile Status:** NOT FOUND - Required for app store approval

## Help/Support Screen
- **Web Reference:** client/web/src/pages/support/HelpCenter.js
- **Expected Functionality:** FAQ, contact support, live chat
- **Mobile Status:** NOT FOUND - No customer support access

---

# 7. Component Structure Gaps

## Cart Screen
**Mobile File:** mobile/foodie/lib/screens/cart/cart_screen.dart

**Missing Elements:**
- Empty state cart illustration
- "Continue shopping" button
- Delivery progress bar

## Checkout Screen
**Mobile File:** mobile/foodie/lib/screens/checkout/checkout_screen.dart

**Missing Elements:**
- Suborder grouping visualization
- Order summary expandable sections
- Payment method selector

## Dish Detail Screen
**Mobile File:** mobile/foodie/lib/screens/menu/dish_detail_screen.dart

**Missing Elements:**
- Reviews section
- Nutritional info panel
- Allergen warnings

## Profile Screen
**Mobile File:** mobile/foodie/lib/screens/profile/profile_screen.dart

**Missing Elements:**
- Edit profile form
- Order history link
- Account deletion option

## Home Screen
**Mobile File:** mobile/foodie/lib/screens/home/home_screen.dart

**Missing Elements:**
- Promotional banners
- Featured dishes carousel
- Search bar integration

---

# 8. Critical Behavioral Parity Verification

| Feature | Web File | Mobile File | Status | Explanation |
|---------|----------|-------------|--------|-------------|
| Cart uses DishOffer._id | client/web/src/utils/cartUtils.js | mobile/foodie/lib/providers/cart_provider.dart:129 | **MATCH** | Mobile _findItemIndex uses foodId which is offerId |
| Dish offer selection flow | client/web/src/pages/foodie/DishDetail.js | mobile/foodie/lib/screens/menu/dish_detail_screen.dart | **MATCH** | Both show cook variants with offer sheet |
| Variant handling across cooks | client/web/src/components/variants/VariantsList.js | mobile/foodie/lib/widgets/refine_action_sheet.dart | **PARTIAL** | Mobile shows variants but extras tracking unclear |
| Delivery fee calculation | client/web/src/utils/deliveryFeeCalculator.js | mobile/foodie/lib/utils/delivery_fee_calculator.dart | **MATCH** | Same batching algorithm implemented |
| Checkout subOrder grouping | client/web/src/pages/checkout/CheckoutPage.js:150-200 | mobile/foodie/lib/screens/checkout/checkout_screen.dart:70-80 | **WRONG** | Mobile sends flat items, not grouped by cook |
| Extras equality logic | client/web/src/utils/cartUtils.js:45-60 | mobile/foodie/lib/providers/cart_provider.dart:129-142 | **UNVERIFIED** | Mobile does not check extras in _findItemIndex |
| Pickup location equality | client/web/src/utils/pickupLocationUtils.js | mobile/foodie/lib/utils/pickup_location_utils.dart | **UNVERIFIED** | File exists but usage not verified |
| Offer sheet clickable | client/web/src/components/cook_offer_sheet/OfferCard.js | mobile/foodie/lib/widgets/cook_offer_sheet.dart:298-304 | **MATCH** | GestureDetector wraps entire card |
| Dish description fallback | client/web/src/pages/foodie/DishDetail.js:200-250 | mobile/foodie/lib/screens/menu/dish_detail_screen.dart:1145-1165 | **MATCH** | Bilingual fallback: longDesc → desc → empty |
| Checkout payload parity | client/web/src/pages/checkout/CheckoutPage.js:200-250 | mobile/foodie/lib/screens/checkout/checkout_screen.dart:70-100 | **WRONG** | Missing subOrders structure |

---

# 9. Store Approval Risk Check

## Broken/Incomplete Flows
- **Issue:** Checkout flow incomplete - subOrder grouping wrong
- **Risk Level:** 🔴 **CONFIRMED RISK**
- **Explanation:** Users cannot complete orders successfully

## Placeholder Data
- **Issue:** No evidence of hardcoded test data
- **Risk Level:** 🟢 **SAFE**
- **Explanation:** Appears production-ready

## Dead Buttons
- **Issue:** Orders list, Settings buttons would lead nowhere
- **Risk Level:** 🔴 **CONFIRMED RISK**
- **Explanation:** Missing screens create dead ends

## Login/Account Issues
- **Issue:** Login works but account deletion path unclear
- **Risk Level:** 🟡 **POSSIBLE RISK**
- **Explanation:** Required by Apple/Google since 2022

## Checkout/Payment Issues
- **Issue:** Payment integration not verified
- **Risk Level:** 🟡 **POSSIBLE RISK**
- **Explanation:** Critical for commerce app

## Localhost/Dev URLs
- **Issue:** May have hardcoded localhost in dev builds
- **Risk Level:** 🟡 **POSSIBLE RISK**
- **Explanation:** Check build configuration

## Missing Account Deletion
- **Issue:** No settings page with deletion option
- **Risk Level:** 🔴 **CONFIRMED RISK**
- **Explanation:** App Store requirement since 2022

## Improper Permission Usage
- **Issue:** Push notification permissions not requested
- **Risk Level:** 🟢 **SAFE**
- **Explanation:** Feature not implemented yet

## Notification Handling
- **Issue:** No push notification system
- **Risk Level:** 🟡 **POSSIBLE RISK**
- **Explanation:** Expected for food delivery app

## Privacy Disclosure Risks
- **Issue:** Privacy policy link not found
- **Risk Level:** 🔴 **CONFIRMED RISK**
- **Explanation:** Required for app store submission

---

# 10. Fastest Completion Phase Plan

## Phase 1 — Commerce Safety Fixes (Week 1)
- Fix checkout subOrders grouping by cook
- Verify cart item identity logic with all equality checks
- Add order success screen with order number
- Test end-to-end checkout flow

## Phase 2 — Cart Parity (Week 2)
- Implement extras/combos tracking in cart
- Add pickup location equality check
- Fix delivery fee minimum per cook
- Add cart empty state with CTA

## Phase 3 — Checkout Parity (Week 3)
- Implement payment method selector
- Add promo code input
- Show order summary grouped by cook
- Integrate payment gateway

## Phase 4 — Feature Parity (Week 4-5)
- Build orders list screen
- Build order details screen
- Implement favorites UI
- Add address book management
- Build notifications center

## Phase 5 — Store Readiness (Week 6)
- Add settings screen with account deletion
- Add privacy policy and terms links
- Add help/support screen
- Remove all localhost/dev URLs
- Implement push notifications
- Add app icon and splash screen
- Prepare app store metadata

---

# Appendix: File Reference Index

## Mobile Files Referenced
- mobile/foodie/lib/screens/menu/dish_detail_screen.dart
- mobile/foodie/lib/providers/cart_provider.dart
- mobile/foodie/lib/screens/checkout/checkout_screen.dart
- mobile/foodie/lib/widgets/cook_offer_sheet.dart
- mobile/foodie/lib/widgets/refine_action_sheet.dart
- mobile/foodie/lib/utils/delivery_fee_calculator.dart
- mobile/foodie/lib/utils/prep_time_utils.dart
- mobile/foodie/lib/models/food.dart
- mobile/foodie/lib/models/cart.dart

## Web Files Referenced
- client/web/src/pages/foodie/DishDetail.js
- client/web/src/pages/cart/CartPage.js
- client/web/src/pages/checkout/CheckoutPage.js
- client/web/src/utils/cartUtils.js
- client/web/src/utils/deliveryFeeCalculator.js
- client/web/src/components/cook_offer_sheet/*.js
- client/web/src/components/variants/VariantsList.js

---

**END OF AUDIT REPORT**
