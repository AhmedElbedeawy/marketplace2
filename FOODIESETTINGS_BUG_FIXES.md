# FoodieSettings Bug Fixes - Issues A, B, C

**Status:** Diagnostic complete, ready for implementation  
**Date:** March 02, 2026  
**Impact:** Cook profile photo, location, and Places autocomplete  

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue A: Photo Inconsistency (Avatar updates, dish/offers still old)

**Root Cause:** Frontend calls wrong endpoint for cooks

**Current Flow:**
```
FoodieSettings.handleSavePhoto()
  ↓
  PUT /api/users/profile-photo  ← WRONG for cooks!
  ↓
  Updates User.profilePhoto ONLY
  ↓
  Cook.profilePhoto NOT updated
  ↓
  Dishes/offers still show old photo (uses getCookImageUrl → cook.profilePhoto)
```

**Correct Flow:**
```
FoodieSettings.handleSavePhoto()
  ↓
  PUT /api/cooks/profile-photo  ← CORRECT for cooks
  ↓
  Updates Cook.profilePhoto AND User.profilePhoto (in one call)
  ↓
  Dishes/offers immediately show new photo
  ↓
  Header avatar also shows new photo
```

**Evidence:**
- File: `server/controllers/cookController.js` lines 468-493
- Endpoint: PUT /api/cooks/profile-photo
- Behavior: Updates both Cook.profilePhoto (line 476) and User.profilePhoto (line 487)
- Response: Returns updated Cook document with new photo

**Required Fix:**
- File: `client/web/src/pages/foodie/FoodieSettings.js` line 222
- Change: `PUT /users/profile-photo` → `PUT /cooks/profile-photo`
- Additional: Check if user is a cook before deciding which endpoint to call

---

### Issue B: Cook Location Not Loaded/Saved

**Root Cause Analysis:**

#### Part 1: Location Not Loading in Edit Dialog
**Status:** ✅ BACKEND WORKING, FRONTEND OK

**Why it might appear not to load:**
1. **Data is being loaded correctly:**
   - GET /users/profile returns location and city (lines 54-55 in userController.js)
   - FoodieSettings fetchProfile reads them (lines 122-124)
   - setCookEditData sets lat/lng/city (lines 118-125)

2. **Possible UI display issue:**
   - Location data loaded into `cookFormData` state
   - But not displayed as "initial location" in Edit Cook Profile dialog
   - User doesn't see pre-filled values, thinks they're missing
   - Solution: Add visual confirmation of loaded location

#### Part 2: Location Not Persisting After Edit
**Status:** ✅ BACKEND WORKING

**Why it works:**
- PUT /cooks/profile saves location to Cook model (line 308-311 in FoodieSettings)
- Response includes updated Cook with location
- GET /users/profile returns location on next fetch
- Location DOES persist after refresh

**Possible issues:**
- User edits map but doesn't click "Confirm Location" in map dialog
- User forgets to click "Save" in main Edit Cook Profile dialog
- No visual feedback that location was saved

#### Part 3: Edited Location Not Syncing to Address Book
**Status:** ⚠️ DESIGN DECISION NEEDED

**Current Behavior:**
- Cook.location stored in Cook model (kitchen location)
- User.defaultAddress stored in Address model (delivery address)
- These are TWO DIFFERENT THINGS
- Kitchen location ≠ Delivery address

**Options:**
1. **Keep Separate (Current)** - No sync
   - Cook.location = Kitchen location
   - Address Book = Customer delivery addresses
   - Clear separation of concerns
   - **No change needed**

2. **Sync to Address Book** - Create "Kitchen" entry
   - When cook saves location, create/update special Address with role: 'kitchen'
   - More work, potential confusion
   - **Not recommended**

**Decision:** Keep separate. Kitchen location is NOT a delivery address.

**Required Fix:**
- Add visual confirmation when location is loaded from Cook model
- Add success message when location is saved
- Clarify in UI that this is "Kitchen Location" not "Delivery Address"

---

### Issue C: Places Autocomplete Dropdown Under Map (Wrong Position)

**Root Cause:** DialogContent with `overflow: auto` + Autocomplete outside Map container

**Current Layout:**
```
Dialog
├─ DialogTitle
├─ DialogContent (overflow: auto) ← Problem: clips dropdown
│  └─ Flex Column
│     ├─ Autocomplete
│     │  └─ TextField
│     │  └─ .pac-container (renders to document.body, but visually appears under)
│     ├─ GoogleMap
│     └─ Coordinates
```

**Problem:**
- DialogContent clips overflow
- .pac-container z-index is 2000, but DOM positioning is still relative to map scroll
- Autocomplete wrapper from @react-google-maps/api doesn't anchor dropdown correctly to input

**Why it shows under map:**
- .pac-container IS above map in z-index (2000 vs default)
- But DOM rendering order + DialogContent scroll = visual displacement
- Dropdown appears to be at the bottom of visible area (near map)

**Fixed Layout (already implemented):**
- Search field positioned ABOVE GoogleMap container in flex column
- Dropdown should render below search field
- **But** TextField needs proper ref connection to Places API

**Current CSS Fix:**
```css
.pac-container {
  z-index: 2000 !important;
}
```

**Required Additional Fixes:**
1. Add `position: relative` to search input parent
2. Increase z-index further: 20000 (instead of 2000)
3. Ensure DialogContent allows overflow: visible for dropdown
4. Verify Autocomplete ref is properly connected (it is at line 868)

---

## ✅ IMPLEMENTATION PLAN

### Fix A: Photo Endpoint - CRITICAL
**File:** `client/web/src/pages/foodie/FoodieSettings.js`
**Change:** Line 222

```javascript
// BEFORE (WRONG)
const response = await api.put('/users/profile-photo', {
  profilePhoto: photoPreview
});

// AFTER (CORRECT)
const isCook = user?.role_cook_status !== 'none';
const endpoint = isCook ? '/cooks/profile-photo' : '/users/profile-photo';
const response = await api.put(endpoint, {
  profilePhoto: photoPreview
});
```

**Impact:** Photos will now sync properly for cooks

---

### Fix B: Location Feedback - UX IMPROVEMENT
**File:** `client/web/src/pages/foodie/FoodieSettings.js`

#### B1: Display Initial Location in Edit Dialog (lines 769-815)
Add visual indicator after city field:

```jsx
{cookFormData.city && (
  <Box sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: '4px' }}>
    <Typography variant="caption" color="success.dark" sx={{ fontWeight: 600 }}>
      ✓ Current Kitchen Location: {cookFormData.city} ({cookFormData.lat.toFixed(4)}, {cookFormData.lng.toFixed(4)})
    </Typography>
  </Box>
)}
```

#### B2: Success Message on Save (in handleCookSave)
Already implemented, but ensure message shows location was saved:

```javascript
setSuccess('Cook profile updated successfully (location saved)');
```

---

### Fix C: Places Autocomplete Positioning - CSS ENHANCEMENT
**File:** `client/web/src/index.css`

```css
/* Google Places dropdown positioning fix for MUI Dialogs */
.pac-container {
  z-index: 20000 !important;
  position: fixed !important;
  top: auto !important;
}

.pac-container-top {
  top: auto !important;
}

/* Prevent Dialog from clipping dropdown */
.MuiDialog-paper {
  overflow: visible !important;
}
```

---

## 📊 TESTING PROCEDURE

### Test A: Photo Sync (Cooks)
1. Create/login as cook
2. Go to Account → Edit mode
3. Click camera icon
4. Select new photo
5. Click "Save Photo"
6. **Check Network tab:** Should show PUT /api/cooks/profile-photo ✓
7. Refresh page
8. Go to Foodie app → View dishes from this cook
9. **Verify:** New photo shows in dish page ✓
10. Check offers list → **Verify:** New photo shows ✓
11. Check header avatar → **Verify:** Shows new photo ✓

### Test B: Location (Cooks)
1. Go to Account → Edit Cook Profile
2. **Verify:** City and coordinates are pre-filled from Cook model ✓
3. Open map picker
4. Select new location
5. Click "Confirm Location"
6. **Verify:** City field updated ✓
7. Click "Save" in main dialog
8. **Check Network:** PUT /api/cooks/profile includes location ✓
9. Refresh page
10. Open Account → Edit Cook Profile
11. **Verify:** Location still shows (persisted) ✓

### Test C: Places Autocomplete
1. Open Account → Edit Cook Profile
2. Click "Pick Kitchen Location on Map"
3. Start typing city name
4. **Verify:** Suggestions appear BELOW search field ✓
5. **Verify:** Suggestions not hidden under map ✓
6. **Verify:** Can click suggestion to select ✓
7. **Verify:** Map marker moves to selected location ✓

---

## 📋 FILES TO MODIFY

| File | Lines | Issue | Fix |
|------|-------|-------|-----|
| FoodieSettings.js | 222 | Photo endpoint wrong | Use /cooks/profile-photo for cooks |
| FoodieSettings.js | 817-825 | No location feedback | Add visual confirmation of loaded location |
| FoodieSettings.js | handleCookSave | Success message | Mention location saved |
| index.css | 22-24 | Dropdown positioning | Increase z-index to 20000, add position fixes |

---

## 🚀 PRIORITY

1. **CRITICAL (Fix A):** Photo endpoint - cooks' photos not syncing to dishes/offers
2. **HIGH (Fix C):** Autocomplete positioning - UX issue, may hide suggestions
3. **MEDIUM (Fix B):** Location feedback - works but confusing UI

