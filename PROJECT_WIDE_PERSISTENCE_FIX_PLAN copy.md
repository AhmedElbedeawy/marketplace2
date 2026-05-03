# PROJECT-WIDE DATA PERSISTENCE FIX PLAN

## 1. ROOT CAUSE SUMMARY

**Problem:** All uploaded files (images) are stored locally on the backend server filesystem (`/server/uploads/`). When the server is redeployed to Google Cloud Run, the local filesystem is reset, causing all uploaded files to be lost while database references remain.

**Evidence:**
- 88 image files currently in local uploads folder
- Database references image paths like `/uploads/offers/offer-69a4de529250a7468d7f34e6-0-1773188698332.jpg`
- These files do NOT exist after deploy (they were deleted)
- Frontends show broken images or fall back to alternative images

**Current Architecture (UNSAFE):**
```
[Upload] → [Backend Local Disk] → [Database stores path only]
              ↑
        LOST ON DEPLOY
```

---

## 2. ALL FILE CATEGORIES AT RISK

| Category | Location | Backend File | Risk Level |
|----------|----------|--------------|------------|
| **Offer/Dish Images** | `/uploads/offers/` | `dishOfferController.js` | 🔴 HIGH |
| **Admin Dish Images** | `/uploads/dishes/` | `adminDishController.js` | 🔴 HIGH |
| **Category Icons (Mobile)** | `/uploads/categories/mobile/` | `categoryController.js` | 🟠 MEDIUM |
| **Category Icons (Web)** | `/uploads/categories/web/` | `categoryController.js` | 🟠 MEDIUM |
| **Hero Images** | `/uploads/hero/` | `settingsController.js` | 🟠 MEDIUM |
| **Cook Profile Photos** | ? | `cookController.js` | 🔴 HIGH |
| **User Profile Photos** | ? | `userController.js` | 🔴 HIGH |

---

## 3. RECOMMENDED PERMANENT STORAGE ARCHITECTURE

### Target Architecture (SAFE):
```
[Upload] → [Firebase Storage] → [Database stores Firebase URL]
              ↑
        PERSISTS ACROSS DEPLOYS
```

### Firebase Storage Bucket: `eltekkeya.appspot.com`

**Directory Structure in Firebase Storage:**
```
eltekkeya.appspot.com/
├── offers/
│   └── offer-{cookId}-{index}-{timestamp}.jpg
├── dishes/
│   └── dish-{adminDishId}-{timestamp}.jpg
├── categories/
│   ├── mobile/{categoryId}-mobile-{timestamp}.png
│   └── web/{categoryId}-web-{timestamp}.png
├── hero/
│   └── hero-{timestamp}.jpg
├── cooks/
│   └── cook-{userId}-{timestamp}.jpg
└── users/
    └── user-{userId}-{timestamp}.jpg
```

**Database stores full Firebase URLs:**
```
https://firebasestorage.googleapis.com/v0/b/eltekkeya.appspot.com/o/offers%2Foffer-xxx.jpg?alt=media
```

---

## 4. BACKEND FILES THAT MUST CHANGE

### Core Storage Service (NEW)
- **NEW:** `server/services/storageService.js` - Firebase Storage upload/delete wrapper

### Controllers Requiring Updates

| Controller | Changes Required |
|------------|------------------|
| `dishOfferController.js` | Replace multer diskStorage with Firebase upload |
| `adminDishController.js` | Replace multer diskStorage with Firebase upload |
| `categoryController.js` | Replace multer diskStorage with Firebase upload |
| `settingsController.js` | Replace multer diskStorage with Firebase upload |
| `cookController.js` | Add Firebase upload for profile photos |
| `userController.js` | Add Firebase upload for profile photos |

### Configuration Files
- **NEW:** `server/config/firebase-storage.js` - Initialize Firebase Storage
- **UPDATE:** `server/.env` - Add Firebase Storage config variables

---

## 5. FRONTEND FILES THAT MUST CHANGE

### Web App (`client/web/`)
| File | Change |
|------|--------|
| `src/utils/api.js` | Update `getImageUrl()` to handle Firebase URLs |
| `src/utils/api.js` | Keep `/uploads/` prefix for backward compatibility |

### Mobile App (`mobile/foodie/`)
| File | Change |
|------|--------|
| `lib/utils/image_url_utils.dart` | Add Firebase URL handling |
| `lib/config/api_config.dart` | Update base URLs if needed |

### Admin Panel (`admin/`)
| File | Change |
|------|--------|
| Various API calls | Update image URL handling |

---

## 6. MIGRATION PLAN FOR EXISTING FILES

### Phase 1: Identify Surviving Files
```bash
# Check which local files still exist
find server/uploads -type f > local_files.txt

# Compare with database references
# Files in DB but not in local_files.txt = MISSING (need re-upload)
# Files in both = SURVIVED (need migration)
```

### Phase 2: Migrate Surviving Files to Firebase
```javascript
// Migration script pseudo-code:
for each surviving file in local_files.txt:
  1. Upload to Firebase Storage
  2. Get Firebase URL
  3. Update database record with new URL
```

### Phase 3: Mark Missing Files
```javascript
// For files in DB but not in local filesystem:
1. Add flag to database: { imageStatus: 'missing' }
2. Frontend shows "Re-upload required" badge
3. Notify cooks/admins to re-upload
```

### Phase 4: Update Code to Use Firebase
1. Deploy new backend with Firebase Storage
2. Update frontend image URL handling
3. Test all image displays

---

## 7. BACKUP/RECOVERY PLAN

### Database Backup (MongoDB Atlas)
- **Current:** Automatic daily backups enabled in MongoDB Atlas
- **Recommendation:** Download weekly backups to local/Cloud Storage
- **Retention:** Keep 30 days of backups

### Upload Files Backup
- **Immediate:** Copy `/server/uploads/` to Cloud Storage bucket
- **Ongoing:** After migration, Firebase Storage handles persistence
- **Disaster Recovery:** Re-upload all files if needed (file清单已保存在数据库)

### Rollback Plan
1. Keep old local upload code as fallback
2. Feature flag to toggle between local/Firebase storage
3. If Firebase fails, switch to local with warning

---

## 8. SAFE ROLLOUT PLAN

### Step 1: Create Storage Service (Day 1)
- Create `storageService.js` with Firebase upload/delete
- Test upload/delete with Postman
- Do NOT deploy yet

### Step 2: Update Controllers (Day 1-2)
- Add Firebase upload to each controller
- Keep local upload as fallback
- Deploy to staging

### Step 3: Frontend Updates (Day 2)
- Update web/mobile/admin image URL handling
- Test with staging backend

### Step 4: Migration Script (Day 3)
- Run locally to migrate surviving files
- Verify database updated with Firebase URLs

### Step 5: Production Deploy (Day 3-4)
- Deploy new backend
- Deploy frontend updates
- Monitor for errors

### Step 6: Post-Launch (Day 5+)
- Monitor Firebase Storage usage
- Notify users of missing images
- Plan re-uploads

---

## 9. VERIFICATION CHECKLIST

### Backend
- [ ] Firebase Storage service created and tested
- [ ] All 6 controllers updated to use Firebase
- [ ] Upload returns Firebase URLs
- [ ] Delete removes from Firebase
- [ ] Fallback works if Firebase fails

### Web App
- [ ] Dish images load from Firebase URLs
- [ ] Category icons load correctly
- [ ] Hero images display properly
- [ ] Broken images show fallback

### Mobile App
- [ ] Dish images load from Firebase URLs
- [ ] Cook profile photos display
- [ ] Category icons work
- [ ] Offline fallback shows placeholders

### Admin Panel
- [ ] Cook hub image upload works
- [ ] Admin dish upload works
- [ ] Category icon upload works

### Database
- [ ] All image URLs updated to Firebase format
- [ ] No orphan references to local `/uploads/`
- [ ] Migration script ran successfully

---

## 10. IMPLEMENTATION PRIORITY

| Priority | Task | Effort |
|----------|------|--------|
| 1 | Create storageService.js | 2 hours |
| 2 | Update dishOfferController.js | 1 hour |
| 3 | Update adminDishController.js | 1 hour |
| 4 | Update remaining controllers | 2 hours |
| 5 | Update web app image handling | 1 hour |
| 6 | Update mobile app image handling | 1 hour |
| 7 | Run migration script | 2 hours |
| 8 | Test all scenarios | 2 hours |

**Total Estimated Time:** ~12 hours

---

## 11. IMMEDIATE FALLBACK (While Fixing)

Add graceful degradation to frontend code:

```javascript
// Web - api.js
export function getImageUrl(path) {
  if (!path) return '/assets/placeholder.png';
  
  // Try Firebase URL first
  if (path.startsWith('https://firebasestorage')) {
    return path;
  }
  
  // Try local path
  if (path.startsWith('/uploads/')) {
    return `${STATIC_BASE_URL}${path}`;
  }
  
  // Ultimate fallback
  return '/assets/placeholder.png';
}
```

This ensures even if files are missing, the UI doesn't break.
