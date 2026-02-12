# MESSAGING PREFILL & ROUTING - COMPLETE FIX

## THREE COORDINATED BUGS IDENTIFIED:

### 1. Empty "To" Field (Contact Cook)
**Root Cause**: Line 300 typo - `source` reads from `'userId'` instead of `'source'`
```javascript
const source = searchParams.get('userId');  // ❌ WRONG
const source = searchParams.get('source');  // ✅ CORRECT
```

### 2. Wrong Recipient (Contact Foodie shows cook himself)
**Root Cause**: CANNOT REPRODUCE with current code
- Navigation passes `currentOrder.customerId` correctly (line 355)
- resolveAndPrefillUser receives correct userId
- Backend resolve-user endpoint should return correct user

**Need to verify**: Is `currentOrder.customerId` actually the foodie's ID or is it being set incorrectly during order transformation?

### 3. Missing Header (Contact Foodie from Cook Hub)
**Root Cause**: `/message-center` route has NO layout wrapper
- Line 152-156 in App.js wraps in ProtectedRoute only
- No FoodieHeader, no Sidebar, no layout context

**Solution**: Both routes should render within appropriate layout or MessageCenter should have its own header

---

## FIXES TO IMPLEMENT:

### Fix 1: Correct source param reading
File: `client/web/src/pages/MessageCenter.js:300`
```javascript
const source = searchParams.get('source');
```

### Fix 2: Add MessageCenter header/layout
Option A: MessageCenter renders its own header
Option B: Move both routes into foodie layout group

### Fix 3: Debug customerId
Add console.log to verify customerId is correct foodie ID

---

## VERIFICATION STEPS:

1. Click Contact Cook → Check console for:
   - URL: `/foodie/messages?userId=COOK_ID&source=contact_cook`
   - Resolved user object
   - composeTo value

2. Click Contact Foodie → Check console for:
   - URL: `/message-center?userId=FOODIE_ID`
   - currentOrder.customerId value
   - Resolved user object
   - composeTo value

3. Both routes → Check header renders correctly
