# Cook Photo Unification Implementation Plan

## ✅ COMPLETED

### 1. Backend Endpoint Added
- **File:** `server/controllers/cookController.js`
- **New Function:** `updateCookProfilePhoto`
- **Route:** PUT `/api/cooks/profile-photo`
- **Auth:** Required (protect middleware)
- **Payload:** `{ profilePhoto: string, originalPhoto?: string }`
- **Response:** Updated Cook document
- **Side Effect:** Also updates User.profilePhoto to keep in sync

### 2. Route Registered
- **File:** `server/routes/cook.routes.js`
- **Added:** `router.put('/profile-photo', protect, updateCookProfilePhoto);`

---

## 🔄 IN PROGRESS / REMAINING

### Phase 2: Registration UI Prefill (Requires Manual Implementation)

**File:** `client/web/src/pages/foodie/CookRegistration.js`

**Changes Needed:**

1. Add state to track prefill offer:
```javascript
const [showPrefillOption, setShowPrefillOption] = useState(false);

// On activeStep === 1, check if user has profile photo
useEffect(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.profilePhoto && activeStep === 1 && !croppedPhotoData) {
      setShowPrefillOption(true);
    }
  }
}, [activeStep, croppedPhotoData]);
```

2. In step 1 (Kitchen Photos) UI, add prefill option:
```jsx
{showPrefillOption && !croppedPhotoData && (
  <Box sx={{ mb: 3, p: 2, bgcolor: '#FFF3F0', borderRadius: '8px' }}>
    <Typography variant="body2" sx={{ mb: 2 }}>
      {language === 'ar' 
        ? 'لديك صورة ملف تعريف. هل تريد استخدامها كصورة المطبخ؟'
        : 'We found your profile photo. Would you like to use it as your kitchen photo?'}
    </Typography>
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button 
        size="small" 
        onClick={() => {
          const user = JSON.parse(localStorage.getItem('user'));
          setCroppedPhotoData(user.profilePhoto);
          setShowPrefillOption(false);
        }}
      >
        {language === 'ar' ? 'نعم، استخدمها' : 'Yes, use it'}
      </Button>
      <Button 
        size="small" 
        variant="outlined"
        onClick={() => setShowPrefillOption(false)}
      >
        {language === 'ar' ? 'لا، اختر صورة أخرى' : 'No, choose another'}
      </Button>
    </Box>
  </Box>
)}
```

### Phase 3: Account Photo Update UI

**File:** `client/web/src/pages/foodie/FoodieSettings.js`

**Changes Needed:**

Add kitchen photo upload in Cook Profile Edit section:

```jsx
{/* Kitchen Photo Section (for cooks) */}
{user?.role_cook_status === 'active' && (
  <Box sx={{ mt: 4, p: 2, bgcolor: '#F5F5F5', borderRadius: '8px' }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      {language === 'ar' ? 'صورة المطبخ' : 'Kitchen Photo'}
    </Typography>
    
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      {/* Photo Preview */}
      <Box sx={{ width: 100, height: 100, borderRadius: '8px', overflow: 'hidden', bgcolor: '#EEE' }}>
        <img 
          src={cookPhotoPreview || getCookImageUrl(cookData)} 
          alt="Kitchen"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>
      
      {/* Upload Input */}
      <Box sx={{ flex: 1 }}>
        <input
          type="file"
          ref={cookPhotoInputRef}
          onChange={handleCookPhotoSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <Button onClick={() => cookPhotoInputRef.current?.click()}>
          {language === 'ar' ? 'تحميل صورة' : 'Upload Photo'}
        </Button>
      </Box>
    </Box>
    
    {cookPhotoPreview && (
      <Box sx={{ mt: 2 }}>
        <Button 
          onClick={handleSaveCookPhoto}
          variant="contained"
          sx={{ bgcolor: '#FF7A00' }}
        >
          {language === 'ar' ? 'حفظ صورة المطبخ' : 'Save Kitchen Photo'}
        </Button>
      </Box>
    )}
  </Box>
)}
```

**Handler Functions:**

```javascript
const cookPhotoInputRef = useRef(null);
const [cookPhotoPreview, setCookPhotoPreview] = useState(null);

const handleCookPhotoSelect = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
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
    const response = await api.put('/cooks/profile-photo', {
      profilePhoto: cookPhotoPreview
    });
    
    if (response.status === 200) {
      // Update local state
      setUser(prev => ({
        ...prev,
        profilePhoto: cookPhotoPreview
      }));
      setCookPhotoPreview(null);
      setSuccess('Kitchen photo updated successfully');
    }
  } catch (err) {
    setError('Failed to update kitchen photo');
  } finally {
    setSaving(false);
  }
};
```

---

## 📋 Verification Checklist

### Image Display
- [x] Cook.profilePhoto is authoritative cook image source
- [x] imageHelper.js uses correct fallback chain (Cook.profilePhoto first)
- [ ] DishDetail.js uses getCookImageUrl(offer.cook)
- [ ] MenuDishModalHost.js uses getCookImageUrl()
- [ ] TopRatedCookCard.js uses getCookImageUrl()
- [ ] CookDetailsDialog.js uses getCookImageUrl()
- [ ] FoodieHome.js uses getCookImageUrl() for cook cards

### Data Sync
- [ ] PUT `/cooks/profile-photo` updates both Cook.profilePhoto AND User.profilePhoto
- [ ] Header avatar reflects cook photo updates immediately
- [ ] Dish page cook avatars update after save
- [ ] Offers list cook avatars update after save

### User Experience
- [ ] Registration prefills kitchen photo from User.profilePhoto
- [ ] User can accept or skip prefill
- [ ] Account page allows updating kitchen photo
- [ ] Changes reflect across platform without refresh

### Data Integrity
- [ ] Cook.profilePhoto stays primary source
- [ ] User.profilePhoto stays personal avatar
- [ ] Both sync when updated from account page

---

## 🚀 Deployment Checklist

- [ ] Backend deployed to Cloud Run
- [ ] Web app built and deployed to Firebase Hosting
- [ ] Test on https://eltekkeya.com:
  - [ ] Register as cook - prefill works
  - [ ] Update kitchen photo from account - syncs everywhere
  - [ ] Dish page shows cook image
  - [ ] Offers list shows cook images
  - [ ] Header avatar stays consistent

---

## Code References

**Backend Endpoint:**
- File: `server/controllers/cookController.js` (lines added before deleteCook)
- Function: `updateCookProfilePhoto`
- Route: `server/routes/cook.routes.js` line 30

**Frontend Components to Update:**
- `client/web/src/pages/foodie/CookRegistration.js` - Add prefill logic
- `client/web/src/pages/foodie/FoodieSettings.js` - Add kitchen photo UI
- (Already using getCookImageUrl): DishDetail.js, MenuDishModalHost.js, FoodieHome.js

**Image Helper:**
- File: `client/web/src/utils/imageHelper.js`
- Fallback chain verified: Cook.profilePhoto checked before User.profilePhoto
