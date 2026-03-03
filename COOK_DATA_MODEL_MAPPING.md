# Cook Data Model Mapping - Evidence-Based Analysis

## 1️⃣ COOK REGISTRATION vs EDIT COOK PROFILE

### Registration Flow
**Frontend:** [CookRegistration.js#L285-L295](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/pages/foodie/CookRegistration.js#L285-L295)
```javascript
const submitData = {
  ...formData,           // storeName, expertise, city, area
  location: { lat, lng },
  profilePhoto: croppedPhotoData,  // Kitchen photo after circular crop
  questionnaire
};
const response = await api.post('/cooks/register', submitData);
```

**Backend Endpoint:** POST `/cooks/register`
- **Route:** [server/routes/cook.routes.js](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/routes/cook.routes.js)
- **Controller:** [cookController.js#L10-L101](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L10-L101)

**What Registration Creates/Updates:**

| Model | Fields Updated | Lines |
|-------|---|---|
| **User** | `role_cook_status='pending'`, `storeName`, `expertise`, `bio`, `questionnaire`, `profilePhoto`, `countryCode` | [lines 42-53](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L42-L53) |
| **Cook** | `storeName`, `expertise`, `phone`, `area`, `location`, `city`, `profilePhoto`, `questionnaire`, `status='pending'`, `countryCode` | [lines 58-86](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L58-L86) |

---

### Edit Cook Profile Flow
**Frontend:** [FoodieSettings.js#L498-L532](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/pages/foodie/FoodieSettings.js#L498-L532)
```javascript
const handleCookSave = async () => {
  const payload = {
    storeName: cookFormData.storeName,
    expertise: cookFormData.expertise,
    city: cookFormData.city,
    location: {
      lat: cookFormData.lat,
      lng: cookFormData.lng
    },
    questionnaire: {
      fulfillmentMethods: cookFormData.fulfillmentMethods
    }
  };
  const response = await api.put('/cooks/profile', payload);
};
```

**Backend Endpoint:** PUT `/cooks/profile`
- **Route:** [server/routes/cook.routes.js](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/routes/cook.routes.js)
- **Controller:** [cookController.js#L126-L206](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L126-L206)

**What Edit Cook Profile Updates:**

| Model | Fields Updated | Lines |
|-------|---|---|
| **User** | `storeName`, `expertise`, `questionnaire` | [line 182](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L182) |
| **Cook** | `storeName`, `expertise`, `location`, `city`, `questionnaire` | [line 185](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L185) |

**⚠️ CRITICAL OBSERVATION:** Edit Cook Profile does NOT accept or update `profilePhoto`!
- Registration sends: `profilePhoto: croppedPhotoData`
- Edit Cook Profile sends: NO profilePhoto field
- Edit Cook Profile accepts: `storeName`, `expertise`, `location`, `city`, `questionnaire` only

---

## 2️⃣ COOK LOCATION PERSISTENCE - DATA SOURCE

### Authoritative Source for City/Location

**Cook Model Fields:** [Cook.js#L115-L119](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/models/Cook.js#L115-L119)
```javascript
location: {
  lat: { type: Number, default: 0 },
  lng: { type: Number, default: 0 }
},
city: { type: String, trim: true, index: true, default: 'Riyadh' }
```

**User Model:** Does NOT have location/city fields
- User only has: `countryCode`, `storeName`, `questionnaire`

### Checkout City Validation

**Queries Cook model directly:**
- [cookController.js#L290-L298](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L290-L298): Finds cooks by `location.lat`, `location.lng`, `countryCode`
- No reference to User.city for validation

**Data Flow:**
1. Registration creates Cook with `city` + `location`
2. Edit Cook Profile updates Cook `city` + `location`
3. Checkout filters cooks by Cook.location distance
4. Validation uses Cook.city field

---

## 3️⃣ KITCHEN PHOTO vs USER AVATAR vs COOK IMAGE

### Image Fields in Models

**User Model - Avatar Storage:**
- Field: `profilePhoto` (string)
- [User.js#L62-L65](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/models/User.js#L62-L65)
- Usage: User's personal profile photo

**Cook Model - Kitchen/Cook Images:**
- Field 1: `profilePhoto` (string) - Kitchen photo uploaded during registration
- Field 2: `originalPhoto` (string) - Original before circular crop
- [Cook.js#L44-L53](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/models/Cook.js#L44-L53)
- Usage: Cook/kitchen avatar display

### Image Storage Path

**Registration Flow:**
- Frontend: [CookRegistration.js#L268, #L291](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/pages/foodie/CookRegistration.js#L268) calls "Please upload and crop your kitchen photo"
- Sends as: `profilePhoto: croppedPhotoData` (data URL after circular crop)
- Backend stores in:
  - **User.profilePhoto** [cookController.js#L49-L51](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L49-L51)
  - **Cook.profilePhoto** [cookController.js#L69](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L69)

### Image Mismatch Issue

**Problem:** User vs Cook profilePhoto can diverge
- **Scenario 1:** Cook updates personal avatar via `/users/profile-photo` 
  - Updates: **User.profilePhoto** only
  - Cook.profilePhoto remains unchanged
  
- **Scenario 2:** Cook uploads kitchen image during registration
  - Updates: **Both User.profilePhoto AND Cook.profilePhoto**
  - But subsequent edits to User.profilePhoto don't sync to Cook.profilePhoto

---

## 4️⃣ KITCHEN PHOTO USAGE IN UI

### Where Cook Images Are Rendered

**Dish Page Cook Section:**
- File: [DishDetail.js#L302](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/pages/foodie/DishDetail.js#L302)
- Component: `Avatar`
- Reads from: `getCookImageUrl(offer.cook)`
- [imageHelper.js](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/utils/imageHelper.js) fallback chain:
  1. `cook.image`
  2. `cook.photo`
  3. `cook.avatar`
  4. `cook.user?.profilePhoto`
  5. `cook.profilePhoto`

**Offers List Page:**
- File: [MenuDishModalHost.js#L385, #L493](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/components/foodie/MenuDishModalHost.js#L385)
- Component: `Avatar`
- Reads from: `getCookImageUrl(offer.cook)`

**Top Rated Cooks Home:**
- File: [FoodieHome.js#L940](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/pages/foodie/FoodieHome.js#L940)
- Component: `TopRatedCookCard`
- Reads from: `profilePhoto={getCookImageUrl(chef)}`

**Cook Details Dialog:**
- File: [CookDetailsDialog.js#L91](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/components/CookDetailsDialog.js#L91)
- Reads from: `getCookImageUrl(cook)`

---

## 5️⃣ WHERE COOKS UPDATE KITCHEN IMAGE

### Registration Flow (Required)
- File: [CookRegistration.js#L486](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/pages/foodie/CookRegistration.js#L486)
- Required during initial cook signup
- Calls: POST `/cooks/register` with `profilePhoto: croppedPhotoData`

### Edit Cook Profile (Current)
- File: [FoodieSettings.js#L498-L532](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/pages/foodie/FoodieSettings.js#L498-L532)
- Allows editing: `storeName`, `expertise`, `city`, `location`, `questionnaire`
- **Does NOT allow updating kitchen photo**
- Endpoint: PUT `/cooks/profile` (doesn't accept profilePhoto field)

### Personal Avatar Update (Separate)
- File: [FoodieSettings.js#L348-L376](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/client/web/src/pages/foodie/FoodieSettings.js#L348-L376)
- Updates: User.profilePhoto only
- Endpoint: PUT `/users/profile-photo`
- **Does NOT sync to Cook.profilePhoto**

---

## 🎯 SINGLE SOURCE OF TRUTH - SUMMARY TABLE

| Data | Model | Field | Write Endpoint | Read Endpoint | Notes |
|------|-------|-------|---|---|---|
| **Cook Location** | Cook | `location: {lat, lng}` | PUT `/cooks/profile` | GET `/users/profile` (via Cook join) | Authoritative for distance queries |
| **Cook City** | Cook | `city` | PUT `/cooks/profile` | GET `/users/profile` (via Cook join) | Used for city validation at checkout |
| **Kitchen Photo** | Cook | `profilePhoto` | POST `/cooks/register` | GET `/cooks/top-rated`, `/products/by-dish` | Circular-cropped version from registration |
| **User Avatar** | User | `profilePhoto` | PUT `/users/profile-photo` | GET `/users/profile`, FoodieHeader localStorage | Personal avatar, NOT synced to Cook |
| **Store Name** | User + Cook | `storeName` | PUT `/cooks/profile` | Both models | Synced between User and Cook |
| **Expertise** | User + Cook | `expertise` | PUT `/cooks/profile` | Both models | Synced between User and Cook |
| **Questionnaire** | User + Cook | `questionnaire` | PUT `/cooks/profile` | Both models | Synced between User and Cook |

---

## ⚠️ IDENTIFIED ISSUES & IMPLICATIONS

### Issue 1: Kitchen Photo Cannot Be Updated After Registration
- **Status:** Not Implemented
- **Impact:** Cooks can only update kitchen image via re-registration flow
- **Fix Needed:** Add `profilePhoto` field to PUT `/cooks/profile` endpoint
- **Code Change:** [cookController.js#L129-L206](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/cookController.js#L126-L206) needs to accept `profilePhoto`

### Issue 2: User Avatar Update Doesn't Sync to Cook.profilePhoto
- **Status:** By Design (or Bug?)
- **Impact:** 
  - User updates personal avatar via `/users/profile-photo`
  - Cook image in offers/dishes stays at old kitchen photo from registration
  - User avatar (header) shows new photo, but cook cards show old kitchen photo
- **Question:** Should they sync or remain independent?

### Issue 3: Cook.location Not Returned by /users/profile
- **Status:** FIXED (in latest code)
- **Location:** [userController.js#L27-L58](file:///Users/AhmedElbedeawy/Documents/Qoder\ backups/ElTekkeya\ Marketplace/server/controllers/userController.js#L27-L58)
- **Returns:** `location`, `city`, `country`, `countryCode` from Cook model

### Issue 4: Multiple Image Fields with No Clear Usage
- **Fields in Cook model:**
  - `profilePhoto` - Used in UI
  - `originalPhoto` - Unused
- **No storage for:**
  - `storeImage`, `kitchenImage`, `logo` - Not in schema

---

## 📋 VERIFICATION CHECKLIST

- [x] Cook registration saves to both User and Cook models
- [x] Edit cook profile updates Cook location + city
- [x] Cook.location is authoritative for distance validation
- [x] Cook.profilePhoto is kitchen photo from registration
- [x] User.profilePhoto is personal avatar
- [ ] Kitchen photo can be updated after registration
- [ ] Frontend receives cook.profilePhoto in offers/dishes endpoints
- [ ] UI uses getCookImageUrl() fallback chain correctly
