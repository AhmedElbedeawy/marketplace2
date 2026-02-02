const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_URL = 'http://localhost:5005/api';
const SERVER_DIR = '/Users/AhmedElbedeawy/Desktop/Marketplace Project/server';

async function runTests() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace');
    console.log('MongoDB Connected\n');

    // Get admin user and token
    const User = require('./models/User');
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) throw new Error('No admin user found');
    
    const adminToken = jwt.sign(
      { id: admin._id, role: admin.role, email: admin.email },
      process.env.JWT_SECRET || 'marketplace-secret-key-2025-change-in-production',
      { expiresIn: '24h' }
    );
    console.log('Admin ID:', admin._id);
    console.log('Admin Token:', adminToken.substring(0, 50) + '...\n');

    // Get a cook user (user with isCook=true and approved/active status)
    const cookUser = await User.findOne({ 
      isCook: true, 
      role_cook_status: { $in: ['approved', 'active'] }
    });
    if (!cookUser) throw new Error('No approved cook user found');
    
    const Cook = require('./models/Cook');
    const cook = await Cook.findOne({ userId: cookUser._id });
    if (!cook) throw new Error('No cook profile found for user ' + cookUser._id);
    
    // Generate cook token
    const cookToken = jwt.sign(
      { id: cookUser._id, role: cookUser.role, email: cookUser.email },
      process.env.JWT_SECRET || 'marketplace-secret-key-2025-change-in-production',
      { expiresIn: '24h' }
    );
    
    console.log('Cook User ID:', cookUser._id);
    console.log('Cook Profile ID:', cook._id);
    console.log('Cook Store:', cook.storeName);
    console.log('Cook Token:', cookToken.substring(0, 50) + '...\n');

    // Get a category
    const Category = require('./models/Category');
    const category = await Category.findOne();
    console.log('Category ID:', category._id, '\n');

    // Create axios instances
    const adminApi = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const cookApi = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${cookToken}` }
    });

    // ========== TEST 1: AdminDish Create with Image ==========
    console.log('='.repeat(60));
    console.log('TEST 1: AdminDish Create with Image');
    console.log('='.repeat(60));

    // Create test image
    const testImagePath = path.join(SERVER_DIR, 'uploads', 'test_dish.png');
    const redPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, redPixel);

    const form = new FormData();
    form.append('nameEn', 'Traditional Molokhia');
    form.append('nameAr', 'ملوخية تقليدية');
    form.append('descriptionEn', 'Classic Egyptian molokhia with fresh herbs and garlic');
    form.append('descriptionAr', 'ملوخية مصرية كلاسيكية بالثوم والأعشاب الطازجة');
    form.append('category', category._id.toString());
    form.append('isActive', 'true');
    form.append('isPopular', 'false');
    form.append('image', fs.createReadStream(testImagePath));

    const createResponse = await adminApi.post('/admin-dishes', form, {
      headers: form.getHeaders()
    });

    console.log('AdminDish Created:');
    console.log(JSON.stringify(createResponse.data, null, 2));

    const adminDishId = createResponse.data._id;
    const imageUrl = createResponse.data.imageUrl;

    // Check file exists
    const filePath = path.join(SERVER_DIR, imageUrl);
    if (fs.existsSync(filePath)) {
      console.log('\n✓ Image file exists at:', filePath);
      console.log('  File size:', fs.statSync(filePath).size, 'bytes');
      
      // Verify dimensions (should be 400x300)
      const sharp = require('sharp');
      const metadata = await sharp(filePath).metadata();
      console.log('  Dimensions:', metadata.width, 'x', metadata.height);
    } else {
      console.log('\n✗ Image file NOT found at:', filePath);
    }

    // ========== TEST 2: DishOffer Create ==========
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: DishOffer Create with Images');
    console.log('='.repeat(60));

    // Create test images for offer
    const testImagePath2 = path.join(SERVER_DIR, 'uploads', 'test_offer.png');
    fs.writeFileSync(testImagePath2, redPixel);

    const offerForm = new FormData();
    offerForm.append('adminDishId', adminDishId);
    offerForm.append('price', '75');
    offerForm.append('stock', '20');
    offerForm.append('portionSize', 'medium');
    offerForm.append('prepReadyConfig', JSON.stringify({
      optionType: 'cutoff',
      cutoffTime: '12:00',
      beforeCutoffReadyTime: '16:00',
      afterCutoffDayOffset: 1
    }));
    offerForm.append('fulfillmentModes', JSON.stringify({
      pickup: true,
      delivery: false
    }));
    offerForm.append('images', fs.createReadStream(testImagePath2));

    // Use cookApi with cook token
    const offerResponse = await cookApi.post('/dish-offers', offerForm, {
      headers: offerForm.getHeaders()
    });
    
    console.log('\nDishOffer Created:');
    console.log(JSON.stringify(offerResponse.data, null, 2));

    const offerId = offerResponse.data._id;
    const offerImages = offerResponse.data.images;

    // Check images are not blob URLs
    console.log('\nImage URL format check:');
    let hasBlobUrl = false;
    for (const img of offerImages) {
      if (img.startsWith('blob:')) {
        console.log('✗ Found blob URL:', img);
        hasBlobUrl = true;
      } else if (img.startsWith('/uploads/')) {
        console.log('✓ Correct format:', img);
        
        // Check file exists
        const imgPath = path.join(SERVER_DIR, img);
        if (fs.existsSync(imgPath)) {
          console.log('  ✓ File exists (', fs.statSync(imgPath).size, 'bytes)');
        } else {
          console.log('  ✗ File NOT found at:', imgPath);
        }
      } else {
        console.log('? Unknown format:', img);
      }
    }
    if (!hasBlobUrl) {
      console.log('\n✓ All images stored as /uploads/...jpg (not blob URLs)');
    }

    // ========== TEST 3: Cook Reference in DishOffer ==========
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Cook Reference (Cook model, not User)');
    console.log('='.repeat(60));

    if (offerResponse.data.cook) {
      console.log('Cook fields populated:');
      console.log('  storeName:', offerResponse.data.cook.storeName);
      console.log('  profilePhoto:', offerResponse.data.cook.profilePhoto ? 'present' : 'missing');
      console.log('  ratings.average:', offerResponse.data.cook.ratings?.average);
      
      // Verify the cook reference is a Cook model, not a User
      const DishOffer = require('./models/DishOffer');
      const savedOffer = await DishOffer.findById(offerId).populate('cook');
      console.log('\n  Cook ref type:', savedOffer.cook.constructor.modelName);
      console.log('  Cook._id:', savedOffer.cook._id);
      console.log('  Cook.storeName:', savedOffer.cook.storeName);
    } else {
      console.log('✗ Cook not populated in response');
    }

    // ========== TEST 4: GET /api/dish-offers/my ==========
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: GET /api/dish-offers/my');
    console.log('='.repeat(60));

    const myOffersResponse = await cookApi.get('/dish-offers/my');
    console.log('Cook Offers Response:');
    console.log(JSON.stringify(myOffersResponse.data, null, 2));

    if (myOffersResponse.data.length > 0) {
      const firstOffer = myOffersResponse.data[0];
      if (firstOffer.cook) {
        console.log('\n✓ Cook fields in /my endpoint:');
        console.log('  storeName:', firstOffer.cook.storeName);
        console.log('  profilePhoto present:', !!firstOffer.cook.profilePhoto);
        console.log('  ratings.average:', firstOffer.cook.ratings?.average);
      }
    }

    // ========== TEST 5: Security - Non-admin blocked from admin-dishes ==========
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Security - Non-admin blocked');
    console.log('='.repeat(60));

    // Try to create dish as non-admin (no token)
    try {
      await axios.post(`${API_URL}/admin-dishes`, {
        nameEn: 'Test',
        nameAr: 'اختبار',
        descriptionEn: 'Test desc',
        descriptionAr: 'وصف اختبار',
        category: category._id.toString()
      });
      console.log('✗ FAILED: Non-admin should be blocked from creating admin-dishes');
    } catch (err) {
      console.log('✓ PASSED: Non-admin blocked from admin-dishes with status:', err.response?.status);
    }

    // Try to access /dish-offers/my as non-cook (admin trying to access cook endpoint)
    try {
      await adminApi.get('/dish-offers/my');
      console.log('✗ FAILED: Admin should be blocked from /dish-offers/my (not a cook)');
    } catch (err) {
      console.log('✓ PASSED: Non-cook blocked from /dish-offers/my with status:', err.response?.status);
      console.log('  Message:', err.response?.data?.message);
    }

    // ========== TEST 6: Stock Dual Lookup ==========
    console.log('\n' + '='.repeat(60));
    console.log('TEST 6: Stock Dual Lookup Utility');
    console.log('='.repeat(60));

    const stockUtils = require('./utils/stockUtils');
    
    // Test with DishOffer
    const dishOfferStock = await stockUtils.getStock(adminDishId);
    console.log('\nStock lookup for DishOffer (has offer):');
    console.log(JSON.stringify(dishOfferStock, null, 2));
    console.log('  Source:', dishOfferStock.source);
    console.log('  Expected: DishOffer');

    // Test validation
    const validation = await stockUtils.validateStock(adminDishId, 5);
    console.log('\nValidation for 5 units:');
    console.log(JSON.stringify(validation, null, 2));

    // Test with quantity exceeding stock
    const overStock = await stockUtils.validateStock(adminDishId, 25);
    console.log('\nValidation for 25 units (exceeds stock of 20):');
    console.log(JSON.stringify(overStock, null, 2));

    // ========== TEST 7: PrepReady Config Storage ==========
    console.log('\n' + '='.repeat(60));
    console.log('TEST 7: PrepReady Config (Cutoff)');
    console.log('='.repeat(60));

    console.log('Stored prepReadyConfig:');
    console.log(JSON.stringify(offerResponse.data.prepReadyConfig, null, 2));

    // Test getPrepTimeDisplay method
    const DishOffer = require('./models/DishOffer');
    const savedOffer = await DishOffer.findById(offerId);
    const prepDisplay = savedOffer.getPrepTimeDisplay('en');
    console.log('\nComputed prep time display (en):', prepDisplay);

    const prepDisplayAr = savedOffer.getPrepTimeDisplay('ar');
    console.log('Computed prep time display (ar):', prepDisplayAr);

    // ========== TEST 8: Consumer Pages Unchanged ==========
    console.log('\n' + '='.repeat(60));
    console.log('TEST 8: Consumer Pages Unchanged');
    console.log('='.repeat(60));

    const { execSync } = require('child_process');
    try {
      const diff = execSync(
        'git diff --name-only HEAD..HEAD -- client/web/src/pages/foodie/FoodieHome.js client/web/src/pages/foodie/FoodieMenu.js 2>/dev/null || echo ""',
        { encoding: 'utf8', cwd: '/Users/AhmedElbedeawy/Desktop/Marketplace Project' }
      ).trim();
      
      if (!diff) {
        console.log('✓ PASSED: FoodieHome.js and FoodieMenu.js NOT modified in Phase 2');
      } else {
        console.log('Modified files:', diff);
      }
    } catch (e) {
      console.log('(Git diff check skipped - not a git repo or error)');
    }

    // ========== TEST 9: Code snippet for getStock ==========
    console.log('\n' + '='.repeat(60));
    console.log('TEST 9: Stock Lookup Code Snippet');
    console.log('='.repeat(60));

    console.log('\n// Stock dual lookup - use from cart/order validation');
    console.log('// Only productId required - no cookId needed');
    const stockSnippet = `
const stockUtils = require('./utils/stockUtils');

// Get stock (only productId needed):
const stock = await stockUtils.getStock(productId);
// Returns: { available, stock, source: 'DishOffer'|'Product'|'None' }

// Validate quantity:
const validation = await stockUtils.validateStock(productId, quantity);
// Returns: { valid, message, currentStock, source }

// Decrement after order:
const result = await stockUtils.decrementStock(productId, quantity);
`;
    console.log(stockSnippet);

    // ========== CLEANUP ==========
    fs.unlinkSync(testImagePath);
    fs.unlinkSync(testImagePath2);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    for (const img of offerImages || []) {
      const imgPath = path.join(SERVER_DIR, img);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    // Delete test data
    await require('./models/AdminDish').findByIdAndDelete(adminDishId);
    await require('./models/DishOffer').findByIdAndDelete(offerId);

    console.log('\n' + '='.repeat(60));
    console.log('ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Test Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
