/**
 * Cloud Upload Verification Test
 * 
 * Tests that new uploads save to cloud storage and persist after restart.
 * 
 * Usage: 
 * 1. First, manually upload test images via:
 *    - Admin panel: Upload a category icon
 *    - Cook Hub: Upload a dish offer image
 * 2. Then run this script to verify cloud URLs
 * 
 * node testCloudUploads.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

// Import models
const AdminDish = require('./models/AdminDish');
const DishOffer = require('./models/DishOffer');
const Category = require('./models/Category');
const Cook = require('./models/Cook');

/**
 * Check if URL is a cloud URL
 */
function isCloudUrl(url) {
  return url && (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('storage.googleapis.com')
  );
}

/**
 * Check if URL is a local path
 */
function isLocalPath(url) {
  return url && url.startsWith('/uploads/');
}

/**
 * Verify DishOffers
 */
async function verifyDishOffers() {
  console.log('\n📦 Checking DishOffers for cloud URLs...');
  
  const offers = await DishOffer.find({}).sort({ updatedAt: -1 }).limit(3).lean();
  
  for (const offer of offers) {
    console.log(`\n  DishOffer: ${offer.name} (${offer._id})`);
    
    if (offer.images && offer.images.length > 0) {
      for (let i = 0; i < offer.images.length; i++) {
        const img = offer.images[i];
        if (img) {
          const isCloud = isCloudUrl(img);
          const isLocal = isLocalPath(img);
          console.log(`    images[${i}]: ${isCloud ? '☁️ CLOUD' : (isLocal ? '❌ LOCAL' : '❓ OTHER')}`);
          console.log(`      URL: ${img.substring(0, 80)}...`);
        }
      }
    } else {
      console.log('    (no images)');
    }
  }
}

/**
 * Verify Categories
 */
async function verifyCategories() {
  console.log('\n📦 Checking Categories for cloud URLs...');
  
  const categories = await Category.find({}).sort({ updatedAt: -1 }).limit(3).lean();
  
  for (const cat of categories) {
    console.log(`\n  Category: ${cat.nameEn || cat.name} (${cat._id})`);
    
    if (cat.icons?.web) {
      const isCloud = isCloudUrl(cat.icons.web);
      const isLocal = isLocalPath(cat.icons.web);
      console.log(`    web icon: ${isCloud ? '☁️ CLOUD' : (isLocal ? '❌ LOCAL' : '❓ OTHER')}`);
      console.log(`      URL: ${cat.icons.web.substring(0, 80)}...`);
    }
    
    if (cat.icons?.mobile) {
      const isCloud = isCloudUrl(cat.icons.mobile);
      const isLocal = isLocalPath(cat.icons.mobile);
      console.log(`    mobile icon: ${isCloud ? '☁️ CLOUD' : (isLocal ? '❌ LOCAL' : '❓ OTHER')}`);
      console.log(`      URL: ${cat.icons.mobile.substring(0, 80)}...`);
    }
  }
}

/**
 * Verify Cooks
 */
async function verifyCooks() {
  console.log('\n📦 Checking Cooks for cloud URLs...');
  
  const cooks = await Cook.find({}).sort({ updatedAt: -1 }).limit(3).lean();
  
  for (const cook of cooks) {
    console.log(`\n  Cook: ${cook.name} (${cook._id})`);
    
    if (cook.profilePhoto) {
      const isCloud = isCloudUrl(cook.profilePhoto);
      const isLocal = isLocalPath(cook.profilePhoto);
      console.log(`    profilePhoto: ${isCloud ? '☁️ CLOUD' : (isLocal ? '❌ LOCAL' : '❓ OTHER')}`);
      console.log(`      URL: ${cook.profilePhoto.substring(0, 80)}...`);
    } else {
      console.log('    (no profile photo)');
    }
  }
}

/**
 * Main verification
 */
async function runVerification() {
  console.log('===========================================');
  console.log('☁️  Cloud Upload Verification Test');
  console.log('===========================================');
  
  // Connect to database
  console.log('\n🔌 Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');
  
  // Run verifications
  await verifyDishOffers();
  await verifyCategories();
  await verifyCooks();
  
  console.log('\n===========================================');
  console.log('✅ Verification complete');
  console.log('===========================================');
  console.log('\nTo complete persistence test:');
  console.log('1. Restart the server');
  console.log('2. Run this script again');
  console.log('3. Verify URLs are still cloud URLs');
  console.log('4. Test image loading in web/mobile/admin');
  
  await mongoose.disconnect();
  process.exit(0);
}

runVerification().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
