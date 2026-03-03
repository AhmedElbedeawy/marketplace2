# Cook Photo Unification - Production Testing Guide

## 🚀 DEPLOYMENT LIVE

**Status:** ✅ DEPLOYED
**URL:** https://eltekkeya.web.app
**Last Deployed:** Mon, 02 Mar 2026 02:38:40 GMT
**Build Size:** 455.05 kB (gzip)
**Assets:** 79 files

---

## 📋 PRE-TEST SETUP

### 1. Clear Browser Cache
```javascript
// DevTools Console:
localStorage.clear();
location.reload();
```

### 2. Open DevTools Tabs
- **Network Tab:** Monitor API calls
- **Console Tab:** Check for errors
- **Application Tab:** View localStorage

### 3. Test Account
Use an active Cook account with:
- role_cook_status: 'active'
- At least one dish offering

---

## ✅ TEST SCENARIOS

### Scenario 1: Image Display Consistency

**Step 1: Navigate to Home Page**
- Go to https://eltekkeya.web.app
- Scroll to "Top Rated Cooks" section
- **Check:** Cook images display correctly (not placeholders)

**Step 2: Check Dish Page**
- Click on any dish from a cook you know
- Scroll to cook section (usually top of page)
- **Check:** Cook avatar matches home page photo

**Step 3: Check Offers List**
- Click on dish with offers button
- **Check:** All cook avatars in offers list match home/profile photo

**Step 4: Check Header**
- Click account icon (top right)
- **Check:** Header avatar shows cook's kitchen photo

---

### Scenario 2: Location Persistence

**Step 1: Open Settings**
- Account icon → My Settings
- Scroll to "Cook Profile Edit" section

**Step 2: View Current Location**
- Note current city and map pin location
- **Check:** Location displays (not null/empty)

**Step 3: Change Location**
- Click map or search box
- Select different city (e.g., Jeddah if currently Riyadh)
- Click "Save Cook Profile"

**Step 4: Monitor Network**
- **Open Network Tab** before clicking Save
- Click "Save Cook Profile"
- **Check Network:**
  - See PUT request to `/api/cooks/profile`
  - Status: 200 OK
  - Response contains `data.location.lat`, `data.location.lng`, `data.city`

**Step 5: Verify Persistence**
- Refresh page (Cmd+R)
- Open Settings again
- **Check:** City and location persisted (not reset)

---

### Scenario 3: Real-Time Photo Sync (No UI Currently)

**Note:** Kitchen photo update UI is optional enhancement. Current implementation:
- Kitchen photo updatable during registration
- Automatically syncs with user avatar
- Both stay in sync when either is updated

**To Test When UI Implemented:**
1. Open Account Settings in 2 browser tabs
2. Update photo in Tab 1
3. **Check Tab 2:** Photo updates without refresh
4. **Check Header:** Header avatar updates immediately
5. Check different page: Photo persists

---

### Scenario 4: Data Integrity

**Step 1: Check Network Response**
- Open Settings
- Monitor Network tab
- Click "Save Cook Profile"
- **Check Response:**
  ```json
  {
    "success": true,
    "message": "Cook profile updated successfully",
    "data": {
      "_id": "...",
      "profilePhoto": "data:image/png;base64,...",
      "location": { "lat": 24.7136, "lng": 46.6753 },
      "city": "Riyadh",
      "userId": { "profilePhoto": "..." }
    }
  }
  ```

**Step 2: Check localStorage**
- DevTools → Application → localStorage → eltekkeya
- View "user" object
- **Check:** profilePhoto field exists and matches

**Step 3: Check Cook Display**
- Different pages should show same cook photo
- Verify in: home, dish, offers, profile

---

## 🐛 TROUBLESHOOTING

### Issue: Cook images show placeholder
**Diagnostic:**
1. Check Network tab - is cook object populated?
2. Does cook object have `profilePhoto` or `user.profilePhoto`?
3. Is getCookImageUrl() being called?

**Solution:**
- If no cook.profilePhoto: Cook may have registered before feature
- If getCookImageUrl() not called: Component may not be updated
- Check console for errors

### Issue: Location not persisting
**Diagnostic:**
1. Monitor Network tab - does PUT /cooks/profile return 200?
2. Check response - does it contain location data?
3. Refresh page - does location reset?

**Solution:**
- If PUT fails: Check auth token validity
- If 200 but doesn't persist: May be cache issue - clear localStorage
- If form wasn't populated: Check Cook document in database

### Issue: Header avatar not updating
**Diagnostic:**
1. Check console for errors
2. Check localStorage - is user object updated?
3. Check Application tab → localStorage.user

**Solution:**
- Refresh page to see update
- Clear localStorage and re-login
- Check that FoodieHeader event listener is active

### Issue: Offers don't show cook images
**Diagnostic:**
1. Network tab - check offers endpoint response
2. Does response include `cook.profilePhoto`?
3. Is MenuDishModalHost using getCookImageUrl()?

**Solution:**
- Rebuild and redeploy frontend
- Check backend populate() in productController.js
- Verify cook documents have profilePhoto field

---

## 📸 EVIDENCE COLLECTION

After testing, collect evidence for verification:

### Screenshot 1: Home Page Cook Cards
- **What:** Cook section showing cook images
- **File:** Cook_Cards_Home.png

### Screenshot 2: Network Response
- **What:** Network tab showing PUT /cooks/profile
- **File:** Network_Cook_Profile_PUT.png
- **Include:** Status 200, Response JSON with location

### Screenshot 3: Cook Image Consistency
- **What:** Same cook in 3 places (home, dish, offers)
- **File:** Cook_Image_Consistency.png

### Screenshot 4: DevTools Storage
- **What:** localStorage showing user.profilePhoto
- **File:** Storage_User_ProfilePhoto.png

### Screenshot 5: Settings Cook Profile
- **What:** Cook profile with location and city
- **File:** Settings_Cook_Profile.png

---

## 🎯 ACCEPTANCE CHECKLIST

### Core Functionality
- [ ] Cook images display on home page
- [ ] Cook images display on dish page
- [ ] Cook images display in offers list
- [ ] Header avatar shows cook photo
- [ ] All images are consistent (not different photos)

### Location Persistence
- [ ] Location displays in settings
- [ ] Location changes save correctly
- [ ] Location persists after page refresh
- [ ] City persists after page refresh
- [ ] Network shows PUT /cooks/profile returning 200

### Data Integrity
- [ ] No errors in DevTools Console
- [ ] No 404 or 500 errors
- [ ] localStorage contains valid user object
- [ ] Cook objects have profilePhoto field

### User Experience
- [ ] No loading delays
- [ ] No placeholder images
- [ ] Settings load quickly
- [ ] Changes save without page refresh

---

## 🚨 CRITICAL CHECKS

### Must Have:
- ✅ Cook.profilePhoto is FIRST in fallback chain
- ✅ PUT /cooks/profile-photo endpoint returns 200
- ✅ Both Cook and User models updated together
- ✅ Header listens for user-state-updated event
- ✅ All components import getCookImageUrl

### Must NOT Have:
- ❌ No placeholder images for registered cooks
- ❌ No mismatched cook photos across pages
- ❌ No missing location/city data
- ❌ No console errors or warnings
- ❌ No 404 errors in Network tab

---

## 🔧 DEBUG COMMANDS

### Check Cook Object in API Response
```javascript
// Network tab → Response preview
console.log(response.data.cook);
// Should show: { profilePhoto: "data:...", location: {...}, city: "..." }
```

### Check Image Fallback
```javascript
// In component console
import { getCookImageUrl } from '../utils/imageHelper';
const cook = { /* cook object from API */ };
console.log('Cook Image URL:', getCookImageUrl(cook));
```

### Check Event Listener
```javascript
// In DevTools console
window.addEventListener('user-state-updated', () => {
  console.log('🔄 User state updated event fired!');
});
```

### Check localStorage Sync
```javascript
// In DevTools console
const user = JSON.parse(localStorage.getItem('user'));
console.log('Stored user photo:', user?.profilePhoto?.substring(0, 50));
```

---

## 📝 TESTING LOG

| Test | Date | Result | Notes |
|------|------|--------|-------|
| Home Page Images | MM/DD/YYYY | ✅/❌ | |
| Dish Page Images | MM/DD/YYYY | ✅/❌ | |
| Offers Images | MM/DD/YYYY | ✅/❌ | |
| Location Persist | MM/DD/YYYY | ✅/❌ | |
| Header Avatar | MM/DD/YYYY | ✅/❌ | |
| Network Requests | MM/DD/YYYY | ✅/❌ | |

---

## 🎓 TECHNICAL DETAILS

### Image Fallback Chain (NEW)
```javascript
getCookImageUrl(cook) {
  if (!cook) return null;
  if (cook.profilePhoto) return cook.profilePhoto;  // ← KITCHEN PHOTO (1st)
  if (cook.user?.profilePhoto) return cook.user.profilePhoto;  // ← AVATAR (2nd)
  if (cook.image) return cook.image;  // Legacy
  if (cook.photo) return cook.photo;  // Legacy
  if (cook.avatar) return cook.avatar;  // Legacy
  return null;  // No image - component shows placeholder
}
```

### Endpoint Contracts

**Update Kitchen Photo:**
```
PUT /api/cooks/profile-photo
Authorization: Bearer <token>
Content-Type: application/json

{
  "profilePhoto": "data:image/png;base64,...",
  "originalPhoto": "data:image/png;base64,..."  // optional
}

Response 200:
{ success: true, data: { Cook object with updated fields } }
```

**Update Cook Profile:**
```
PUT /api/cooks/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "city": "Riyadh",
  "location": { "lat": 24.7136, "lng": 46.6753 }
}

Response 200:
{ success: true, data: { Cook object with updated fields } }
```

---

## ✨ EXPECTED BEHAVIOR

**Before Update:**
- User.profilePhoto = existing avatar
- Cook.profilePhoto = empty or old photo
- Images may not match across pages

**After Update (if UI implemented):**
- User.profilePhoto updated
- Cook.profilePhoto updated to same value
- All pages show same image immediately
- Header avatar syncs within 1 second

**Persistence:**
- Changes saved to MongoDB
- Persist across tab refreshes
- Persist after browser restart
- Used in checkout validation

---

## 🎯 SUCCESS CRITERIA

**All Tests Pass If:**
1. ✅ Cook images display correctly on all surfaces
2. ✅ Location persists across refresh
3. ✅ No missing or placeholder images
4. ✅ Network requests return 200
5. ✅ No console errors
6. ✅ Header updates sync correctly
7. ✅ Data integrity maintained

---

**Ready to Test! 🚀**

Use this guide to verify cook photo unification is working correctly in production.
