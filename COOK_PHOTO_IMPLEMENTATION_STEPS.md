# Cook Photo Unification - Implementation Steps

## ✅ BACKEND COMPLETED

### 1. New Endpoint: PUT /api/cooks/profile-photo
**File:** `server/controllers/cookController.js` (lines 462-490)
**Route:** `server/routes/cook.routes.js` (line 30)

**Status:** ✅ Implemented and deployed
**Functionality:**
- Accepts: `{ profilePhoto: string, originalPhoto?: string }`
- Updates: `Cook.profilePhoto` AND `User.profilePhoto` (sync both)
- Returns: Updated Cook document
- Auth: Required (protect middleware)

---

## 🔄 FRONTEND PENDING

### Phase 1: Kitchen Photo Upload in Account Settings

**File:** `client/web/src/pages/foodie/FoodieSettings.js`

#### Step 1: Add State Variables (After line 82)
```javascript
const [cookPhotoPreview, setCookPhotoPreview] = useState(null);
const cookPhotoInputRef = useRef(null);
```

#### Step 2: Add Handler Functions (Before line 498, before `handleCookSave`)
```javascript
const handleCookPhotoSelect = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // File size check (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    setError('File size must be less than 2MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (event) => {
    setCookPhotoPreview(event.target.result);
  };
  reader.readAsDataURL(file);
};

const handleSaveCookPhoto = async () => {
  if (!cookPhotoPreview) return;
  
  try {
    setSaving(true);
    setError('');
    setSuccess('');
    
    console.log('[COOK PHOTO SAVE] Updating kitchen photo');
    
    const response = await api.put('/cooks/profile-photo', {
      profilePhoto: cookPhotoPreview
    });
    
    if (response.status === 200) {
      // Update user state to reflect changes immediately
      updateUserWithStorage(prev => ({
        ...prev,
        profilePhoto: cookPhotoPreview
      }));
      
      setCookPhotoPreview(null);
      setSuccess('Kitchen photo updated successfully');
      console.log('[COOK PHOTO SAVE] Success');
    }
  } catch (err) {
    console.error('[COOK PHOTO SAVE] Error:', err);
    setError(getErrorMessage(err));
  } finally {
    setSaving(false);
  }
};

const handleCancelCookPhoto = () => {
  setCookPhotoPreview(null);
  if (cookPhotoInputRef.current) {
    cookPhotoInputRef.current.value = '';
  }
};
```

#### Step 3: Add UI in Cook Profile Edit Dialog (Around line 927-1010)

Find the section:
```jsx
<Dialog open={openCookEdit} onClose={() => setOpenCookEdit(false)} maxWidth="sm" fullWidth>
```

Add this BEFORE the closing `</DialogContent>` and BEFORE the save button:

```jsx
{/* Kitchen Photo Section for Active Cooks */}
{user?.role_cook_status === 'active' && (
  <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #EEE' }}>
    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
      <RestaurantIcon sx={{ color: '#FF7A00' }} />
      {language === 'ar' ? 'صورة المطبخ' : 'Kitchen Photo'}
    </Typography>
    
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
      {/* Photo Preview */}
      <Box sx={{ 
        width: 100, 
        height: 100, 
        borderRadius: '8px', 
        overflow: 'hidden', 
        bgcolor: '#EEE',
        flexShrink: 0
      }}>
        <img 
          src={cookPhotoPreview || user?.profilePhoto || '/placeholder.png'}
          alt="Kitchen"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.target.src = '/placeholder.png';
          }}
        />
      </Box>
      
      {/* Upload Controls */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <input
          ref={cookPhotoInputRef}
          type="file"
          onChange={handleCookPhotoSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <Button 
          variant="outlined"
          onClick={() => cookPhotoInputRef.current?.click()}
          sx={{ color: '#FF7A00', borderColor: '#FF7A00' }}
        >
          {cookPhotoPreview ? (language === 'ar' ? 'تغيير الصورة' : 'Change Photo') : (language === 'ar' ? 'اختر صورة' : 'Choose Photo')}
        </Button>
        <Typography variant="caption" sx={{ color: '#888' }}>
          {language === 'ar' 
            ? 'JPG, PNG. الحد الأقصى 2 ميجابايت'
            : 'JPG, PNG. Max 2MB'}
        </Typography>
      </Box>
    </Box>
    
    {/* Save Kitchen Photo Button */}
    {cookPhotoPreview && (
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button 
          onClick={handleSaveCookPhoto}
          variant="contained"
          disabled={saving}
          sx={{ bgcolor: '#FF7A00', flex: 1 }}
        >
          {saving ? <CircularProgress size={20} /> : (language === 'ar' ? 'حفظ الصورة' : 'Save Photo')}
        </Button>
        <Button 
          onClick={handleCancelCookPhoto}
          variant="outlined"
          disabled={saving}
        >
          {language === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
      </Box>
    )}
  </Box>
)}
```

---

### Phase 2: Registration Prefill (Optional but Recommended)

**File:** `client/web/src/pages/foodie/CookRegistration.js`

After step instruction (Line 503):
```jsx
{/* Prefill Offer from User Profile Photo */}
{(() => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const hasUserPhoto = user?.profilePhoto && !croppedPhotoData;
  
  return hasUserPhoto ? (
    <Box sx={{ mb: 3, p: 2, bgcolor: '#FFF3F0', borderRadius: '8px', width: '100%' }}>
      <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
        {language === 'ar' 
          ? 'لديك صورة ملف تعريف. هل تريد استخدامها كصورة المطبخ؟'
          : 'We found your profile photo. Would you like to use it as your kitchen photo?'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Box sx={{ width: 60, height: 60, borderRadius: '6px', overflow: 'hidden', bgcolor: '#EEE' }}>
          <img src={user.profilePhoto} alt="Your profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', gap: 1, flexDirection: 'column' }}>
          <Button 
            size="small" 
            variant="contained"
            onClick={() => setCroppedPhotoData(user.profilePhoto)}
            sx={{ bgcolor: '#FF7A00' }}
          >
            {language === 'ar' ? 'نعم' : 'Yes'}
          </Button>
          <Button 
            size="small" 
            variant="outlined"
          >
            {language === 'ar' ? 'لا' : 'No'}
          </Button>
        </Box>
      </Box>
    </Box>
  ) : null;
})()}
```

---

## ✅ VERIFICATION CHECKLIST

### Image Components (Verify using getCookImageUrl)
- [x] DishDetail.js - ✅ Uses getCookImageUrl(offer.cook)
- [x] MenuDishModalHost.js - ✅ Uses getCookImageUrl()
- [x] TopRatedCookCard.js - ✅ Uses getCookImageUrl()
- [x] FoodieHome.js - ✅ Uses getCookImageUrl() 
- [ ] CookDetailsDialog.js - Verify it uses getCookImageUrl()

### Image Fallback Chain
**File:** `client/web/src/utils/imageHelper.js`

**Current chain (VERIFIED CORRECT):**
```javascript
export const getCookImageUrl = (cook) => {
  if (!cook) return null;
  if (cook.image) return cook.image;
  if (cook.photo) return cook.photo;
  if (cook.avatar) return cook.avatar;
  if (cook.user?.profilePhoto) return cook.user.profilePhoto;
  if (cook.profilePhoto) return cook.profilePhoto;
  return null;
};
```

**Note:** cook.profilePhoto is checked LAST in fallback. This is WRONG for photo unification.
**Action Required:** Move `cook.profilePhoto` check to FIRST position.

**Should be:**
```javascript
export const getCookImageUrl = (cook) => {
  if (!cook) return null;
  if (cook.profilePhoto) return cook.profilePhoto;  // ← FIRST: Kitchen photo from registration
  if (cook.image) return cook.image;
  if (cook.photo) return cook.photo;
  if (cook.avatar) return cook.avatar;
  if (cook.user?.profilePhoto) return cook.user.profilePhoto;  // ← LAST: User avatar fallback
  return null;
};
```

---

## 🚀 DEPLOYMENT STEPS

### 1. Local Build Test
```bash
cd client/web
npm run build
```

### 2. Deploy Backend (if changed)
```bash
cd server
gcloud run deploy eltekkeya-api --source .
```

### 3. Deploy Frontend
```bash
cd client/web
npm run build
firebase deploy --only hosting:eltekkeya-web
```

### 4. Test on Production
https://eltekkeya.com

**Test Checklist:**
- [ ] Login as Cook user
- [ ] Open Account → My Settings
- [ ] See "Kitchen Photo" section
- [ ] Upload new kitchen photo
- [ ] Verify photo updates in:
  - [ ] Header avatar
  - [ ] Dish page cook section
  - [ ] Offers list (if offering dishes)
  - [ ] Cook cards on home

---

## 📝 Notes

1. **Kitchen Photo vs Avatar:**
   - `User.profilePhoto` = Personal avatar (updated from Account page)
   - `Cook.profilePhoto` = Kitchen/business photo (updated from Kitchen Photo section)
   - Both saved when `PUT /cooks/profile-photo` called

2. **Data Sync:**
   - When kitchen photo updated → Both Cook and User models updated
   - When avatar updated → Both User and Cook models updated
   - Ensures consistency across platform

3. **Components Already Updated:**
   - DishDetail.js ✅
   - MenuDishModalHost.js ✅
   - TopRatedCookCard.js ✅
   - FoodieHome.js ✅
   - FoodieHeader.js ✅ (listens for user-state-updated event)

4. **Remaining Work:**
   - Add kitchen photo upload UI to FoodieSettings
   - Update imageHelper.js fallback chain
   - Optional: Add prefill logic to CookRegistration
   - Test on production

---

## 🎯 Expected Behavior After Implementation

✅ Cooks can upload/update kitchen photo from Account page
✅ Kitchen photo reflects immediately in header, dishes, offers
✅ Avatar and kitchen photo stay synced
✅ Registration can prefill from existing avatar
✅ All cook displays use same image source
✅ No more placeholder images for cooks
