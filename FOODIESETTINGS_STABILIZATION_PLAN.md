# FoodieSettings Map + Photo + Location Persistence - Stabilization Plan

**Status:** Diagnostic complete, fixes ready to implement
**File:** `client/web/src/pages/foodie/FoodieSettings.js`
**Scope:** 5 issues identified, all fixable

---

## 📋 ISSUE #1: Autocomplete Dropdown Appears Under Map

### Current Layout (Lines 824-849)
```
Dialog
├─ DialogContent (p: 0)
│  └─ Box (position: relative)
│     ├─ Box (position: absolute, top: 10, z-index: 1) ← Search bar overlay
│     │  └─ TextField inside Autocomplete
│     └─ GoogleMap (400px height)
```

### Problem
- Search bar positioned **absolutely** over map with `z-index: 1`
- Map renders **below** the absolute positioned box
- Places `.pac-container` renders inside the `<Box>` flow
- Dropdown appears to be "under" the map (actually behind in stacking order)

### Solution
**Restructure to: Search → Map → Footer**

```jsx
<DialogContent dividers sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
  {isLoaded ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      {/* 1. Search Field - Top */}
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <TextField
          ref={cookMapSearchInputRef}
          fullWidth
          placeholder={...}
          variant="outlined"
          size="small"
          sx={{ bgcolor: 'white', borderRadius: '4px' }}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'gray', mr: 1 }} /> }}
        />
      </Autocomplete>

      {/* 2. Map - Middle */}
      <GoogleMap ... />

      {/* 3. Coordinates Footer - Bottom */}
      <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderTop: '1px solid #eee' }}>
        <Typography variant="caption">...</Typography>
      </Box>
    </Box>
  ) : <CircularProgress />}
</DialogContent>
```

### Benefits
- ✅ Dropdown renders **directly under** search field
- ✅ No z-index conflicts
- ✅ Cleaner, more intuitive UI
- ✅ Better accessibility

---

## 📋 ISSUE #2: Location Not Persisting After Save

### Root Cause Analysis

**Frontend - handleCookSave (Lines 298-328):**
```javascript
const response = await api.put('/cooks/profile', {
  storeName: cookFormData.storeName,
  expertise: cookFormData.expertise,
  city: cookFormData.city,
  location: {
    lat: cookFormData.lat,
    lng: cookFormData.lng
  },
  questionnaire: { fulfillmentMethods: cookFormData.fulfillmentMethods }
});
```
✅ Payload is CORRECT

**Frontend - fetchProfile (Lines 106-132):**
```javascript
if (data.role_cook_status !== 'none') {
  setCookEditData({
    storeName: data.storeName || '',
    expertise: Array.isArray(data.expertise) ? data.expertise : [...],
    fulfillmentMethods: data.questionnaire?.fulfillmentMethods || [],
    city: data.city || '',
    lat: data.location?.lat || 24.7136,
    lng: data.location?.lng || 46.6753
  });
}
```
✅ Frontend expects `location` in response

**Backend Problem:**
- `/users/profile` endpoint must populate Cook model data
- Must return: `location`, `city` in User response
- Currently: Only returns User fields, not Cook fields

### Solution

**Check: server/controllers/userController.js - getUserProfile**

Line 8-51: Get Cook data and include in response:

```javascript
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Get cook profile if user is a cook
    let cookProfile = null;
    if (user.role_cook_status !== 'none') {
      cookProfile = await require('../models/Cook').findOne({ userId: user._id });
    }

    res.status(200).json({
      ...user.toObject(),
      // ADD THESE LINES:
      location: cookProfile?.location || null,
      city: cookProfile?.city || null,
      profilePhoto: user.profilePhoto // Already included in toObject
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Verification
1. Open DevTools → Network
2. Click "Save Cook Profile"
3. Check PUT /api/cooks/profile request:
   - Must contain `city` and `location { lat, lng }`
4. Check response:
   - Must include `location` and `city`
5. Refresh page
   - City and location should persist

---

## 📋 ISSUE #3: Confirm Location Button Doesn't Save

### Problem
- Button at line 883-884 just closes dialog
- Does NOT trigger handleCookSave
- User thinks location was saved, but it wasn't

### Current Code
```jsx
<Button onClick={() => setCookMapOpen(false)} variant="contained" sx={{ bgcolor: '#FF7A00' }}>
  {language === 'ar' ? 'تأكيد الموقع' : 'Confirm Location'}
</Button>
```

### Solution

Replace with button that saves AND closes:

```jsx
<Button 
  onClick={async () => {
    await handleCookSave();
    setCookMapOpen(false);
  }} 
  variant="contained" 
  sx={{ bgcolor: '#FF7A00' }}
  disabled={saving}
>
  {saving ? <CircularProgress size={20} /> : (language === 'ar' ? 'تأكيد الموقع' : 'Confirm Location')}
</Button>
```

OR simply close dialog and let user click the main "Save" button in the Edit Cook Profile dialog.

### Recommended: Keep both dialogs separate

Current behavior is actually correct:
1. User opens "Edit Cook Profile" dialog
2. User clicks "Pick Kitchen Location on Map"
3. Map dialog opens, user sets location
4. User clicks "Confirm Location" (just closes map dialog)
5. Back in Edit dialog, user clicks "Save" to persist

This is better UX than saving automatically from map dialog.

**However:** Add visual confirmation that location was selected:

```jsx
<Box sx={{ p: 1, bgcolor: '#E8F5E9', borderRadius: '4px', mb: 2 }}>
  <Typography variant="caption" sx={{ color: '#2E7D32' }}>
    ✓ Location updated: {cookFormData.city} ({cookFormData.lat.toFixed(4)}, {cookFormData.lng.toFixed(4)})
  </Typography>
</Box>
```

Add this after line 793 in the Edit Cook Profile dialog.

---

## 📋 ISSUE #4: Profile Photo Preview Not Persisting Across App

### Current Problem
- Photo picker opens ✅
- Preview renders ✅
- But: Not saved to User model
- Result: Avatar doesn't update in header/across app

### Root Cause
- `handlePhotoSelect` (lines 194-208) only creates preview
- No save handler implemented
- Preview stored in `photoPreview` state (not saved)

### Solution

**Add photo save handler (before handleCookSave):**

```javascript
const handleSavePhoto = async () => {
  if (!photoPreview) return;
  
  try {
    setSaving(true);
    setError('');
    setSuccess('');
    
    // Only save photo - don't call /users/profile
    const response = await api.put('/users/profile-photo', {
      profilePhoto: photoPreview
    });
    
    if (response.status === 200) {
      // Update user state with new photo
      setUser(prev => ({
        ...prev,
        profilePhoto: photoPreview
      }));
      
      // Update localStorage for header sync
      localStorage.setItem('user', JSON.stringify({
        ...user,
        profilePhoto: photoPreview
      }));
      
      // Notify other components
      window.dispatchEvent(new Event('user-state-updated'));
      
      setPhotoPreview(null);
      setSuccess('Profile photo updated successfully');
      setEditMode(false);
    }
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setSaving(false);
  }
};
```

**Update Avatar UI (after line 434):**

Add save button when preview selected:

```jsx
{photoPreview && !editMode && (
  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2 }}>
    <Button
      onClick={handleSavePhoto}
      variant="contained"
      sx={{ bgcolor: '#FF7A00' }}
      disabled={saving}
    >
      {saving ? <CircularProgress size={20} /> : (language === 'ar' ? 'حفظ الصورة' : 'Save Photo')}
    </Button>
    <Button
      onClick={() => setPhotoPreview(null)}
      variant="outlined"
      disabled={saving}
    >
      {language === 'ar' ? 'إلغاء' : 'Cancel'}
    </Button>
  </Box>
)}
```

### Data Flow
1. User clicks camera icon
2. File picker opens
3. User selects file
4. Preview renders
5. User clicks "Save Photo"
6. Calls `handleSavePhoto()`
7. Sends to `/users/profile-photo`
8. Updates `User.profilePhoto`
9. localStorage updated
10. Header avatar updates via custom event
11. Avatar syncs across app

---

## 📋 ISSUE #5: Unwanted Address Appearing in Personal Information

### Current Code (Lines 485-509)
```jsx
{/* Default Address Read-only Display */}
<Grid item xs={12}>
  <Box sx={{ p: 2, bgcolor: '#F9FAFB', ... }}>
    <LocationIcon sx={{ color: '#FF7A00', mt: 0.5 }} />
    <Box>
      <Typography variant="caption">Default Delivery Address</Typography>
      <Typography variant="body2">
        {user?.defaultAddress ? 
          `${user.defaultAddress.label}: ${user.defaultAddress.addressLine1}, ${user.defaultAddress.city}` : 
          'No default address set'
        }
      </Typography>
    </Box>
  </Box>
</Grid>
```

### Problem
- This displays the **user's delivery address**
- Not relevant in "Personal Information" section
- Should be in "Address Book" section (line 644-661) instead

### Solution

**Option 1: Remove from Personal Information (Recommended)**

Delete lines 485-509 entirely. Address is already in dedicated "Address Book" section below.

**Option 2: Conditionally hide for cooks**

```jsx
{user?.role_cook_status === 'none' && (
  <Grid item xs={12}>
    {/* Address display code */}
  </Grid>
)}
```

### Rationale
- Personal Information = Name, Email, Phone, Photo
- Address Book = All delivery addresses
- Current placement is confusing

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Layout Fix (Issue #1)
- [ ] Restructure map dialog from absolute positioning to flex layout
- [ ] Move search bar ABOVE map container
- [ ] Remove `position: 'absolute'` from search box
- [ ] Update `DialogContent` to use `display: 'flex', flexDirection: 'column'`
- [ ] Verify dropdown renders below search field

### Phase 2: Backend Verification (Issue #2)
- [ ] Check `server/controllers/userController.js` - getUserProfile
- [ ] Verify it populates Cook data
- [ ] Ensure response includes `location` and `city`
- [ ] Test: PUT /cooks/profile returns location in response

### Phase 3: Location Save Confirmation (Issue #3)
- [ ] Add visual confirmation box in Edit Cook dialog
- [ ] Show selected location: "✓ Location updated: {city}"
- [ ] No changes to button behavior (keep separate dialogs)

### Phase 4: Photo Save Handler (Issue #4)
- [ ] Add `handleSavePhoto()` function
- [ ] Update localStorage + dispatch custom event
- [ ] Add save/cancel buttons when preview visible
- [ ] Verify header avatar updates

### Phase 5: Address Cleanup (Issue #5)
- [ ] Remove address display from Personal Information
- [ ] Keep Address Book section below

---

## 🧪 TESTING PROCEDURE

### Test 1: Map Autocomplete
1. Open Edit Cook Profile
2. Click "Pick Kitchen Location on Map"
3. Type city name in search box
4. **Expected:** Dropdown appears **directly below** search field
5. **Verify:** Not hidden under map

### Test 2: Location Persistence
1. Select location in map
2. Click "Confirm Location"
3. Click "Save" in Edit dialog
4. Check Network tab: PUT /cooks/profile response includes `location`
5. Refresh page
6. **Expected:** Location and city persist

### Test 3: Photo Update
1. Click "Edit" button
2. Click camera icon on avatar
3. Select photo file
4. **Expected:** Preview renders below avatar
5. Click "Save Photo"
6. **Expected:** Avatar updates immediately
7. Check header
8. **Expected:** Header avatar also updated

### Test 4: Address Display
1. Open Account Settings
2. Look at "Personal Information" section
3. **Expected:** NO address displayed (only removed)
4. Scroll down to "Address Book"
5. **Expected:** Address Book renders below

---

## 📊 Files to Modify

| File | Lines | Issue | Fix |
|------|-------|-------|-----|
| FoodieSettings.js | 824-849 | Autocomplete under map | Restructure layout |
| FoodieSettings.js | 194-208 | Photo not saved | Add handleSavePhoto |
| FoodieSettings.js | 434+ | No save button | Add photo save UI |
| FoodieSettings.js | 485-509 | Unwanted address | Delete from Personal Info |
| FoodieSettings.js | 883-884 | Unclear save behavior | Add visual confirmation |
| userController.js | 8-51 | Location not returned | Populate Cook data |

---

## 🚀 READY TO IMPLEMENT

All issues have clear, concrete solutions.
No architectural changes needed.
All fixes are isolated to FoodieSettings.js and userController.js.

**Next Step:** Execute fixes in order above, test each phase.

