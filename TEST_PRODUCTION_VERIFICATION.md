# Production Verification Guide

## Prerequisites
- Open DevTools (F12)
- Go to Network tab
- Filter XHR requests
- Keep console visible for logs

---

## Scenario 1: Cook Location Persistence

### Steps:
1. Navigate to `https://eltekkeya.com/foodie/profile`
2. Click "Edit Cook Profile" button
3. In the map search box, type "Jeddah"
4. Select a location result
5. Verify map marker moves to selected location
6. Click "Save Cook Profile" button
7. Observe Network tab

### Expected Evidence:

**In Network tab:**
- Request: `PUT /cooks/profile`
- Status: `200`
- Request Payload should show:
```json
{
  "storeName": "...",
  "expertise": [...],
  "city": "Jeddah",
  "location": {
    "lat": 21.5433,
    "lng": 39.1728
  },
  "questionnaire": {
    "fulfillmentMethods": [...]
  }
}
```

**In Console:**
- Log: `[COOK SAVE] Payload:` (showing the above JSON)

**After Save:**
- Modal closes
- Success message appears: "Cook profile updated successfully"

### Verification:
1. Hard refresh page (Ctrl+Shift+R)
2. Click "Edit Cook Profile" again
3. Map should show Jeddah location (not Riyadh default)
4. City field should show "Jeddah"

**❌ Problem Indicators:**
- Request doesn't fire → Save button not wired
- Status 400/500 → Check Response tab for error
- Location shows Riyadh after refresh → Fetch profile not returning location

---

## Scenario 2: Photo Save Without Phone

### Steps:
1. Go to `https://eltekkeya.com/foodie/profile`
2. Scroll to "Profile Photo" section
3. **Ensure phone field is EMPTY**
4. Click "Upload Photo" / file input
5. Select an image file
6. Verify photo preview appears immediately
7. Click "Save" button
8. Observe Network tab

### Expected Evidence:

**In Network tab - ONLY these requests should appear:**
- `PUT /api/users/profile-photo` → Status `200`

**Must NOT show:**
- `PUT /api/users/profile`

**Response body should include:**
```json
{
  "profilePhoto": "https://firebasestorage.../photo_url.jpg",
  "success": true
}
```

**After Save:**
- Modal closes
- Header avatar updates with new photo (NO page refresh)

**❌ Problem Indicators:**
- `/users/profile` also fires → Conditional logic broken
- `/profile-photo` returns 400/500 → Check Response for error
- Header avatar doesn't update → localStorage sync not working

---

## Scenario 3: Offers List Cook Images

### Steps:
1. Go to `https://eltekkeya.com/foodie/menu`
2. Click on any dish
3. Look for "Other cooks offering this dish" section or similar
4. Observe the cook avatars displayed

### Expected Evidence:

**In Network tab:**
- Find request: `GET /api/products/by-dish/DishName`
- Click Response tab
- Look for `offers` array
- Check first offer: `offers[0].cook.profilePhoto`

**Should see:**
```json
{
  "success": true,
  "offers": [
    {
      "_id": "...",
      "cook": {
        "_id": "...",
        "storeName": "Kitchen Name",
        "profilePhoto": "https://firebasestorage.../photo.jpg",
        "userId": {
          "_id": "...",
          "profilePhoto": "https://firebasestorage.../photo.jpg"
        }
      }
    }
  ]
}
```

**In UI:**
- Cook avatars should show actual photos
- NOT show generic placeholder avatars
- Click on cook to see their name and details

**❌ Problem Indicators:**
- `offers[0].cook.profilePhoto` is null/missing → Backend populate not working
- Avatars still show placeholders → Frontend not using getCookImageUrl()
- No `/products/by-dish` request → Different endpoint being used

---

## Quick Console Commands

Paste these in browser console to verify specific flows:

### Check if cook save fires:
```javascript
// Add this after clicking Save Cook Profile
let requests = performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/cooks/profile'))
  .map(r => ({ name: r.name, duration: r.duration }));
console.table(requests);
```

### Check photo save only:
```javascript
// Add this after clicking Save (photo only)
let requests = performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/profile'))
  .map(r => ({ name: r.name, status: r.status }));
console.table(requests);
```

### Verify header avatar data:
```javascript
let userStr = localStorage.getItem('user');
let user = JSON.parse(userStr);
console.log('User profilePhoto:', user.profilePhoto);
```

---

## If Issues Found

### Issue: PUT /cooks/profile doesn't fire
**Check:**
- File: `FoodieSettings.js` line 1004 - Button has `onClick={handleCookSave}`
- Verify button is in correct modal (Edit Cook Profile)

### Issue: PUT /cooks/profile returns 400
**Check:**
- Console for `[COOK SAVE] Payload:` log
- Verify payload has `location: { lat, lng }` and `city` fields
- Backend logs at: `server/controllers/cookController.js` line 203

### Issue: PUT /users/profile fires when only photo selected
**Check:**
- File: `FoodieSettings.js` line 472 - `onlyPhotoChanged` logic
- Verify `selectedPhotoFile` is set when file selected
- Verify `hasProfileChanges` is false (phone/name/email unchanged)

### Issue: Cook images still placeholders
**Check:**
- Network response for `/products/by-dish/:dishName` includes `offers[0].cook.profilePhoto`
- Frontend uses `getCookImageUrl(offer.cook)` at `MenuDishModalHost.js` line 385

---

## Reporting Results

Please provide:
1. **Screenshots** of Network tab showing request/response
2. **Console logs** (copy from console)
3. **UI screenshot** showing success/error state
4. **Hard refresh result** showing persistence or failure
