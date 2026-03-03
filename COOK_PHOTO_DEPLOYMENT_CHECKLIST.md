# Cook Photo Unification - Deployment Checklist

## ✅ BACKEND COMPLETED

### Endpoint Implementation
- **File:** `server/controllers/cookController.js` (lines 462-490)
- **Route:** `server/routes/cook.routes.js` (line 30)
- **Status:** ✅ IMPLEMENTED
- **Endpoint:** `PUT /api/cooks/profile-photo`
- **Auth:** Required (protect middleware)
- **Payload:** `{ profilePhoto: string, originalPhoto?: string }`
- **Response:** Updated Cook document
- **Side Effect:** Updates both Cook.profilePhoto AND User.profilePhoto

### Location Persistence Endpoint
- **File:** `server/controllers/cookController.js` (lines 130-206)
- **Route:** `PUT /api/cooks/profile`
- **Status:** ✅ VERIFIED - Saves location + city to Cook model
- **Payload Fields:**
  ```javascript
  {
    storeName: string,
    expertise: array,
    city: string,
    location: { lat: number, lng: number },
    questionnaire: { fulfillmentMethods: array }
  }
  ```

---

## ✅ FRONTEND COMPLETED

### 1. Image Fallback Chain Fixed
- **File:** `client/web/src/utils/imageHelper.js`
- **Status:** ✅ RECREATED with correct priority
- **Priority Order:**
  1. `cook.profilePhoto` ← KITCHEN PHOTO (authoritative)
  2. `cook.user.profilePhoto` ← USER AVATAR (fallback)
  3. `cook.image` (legacy)
  4. `cook.photo` (legacy)
  5. `cook.avatar` (legacy)
  6. `null` (no image found)

### 2. Components Using getCookImageUrl()
- ✅ DishDetail.js - Dish page cook section
- ✅ MenuDishModalHost.js - Offers list cook avatars
- ✅ TopRatedCookCard.js - Top cooks section
- ✅ FoodieHome.js - Cook cards on home page
- ✅ CookDetailsDialog.js - Cook profile dialog (if using)

### 3. Header Avatar Updates
- **File:** `client/web/src/components/FoodieHeader.js`
- **Status:** ✅ Listens for `user-state-updated` custom event
- **Behavior:** Updates immediately when localStorage changes same-tab

### 4. Profile Photo Sync
- **File:** `client/web/src/pages/foodie/FoodieSettings.js`
- **Status:** ✅ Dispatches `user-state-updated` event after save
- **Behavior:** Triggers header + other components to refresh

---

## 🔄 FRONTEND PENDING (Non-Critical)

### Optional: Kitchen Photo UI in FoodieSettings
See `COOK_PHOTO_IMPLEMENTATION_STEPS.md` for detailed UI implementation.

**Impact:** Allows cooks to update kitchen photo from Account page (not just during registration).

**Status:** Implementation guide provided, ready for manual implementation.

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Backend Deployment
```bash
cd /Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server

# Deploy to Cloud Run
gcloud run deploy eltekkeya-api --source . --region us-central1 --allow-unauthenticated

# Monitor logs
gcloud run logs read eltekkeya-api --region us-central1 --limit 50
```

**Verification:**
```bash
# Test the new endpoint
curl -X PUT https://eltekkeya-api-xxxxx.run.app/api/cooks/profile-photo \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"profilePhoto": "data:image/png;base64,..."}'
```

### Step 2: Frontend Build & Deploy
```bash
cd /Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web

# Build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting:eltekkeya-web

# Monitor deployment
firebase hosting:channel:list
```

**Expected Output:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/eltekkeya-abc/overview
Hosting URL: https://eltekkeya.com
```

### Step 3: Verify Deployment
```bash
# Check if build succeeded
npm run build 2>&1 | tail -20

# Test production endpoint
curl -X GET https://eltekkeya.com/api/users/profile \
  -H "Authorization: Bearer <token>"
```

---

## ✅ PRODUCTION TESTING CHECKLIST

### Login & Setup
- [ ] Login to https://eltekkeya.com as a Cook user
- [ ] Open Account Settings (profile icon → My Settings)
- [ ] Verify cook status shows "Active"

### Image Display (No UI Changes Needed)
- [ ] Kitchen photo displays on:
  - [ ] Header avatar
  - [ ] Dish page (if user is offering dishes)
  - [ ] Offers list (if dishes with offers)
  - [ ] Cook cards on home page
  - [ ] Profile settings page

### Location Persistence
- [ ] Open Account Settings → Cook Profile Edit
- [ ] Change city or location on map
- [ ] Click "Save Cook Profile"
- [ ] Monitor Network tab:
  - [ ] See PUT /api/cooks/profile (200 OK)
  - [ ] Response contains `data.location` and `data.city`
- [ ] Refresh page
- [ ] [ ] Verify location persists

### Data Consistency
- [ ] Kitchen photo same across all displays
- [ ] Location consistent in checkout
- [ ] No placeholder images (unless new cook)

---

## 🔍 TROUBLESHOOTING

### Issue: Kitchen photo not showing
**Check:**
1. Is `cook.profilePhoto` populated? (Check Network > API > cook object)
2. Is getCookImageUrl() being called? (Check Component props)
3. Is imageHelper.js using correct order? (Check fallback chain)
4. Is Cook.profilePhoto synced from User.profilePhoto? (Check backend)

### Issue: Location not persisting
**Check:**
1. Network tab shows PUT /api/cooks/profile (200)?
2. Response contains `data.location` and `data.city`?
3. Cook document updated in database? (Check MongoDB)
4. Page refreshed after save?

### Issue: Header avatar not updating
**Check:**
1. FoodieSettings dispatches `user-state-updated` event? (Check console)
2. FoodieHeader listening for event? (Check event listener)
3. localStorage updated? (Check DevTools > Application > localStorage)

---

## 📊 EVIDENCE CHECKLIST

After deployment, collect evidence:

### Screenshot Evidence
- [ ] Network tab showing PUT /cooks/profile-photo (200)
- [ ] Network tab showing PUT /cooks/profile with location (200)
- [ ] Header avatar displaying cook photo
- [ ] Dish page showing cook photo in cook section
- [ ] Offers list showing cook photos

### Console Evidence
- [ ] No errors in DevTools Console
- [ ] Debug logs visible (if enabled): `[COOK SAVE]`, `[COOK PHOTO SAVE]`

### Data Integrity Evidence
- [ ] Cook.profilePhoto === User.profilePhoto (in Network response)
- [ ] Cook.location contains { lat, lng } (non-zero values)
- [ ] Cook.city contains city name (not null)

---

## 🎯 SUCCESS CRITERIA

After deployment and testing:

✅ **Image Display**
- Cook photo displays correctly on all surfaces (header, dishes, offers, cards)
- No placeholder images for registered cooks
- Photo syncs immediately when updated

✅ **Location Persistence**
- Cook location saved and persists across refreshes
- City saved and persists across refreshes
- Location used in checkout validation

✅ **Data Sync**
- Kitchen photo and user avatar can diverge
- Both sync when updated from Account page
- Header updates instantly on same tab

✅ **User Experience**
- No errors or warnings in console
- Smooth photo upload experience
- Location changes reflect immediately

---

## 📝 NEXT STEPS (Optional)

### Add Kitchen Photo Update UI
- Implement kitchen photo upload in FoodieSettings
- Allow cooks to change kitchen photo after registration
- See `COOK_PHOTO_IMPLEMENTATION_STEPS.md` for detailed guide

### Add Registration Prefill
- Prefill kitchen photo step with user's existing avatar
- Let user accept or replace with different photo
- See `COOK_PHOTO_IMPLEMENTATION_STEPS.md` section "Phase 2"

---

## 🔗 REFERENCE FILES

**Backend:**
- `server/controllers/cookController.js` - updateCookProfilePhoto function
- `server/routes/cook.routes.js` - Route registration
- `server/models/Cook.js` - Schema (profilePhoto field)
- `server/models/User.js` - Schema (profilePhoto field)

**Frontend:**
- `client/web/src/utils/imageHelper.js` - getCookImageUrl() function
- `client/web/src/pages/foodie/FoodieSettings.js` - User state management
- `client/web/src/components/FoodieHeader.js` - Avatar display + event listener
- `client/web/src/pages/foodie/DishDetail.js` - Dish page cook section
- `client/web/src/components/foodie/MenuDishModalHost.js` - Offers list
- `client/web/src/pages/foodie/FoodieHome.js` - Home page cook cards

---

## 🚀 DEPLOYMENT COMMANDS (Copy-Paste Ready)

```bash
# Backend
cd server && gcloud run deploy eltekkeya-api --source .

# Frontend
cd client/web && npm run build && firebase deploy --only hosting:eltekkeya-web

# Verify
curl -s https://eltekkeya.com/api/health | jq .
```

---

## ✅ CURRENT STATUS

| Component | Status | Evidence |
|-----------|--------|----------|
| Backend endpoint | ✅ Done | cookController.js:462-490, cook.routes.js:30 |
| Image fallback chain | ✅ Done | imageHelper.js recreated with correct priority |
| Header sync | ✅ Done | FoodieHeader.js listens for user-state-updated |
| Location persistence | ✅ Done | PUT /cooks/profile endpoint saves location + city |
| Component integration | ✅ Done | All components use getCookImageUrl() |
| Kitchen photo UI | 🔄 Optional | Guide provided in COOK_PHOTO_IMPLEMENTATION_STEPS.md |
| Registration prefill | 🔄 Optional | Guide provided in COOK_PHOTO_IMPLEMENTATION_STEPS.md |

---

**Ready to deploy! ✅**
