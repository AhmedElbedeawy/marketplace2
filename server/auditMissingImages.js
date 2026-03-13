/**
 * Missing Images Audit Script
 * 
 * Scans database for records with local /uploads/... paths
 * and checks if those files exist locally.
 * 
 * Usage: node auditMissingImages.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import models
const AdminDish = require('./models/AdminDish');
const DishOffer = require('./models/DishOffer');
const Category = require('./models/Category');
const Settings = require('./models/Settings');
const Cook = require('./models/Cook');

const UPLOAD_DIR = path.join(__dirname, 'uploads');

const auditResults = {
  adminDishes: { total: 0, withImages: 0, missingImages: 0, records: [] },
  dishOffers: { total: 0, withImages: 0, missingImages: 0, records: [] },
  categories: { total: 0, withIcons: 0, missingIcons: 0, records: [] },
  heroImages: { total: 0, withImages: 0, missingImages: 0, records: [] },
  cooks: { total: 0, withPhotos: 0, missingPhotos: 0, records: [] }
};

/**
 * Check if local file exists
 */
function localFileExists(filePath) {
  if (!filePath || !filePath.startsWith('/uploads/')) return false;
  const fullPath = path.join(__dirname, filePath);
  return fs.existsSync(fullPath);
}

/**
 * Check if URL is a cloud URL (Firebase)
 */
function isCloudUrl(url) {
  return url && (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('storage.googleapis.com') ||
    url.startsWith('https://')
  );
}

/**
 * Audit AdminDishes
 */
async function auditAdminDishes() {
  console.log('\n📦 Auditing AdminDishes...');
  
  const dishes = await AdminDish.find({}).lean();
  auditResults.adminDishes.total = dishes.length;
  
  for (const dish of dishes) {
    const record = { _id: dish._id, name: dish.name, images: [] };
    let hasMissing = false;
    
    // Check main image
    if (dish.image) {
      const exists = localFileExists(dish.image);
      const isCloud = isCloudUrl(dish.image);
      record.images.push({ 
        field: 'image', 
        url: dish.image, 
        exists: exists, 
        isCloud: isCloud,
        status: isCloud ? '☁️ Cloud' : (exists ? '✅ Exists' : '❌ Missing')
      });
      if (!exists && !isCloud) hasMissing = true;
      auditResults.adminDishes.withImages++;
    }
    
    // Check additional images
    if (dish.images && dish.images.length > 0) {
      for (let i = 0; i < dish.images.length; i++) {
        const img = dish.images[i];
        if (img) {
          const exists = localFileExists(img);
          const isCloud = isCloudUrl(img);
          record.images.push({ 
            field: `images[${i}]`, 
            url: img, 
            exists: exists,
            isCloud: isCloud,
            status: isCloud ? '☁️ Cloud' : (exists ? '✅ Exists' : '❌ Missing')
          });
          if (!exists && !isCloud) hasMissing = true;
        }
      }
    }
    
    if (record.images.length > 0) {
      auditResults.adminDishes.records.push(record);
      if (hasMissing) auditResults.adminDishes.missingImages++;
    }
  }
  
  console.log(`  Total: ${auditResults.adminDishes.total}`);
  console.log(`  With images: ${auditResults.adminDishes.withImages}`);
  console.log(`  With missing: ${auditResults.adminDishes.missingImages}`);
}

/**
 * Audit DishOffers
 */
async function auditDishOffers() {
  console.log('\n📦 Auditing DishOffers...');
  
  const offers = await DishOffer.find({}).lean();
  auditResults.dishOffers.total = offers.length;
  
  for (const offer of offers) {
    const record = { _id: offer._id, name: offer.name, images: [] };
    let hasMissing = false;
    
    if (offer.images && offer.images.length > 0) {
      for (let i = 0; i < offer.images.length; i++) {
        const img = offer.images[i];
        if (img) {
          const exists = localFileExists(img);
          const isCloud = isCloudUrl(img);
          record.images.push({ 
            field: `images[${i}]`, 
            url: img, 
            exists: exists,
            isCloud: isCloud,
            status: isCloud ? '☁️ Cloud' : (exists ? '✅ Exists' : '❌ Missing')
          });
          if (!exists && !isCloud) hasMissing = true;
        }
      }
    }
    
    if (record.images.length > 0) {
      auditResults.dishOffers.records.push(record);
      auditResults.dishOffers.withImages++;
      if (hasMissing) auditResults.dishOffers.missingImages++;
    }
  }
  
  console.log(`  Total: ${auditResults.dishOffers.total}`);
  console.log(`  With images: ${auditResults.dishOffers.withImages}`);
  console.log(`  With missing: ${auditResults.dishOffers.missingImages}`);
}

/**
 * Audit Categories
 */
async function auditCategories() {
  console.log('\n📦 Auditing Categories...');
  
  const categories = await Category.find({}).lean();
  auditResults.categories.total = categories.length;
  
  for (const cat of categories) {
    const record = { _id: cat._id, name: cat.name || cat.nameEn, icons: [] };
    let hasMissing = false;
    
    if (cat.icons?.web) {
      const exists = localFileExists(cat.icons.web);
      const isCloud = isCloudUrl(cat.icons.web);
      record.icons.push({ 
        field: 'icons.web', 
        url: cat.icons.web, 
        exists: exists,
        isCloud: isCloud,
        status: isCloud ? '☁️ Cloud' : (exists ? '✅ Exists' : '❌ Missing')
      });
      if (!exists && !isCloud) hasMissing = true;
      auditResults.categories.withIcons++;
    }
    
    if (cat.icons?.mobile) {
      const exists = localFileExists(cat.icons.mobile);
      const isCloud = isCloudUrl(cat.icons.mobile);
      record.icons.push({ 
        field: 'icons.mobile', 
        url: cat.icons.mobile, 
        exists: exists,
        isCloud: isCloud,
        status: isCloud ? '☁️ Cloud' : (exists ? '✅ Exists' : '❌ Missing')
      });
      if (!exists && !isCloud) hasMissing = true;
    }
    
    // Legacy icon field
    if (cat.icon && !cat.icons?.web) {
      const exists = localFileExists(cat.icon);
      const isCloud = isCloudUrl(cat.icon);
      record.icons.push({ 
        field: 'icon (legacy)', 
        url: cat.icon, 
        exists: exists,
        isCloud: isCloud,
        status: isCloud ? '☁️ Cloud' : (exists ? '✅ Exists' : '❌ Missing')
      });
      if (!exists && !isCloud) hasMissing = true;
      auditResults.categories.withIcons++;
    }
    
    if (record.icons.length > 0) {
      auditResults.categories.records.push(record);
      if (hasMissing) auditResults.categories.missingIcons++;
    }
  }
  
  console.log(`  Total: ${auditResults.categories.total}`);
  console.log(`  With icons: ${auditResults.categories.withIcons}`);
  console.log(`  With missing: ${auditResults.categories.missingIcons}`);
}

/**
 * Audit Hero Images
 */
async function auditHeroImages() {
  console.log('\n📦 Auditing Hero Images...');
  
  const settings = await Settings.findOne({}).lean();
  if (!settings?.heroImages) {
    console.log('  No hero images found');
    return;
  }
  
  auditResults.heroImages.total = settings.heroImages.length;
  
  for (let i = 0; i < settings.heroImages.length; i++) {
    const hero = settings.heroImages[i];
    if (hero?.imageUrl) {
      const exists = localFileExists(hero.imageUrl);
      const isCloud = isCloudUrl(hero.imageUrl);
      auditResults.heroImages.records.push({
        index: i,
        url: hero.imageUrl,
        exists: exists,
        isCloud: isCloud,
        status: isCloud ? '☁️ Cloud' : (exists ? '✅ Exists' : '❌ Missing')
      });
      auditResults.heroImages.withImages++;
      if (!exists && !isCloud) auditResults.heroImages.missingImages++;
    }
  }
  
  console.log(`  Total: ${auditResults.heroImages.total}`);
  console.log(`  With images: ${auditResults.heroImages.withImages}`);
  console.log(`  With missing: ${auditResults.heroImages.missingImages}`);
}

/**
 * Audit Cook profile photos
 */
async function auditCooks() {
  console.log('\n📦 Auditing Cooks...');
  
  const cooks = await Cook.find({}).lean();
  auditResults.cooks.total = cooks.length;
  
  for (const cook of cooks) {
    const record = { _id: cook._id, name: cook.name, photos: [] };
    let hasMissing = false;
    
    if (cook.profilePhoto) {
      const exists = localFileExists(cook.profilePhoto);
      const isCloud = isCloudUrl(cook.profilePhoto);
      record.photos.push({ 
        field: 'profilePhoto', 
        url: cook.profilePhoto, 
        exists: exists,
        isCloud: isCloud,
        status: isCloud ? '☁️ Cloud' : (exists ? '✅ Exists' : '❌ Missing')
      });
      if (!exists && !isCloud) hasMissing = true;
      auditResults.cooks.withPhotos++;
    }
    
    if (cook.originalPhoto) {
      const exists = localFileExists(cook.originalPhoto);
      const isCloud = isCloudUrl(cook.originalPhoto);
      record.photos.push({ 
        field: 'originalPhoto', 
        url: cook.originalPhoto, 
        exists: exists,
        isCloud: isCloud,
        status: isCloud ? '☁️ Cloud' : (exists ? '✅ Exists' : '❌ Missing')
      });
      if (!exists && !isCloud) hasMissing = true;
    }
    
    if (record.photos.length > 0) {
      auditResults.cooks.records.push(record);
      if (hasMissing) auditResults.cooks.missingPhotos++;
    }
  }
  
  console.log(`  Total: ${auditResults.cooks.total}`);
  console.log(`  With photos: ${auditResults.cooks.withPhotos}`);
  console.log(`  With missing: ${auditResults.cooks.missingPhotos}`);
}

/**
 * Main audit function
 */
async function runAudit() {
  console.log('===========================================');
  console.log('🔍 Missing Images Audit');
  console.log('===========================================');
  
  // Connect to database
  console.log('\n🔌 Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');
  
  // Run audits
  await auditAdminDishes();
  await auditDishOffers();
  await auditCategories();
  await auditHeroImages();
  await auditCooks();
  
  // Summary
  console.log('\n===========================================');
  console.log('📊 AUDIT SUMMARY');
  console.log('===========================================');
  
  const totalMissing = 
    auditResults.adminDishes.missingImages +
    auditResults.dishOffers.missingImages +
    auditResults.categories.missingIcons +
    auditResults.heroImages.missingImages +
    auditResults.cooks.missingPhotos;
  
  console.log(`\nTotal records with MISSING local images: ${totalMissing}`);
  
  console.log('\n--- By Entity ---');
  console.log(`AdminDishes: ${auditResults.adminDishes.missingImages} records need attention`);
  console.log(`DishOffers:  ${auditResults.dishOffers.missingImages} records need attention`);
  console.log(`Categories:  ${auditResults.categories.missingIcons} records need attention`);
  console.log(`Hero Images: ${auditResults.heroImages.missingImages} records need attention`);
  console.log(`Cooks:       ${auditResults.cooks.missingPhotos} records need attention`);
  
  console.log('\n--- Cloud vs Local ---');
  const totalCloud = 
    auditResults.adminDishes.records.filter(r => r.images.some(i => i.isCloud)).length +
    auditResults.dishOffers.records.filter(r => r.images.some(i => i.isCloud)).length +
    auditResults.categories.records.filter(r => r.icons.some(i => i.isCloud)).length +
    auditResults.heroImages.records.filter(r => r.isCloud).length +
    auditResults.cooks.records.filter(r => r.photos.some(i => i.isCloud)).length;
  
  console.log(`Records already using Cloud URLs: ${totalCloud}`);
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'missing-images-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  await mongoose.disconnect();
  console.log('\n✅ Audit complete!');
  
  process.exit(0);
}

// Run if called directly
runAudit().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});
