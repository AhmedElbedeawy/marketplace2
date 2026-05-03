# Cook Hub Data Flow - ACTUAL Root Cause Analysis

## FINDING: User Model Schema

```javascript
// User.js
role: {
  type: String,
  enum: ['foodie', 'admin', 'super_admin'],  // ← NO 'cook' role!
  default: 'foodie'
},
isCook: {
  type: Boolean,
  default: false
},
role_cook_status: {
  type: String,
  enum: ['none', 'pending', 'active', 'rejected', 'suspended'],
  default: 'none'
}
```

**A cook user has:**
- `role: 'foodie'` (always)
- `isCook: true`
- `role_cook_status: 'active'`
- A Cook document linked via `Cook.userId`

---

## IMMEDIATE ACTION REQUIRED

### Step 1: Run the Updated Diagnostic Script

```bash
cd "/Users/AhmedElbedeawy/Documents/Qoder backups/ElTekkeya Marketplace/server"
node test_cook_hub_data.js
```

This script now:
1. Finds ALL Cook documents (doesn't assume user role)
2. Checks what ID is actually stored in `subOrders.cook`
3. Determines if it's `Cook._id` or `User._id`
4. Shows exact data mismatch

---

## LIKELY SCENARIOS

### Scenario A: Orders use User._id (Most Likely)

**If diagnostic shows:**
- Orders have `subOrders.cook = User._id`
- But backend queries for `Cook._id`

**Fix:** Backend should NOT resolve Cook profile. Use `req.user._id` directly:

```javascript
// WRONG (current):
const cookProfile = await Cook.findOne({ userId: req.user._id });
const cookId = cookProfile._id;
const orders = await Order.find({ 'subOrders.cook': cookId });

// CORRECT:
const orders = await Order.find({ 'subOrders.cook': req.user._id });
```

---

### Scenario B: Orders use Cook._id

**If diagnostic shows:**
- Orders have `subOrders.cook = Cook._id`
- Cook profile exists

**Then:** Previous fix is correct, but Cook profile might not exist for the user.

---

### Scenario C: No Cook Documents

**If diagnostic shows:**
- Zero Cook documents in database
- Orders use User._id

**Fix:** System doesn't create Cook profiles yet. Backend must use User._id directly.

---

## Backend Fix Strategy

Based on diagnostic results, we'll update ALL 6 endpoints:

1. `/cook/sales-summary`
2. `/cook/sales-by-category`
3. `/cook/order-stats`
4. `/cook/traffic-stats`
5. `/cook/recent-activity`
6. `/cook/performance-stats`

**If Scenario A or C:** Remove Cook profile resolution, use `req.user._id` directly  
**If Scenario B:** Keep current fix, verify Cook profile creation

---

## Web Rating Flow Fix Status

✅ **Fixed:** Changed Card from `component={Link}` to `onClick` handler  
✅ **Fixed:** Added `e.stopPropagation()` to all rating buttons  
✅ **Result:** Dialog stays open, no navigation occurs

File: `client/web/src/pages/foodie/FoodieOrders.js`

---

## Next Steps

1. **RUN:** `node test_cook_hub_data.js`
2. **SHARE:** Output with me
3. **I WILL:** Apply exact fix based on real data structure
