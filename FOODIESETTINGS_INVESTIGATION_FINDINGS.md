# FoodieSettings Stabilization - Investigation Findings

**Date:** March 02, 2026
**Status:** Investigation COMPLETE - Ready for implementation

---

## ✅ COMPLETED: Map Dialog & Address UI Fixes

### Fix #1: Map Dialog Layout ✅ IMPLEMENTED
- **Change:** Restructured DialogContent from absolute positioning to vertical flex layout
- **Result:** Search field now appears ABOVE map (not overlaid)
- **Expected Behavior:** Autocomplete dropdown will render directly below search field
- **Code Location:** Lines 814-879 (DialogContent and map layout)

### Fix #2: Address Block Removal ✅ IMPLEMENTED
- **Change:** Deleted 25-line address display block from Personal Information section
- **Result:** Default delivery address no longer shows in "Personal Information"
- **Location:** Was lines 485-509, now removed
- **Note:** Address Book section still available below for address management

---

## 🔍 INVESTIGATION: COOK LOCATION PERSISTENCE

### Finding #1: Cook Location Storage ✅ VERIFIED
**Location:** Stored in **Cook model** (NOT in User model)

**Evidence:**
- **File:** `server/models/Cook.js` (lines 115-119)
- **Fields:** 
  - `location: { lat: Number, lng: Number }`
  - `city: String`
- **Authority:** Cook model is the source of truth for location/city

### Finding #2: GET /users/profile Returns Location ✅ VERIFIED
**Response:** YES - Includes cook location and city

**Evidence:**
- **File:** `server/controllers/userController.js` (lines 8-60)
- **Logic:** Lines 32-36 fetch Cook model if user is a cook
- **Response:** Lines 54-57 include:
  ```json
  "location": cookProfile?.location || null,
  "city": cookProfile?.city || null,
  "countryCode": cookProfile?.countryCode || null
  ```
- **Status:** ✅ Frontend can read location from GET /users/profile

### Finding #3: PUT /cooks/profile Response ⚠️ INCOMPLETE
**Issue:** Response returns `updatedUser` only, not Cook data

**Current Code:**
- **File:** `server/controllers/cookController.js` (lines 197-201)
- **Response:**
  ```json
  {
    "success": true,
    "message": "Cook profile updated successfully",
    "data": updatedUser  // ← User model only, no Cook fields
  }
  ```
- **Problem:** Response doesn't include returned `location` and `city`
- **Impact:** Frontend doesn't get confirmation that location was saved
- **Fix Required:** Return Cook-inclusive response after PUT /cooks/profile

### Finding #4: Frontend Expects Location in Response ✅ VERIFIED
**File:** `client/web/src/pages/foodie/FoodieSettings.js` (lines 106-132)

**fetchProfile logic:**
```javascript
if (data.role_cook_status !== 'none') {
  setCookEditData({
    // ... other fields ...
    city: data.city || '',
    lat: data.location?.lat || 24.7136,
    lng: data.location?.lng || 46.6753
  });
}
```

**Status:** Frontend code expects `data.location` and `data.city` in GET response ✅ WORKS
**Status:** Frontend expects these in PUT response ⚠️ NOT RETURNED

---

## 🔍 INVESTIGATION: PROFILE PHOTO RENDERING

### Finding #5: Avatar Rendering ✅ VERIFIED
**File:** `client/web/src/pages/foodie/FoodieSettings.js` (lines 403-416)

**Code:**
```jsx
<Avatar
  src={user?.profilePhoto}
  sx={{...}}
>
  {!user?.profilePhoto && formData.name.charAt(0).toUpperCase()}
</Avatar>
```

**Status:** 
- ✅ Reads from `user.profilePhoto` 
- ✅ Supports base64 data URLs (Avatar/Image component handles data: URIs)
- ✅ Shows fallback initial if no photo

### Finding #6: photoPreview State ✅ VERIFIED
**File:** `client/web/src/pages/foodie/FoodieSettings.js` (line 98)

**Current State:**
```javascript
const [photoPreview, setPhotoPreview] = useState(null);
```

**Status:**
- ✅ State exists to hold preview
- ✅ Can display base64 data URL
- ⚠️ No save handler implemented yet
- ⚠️ Preview not connected to Avatar rendering
- ⚠️ No localStorage sync on photo change

### Finding #7: localStorage vs State ⚠️ ANALYZED

**Current Flow:**
1. User selects photo via file picker
2. `handlePhotoSelect()` creates base64 and sets `photoPreview` state
3. No save handler exists
4. Photo never saved to backend
5. `user` state never updated
6. localStorage never updated
7. Avatar continues to show old photo (from `user.profilePhoto`)

**Problem:** Preview state is separate from `user` state
- `Avatar src={user?.profilePhoto}` reads from `user` state
- `setPhotoPreview()` updates separate state
- Avatar never shows preview because it reads from different state variable

### Finding #8: Base64 Rendering ✅ CONFIRMED WORKS

**Evidence:**
- Avatar component (Material-UI) supports `src` prop with data URLs
- Browser's `<img>` tag handles `data:image/png;base64,...` natively
- Frontend already stores/displays photos as base64:
  - User.profilePhoto stored as base64
  - Cook.profilePhoto stored as base64
  - getCookImageUrl() handles base64 data URLs
- Other components (CookRegistration, etc.) use same base64 approach

**Limitation:** localStorage has size limits
- Max: ~5-10MB per domain
- Base64 overhead: ~33% larger than binary
- Current practice: Single photo as base64 is safe
- Risk: Multiple users' photos in localStorage could overflow

---

## 🚨 CRITICAL ISSUES FOUND

### Issue A: PUT /cooks/profile Doesn't Return Location
**Severity:** HIGH - Blocks verification that location was saved

**Current Behavior:**
```
PUT /cooks/profile
  ↓ (saves to Cook model)
Response: { data: updatedUser }  ← Doesn't include location
  ↓
Frontend doesn't confirm location persisted
  ↓
After refresh, GET /users/profile returns location ✅ (works, but confusing)
```

**Fix Required:**
Modify response to include Cook data:
```javascript
// After updating Cook model, fetch and return it
const updatedCook = await Cook.findOne({ userId });
res.status(200).json({
  success: true,
  message: 'Cook profile updated successfully',
  data: updatedCook  // ← Include Cook model with location/city
});
```

### Issue B: photoPreview Not Rendered
**Severity:** MEDIUM - Preview shows but not in avatar

**Root Cause:**
- Avatar reads from `user?.profilePhoto` (state from GET request)
- `photoPreview` is separate state (from file selection)
- Avatar never displays preview

**Solution Options:**
1. **Update `user` state when preview selected** (Recommended)
   ```javascript
   setPhotoPreview(preview);
   setUser(prev => ({ ...prev, profilePhoto: preview }));
   ```

2. **Render preview separately**
   ```jsx
   {photoPreview && <Avatar src={photoPreview} />}
   {!photoPreview && <Avatar src={user?.profilePhoto} />}
   ```

### Issue C: No Photo Save Handler
**Severity:** MEDIUM - Photo selected but never persisted

**Current:** `handlePhotoSelect()` creates preview only
**Missing:** `handleSavePhoto()` to persist to backend

---

## 📊 READINESS MATRIX

| Component | Status | Evidence | Action |
|-----------|--------|----------|--------|
| Location Storage (Cook model) | ✅ Ready | Cook.js has location + city | Use as-is |
| GET /users/profile Returns Location | ✅ Ready | userController.js lines 54-57 | Use as-is |
| PUT /cooks/profile Saves Location | ✅ Ready | cookController.js line 185 | Use as-is |
| PUT /cooks/profile Returns Location | ⚠️ Broken | Only returns updatedUser | **MUST FIX** |
| Base64 Photo Rendering | ✅ Ready | Avatar supports data: URIs | Use as-is |
| Photo Preview Display | ⚠️ Partial | Preview state exists, not rendered | **MUST CONNECT** |
| Photo Save Handler | ❌ Missing | Not implemented | **MUST IMPLEMENT** |
| localStorage Photo Sync | ❌ Missing | Not implemented | **MUST IMPLEMENT** |

---

## 🎯 NEXT STEPS - BEFORE IMPLEMENTATION

### Step 1: Fix PUT /cooks/profile Response
**File:** `server/controllers/cookController.js` (lines 197-201)

**Current:**
```javascript
res.status(200).json({ 
  success: true, 
  message: 'Cook profile updated successfully',
  data: updatedUser  // ← Only User model
});
```

**Change to:**
```javascript
const updatedCook = await Cook.findOne({ userId });
res.status(200).json({ 
  success: true, 
  message: 'Cook profile updated successfully',
  data: updatedCook  // ← Include Cook model with location
});
```

**Test:** After PUT /cooks/profile, response must include `location` and `city`

### Step 2: Connect Photo Preview to Avatar
**File:** `client/web/src/pages/foodie/FoodieSettings.js`

**When preview selected (in handlePhotoSelect):**
```javascript
setPhotoPreview(preview);
setUser(prev => ({ ...prev, profilePhoto: preview }));
```

**Result:** Avatar will show selected photo immediately

### Step 3: Implement handleSavePhoto()
**File:** Same file

**Required:**
- Call PUT `/users/profile-photo` 
- Update localStorage
- Dispatch custom event for header sync
- Confirm save success

### Step 4: Add Save/Cancel Buttons
**When photoPreview !== null, show:**
- "Save Photo" button → calls handleSavePhoto()
- "Cancel" button → clears preview

---

## 📋 VERIFICATION CHECKLIST

After implementing above steps:

- [ ] PUT /cooks/profile response includes location + city
- [ ] Photo preview displays in avatar immediately when selected
- [ ] "Save Photo" button appears when preview selected
- [ ] Photo saves to backend via PUT /users/profile-photo
- [ ] localStorage updated with new photo
- [ ] Header avatar syncs via custom event
- [ ] Location persists after page refresh
- [ ] Map dialog shows search above map (not overlaid)
- [ ] Address removed from Personal Information section

---

## 🚀 READY TO PROCEED

All investigation complete. Backend response fix and photo handler implementation are straightforward.

No architectural changes needed. All fixes are isolated to:
- `server/controllers/cookController.js` (1 response fix)
- `client/web/src/pages/foodie/FoodieSettings.js` (photo handlers + state updates)

