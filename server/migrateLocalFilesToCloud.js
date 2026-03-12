/**
 * Storage Migration Script
 * 
 * Migrates existing local files to cloud storage (Firebase)
 * 
 * Usage: node migrateLocalFilesToCloud.js
 * 
 * This script will:
 * 1. Scan all local upload directories
 * 2. Check which files still exist locally
 * 3. Upload them to Firebase Cloud Storage
 * 4. Update the database records with new cloud URLs
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const storageService = require('./services/storageService');

// Import models
const AdminDish = require('./models/AdminDish');
const DishOffer = require('./models/DishOffer');
const Category = require('./models/Category');
const Settings = require('./models/Settings');

const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Track migration progress
const migrationResults = {
  totalFiles: 0,
  migrated: 0,
  skipped: 0,
  failed: 0,
  details: []
};

/**
 * Migrate a single file to cloud storage
 */
async function migrateFile(localPath) {
  const fullPath = path.join(UPLOAD_DIR, localPath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    return { success: false, reason: 'File not found', url: null };
  }
  
  try {
    // Read file
    const buffer = fs.readFileSync(fullPath);
    const filename = path.basename(localPath);
    
    // Determine category from path
    const category = localPath.split('/')[0];
    
    // Upload to cloud
    const cloudUrl = await storageService.processAndSaveImage(buffer, {
      category: category,
      filename: filename,
      width: 800,  // Default width
      height: 600  // Default height
    });
    
    return { success: true, url: cloudUrl };
  } catch (error) {
    return { success: false, reason: error.message, url: null };
  }
}

/**
 * Migrate AdminDish images
 */
async function migrateAdminDishes() {
  console.log('\n📦 Migrating AdminDish images...');
  
  const dishes = await AdminDish.find({}).lean();
  
  for (const dish of dishes) {
    // Migrate main image
    if (dish.image && dish.image.startsWith('/uploads/')) {
      migrationResults.totalFiles++;
      const result = await migrateFile(dish.image);
      
      if (result.success) {
        await AdminDish.findByIdAndUpdate(dish._id, { image: result.url });
        migrationResults.migrated++;
        migrationResults.details.push({ type: 'AdminDish', id: dish._id, old: dish.image, new: result.url });
      } else {
        migrationResults.failed++;
        console.log(`  ⚠️  Failed: ${dish.image} - ${result.reason}`);
      }
    }
    
    // Migrate additional images
    if (dish.images && dish.images.length > 0) {
      for (let i = 0; i < dish.images.length; i++) {
        const img = dish.images[i];
        if (img && img.startsWith('/uploads/')) {
          migrationResults.totalFiles++;
          const result = await migrateFile(img);
          
          if (result.success) {
            dish.images[i] = result.url;
            migrationResults.migrated++;
          } else {
            migrationResults.failed++;
          }
        }
      }
      await AdminDish.findByIdAndUpdate(dish._id, { images: dish.images });
    }
  }
  
  console.log(`  ✅ AdminDish migration complete`);
}

/**
 * Migrate DishOffer images
 */
async function migrateDishOffers() {
  console.log('\n📦 Migrating DishOffer images...');
  
  const offers = await DishOffer.find({}).lean();
  
  for (const offer of offers) {
    // Migrate images array
    if (offer.images && offer.images.length > 0) {
      for (let i = 0; i < offer.images.length; i++) {
        const img = offer.images[i];
        if (img && img.startsWith('/uploads/')) {
          migrationResults.totalFiles++;
          const result = await migrateFile(img);
          
          if (result.success) {
            offer.images[i] = result.url;
            migrationResults.migrated++;
            migrationResults.details.push({ type: 'DishOffer', id: offer._id, index: i, old: img, new: result.url });
          } else {
            migrationResults.failed++;
            console.log(`  ⚠️  Failed: ${img} - ${result.reason}`);
          }
        }
      }
      await DishOffer.findByIdAndUpdate(offer._id, { images: offer.images });
    }
  }
  
  console.log(`  ✅ DishOffer migration complete`);
}

/**
 * Migrate Category icons
 */
async function migrateCategories() {
  console.log('\n📦 Migrating Category icons...');
  
  const categories = await Category.find({}).lean();
  
  for (const cat of categories) {
    // Migrate web icon
    if (cat.icons?.web && cat.icons.web.startsWith('/uploads/')) {
      migrationResults.totalFiles++;
      const result = await migrateFile(cat.icons.web);
      
      if (result.success) {
        cat.icons.web = result.url;
        migrationResults.migrated++;
        migrationResults.details.push({ type: 'Category', id: cat._id, field: 'icons.web', old: cat.icons.web, new: result.url });
      } else {
        migrationResults.failed++;
        console.log(`  ⚠️  Failed: ${cat.icons.web} - ${result.reason}`);
      }
    }
    
    // Migrate mobile icon
    if (cat.icons?.mobile && cat.icons.mobile.startsWith('/uploads/')) {
      migrationResults.totalFiles++;
      const result = await migrateFile(cat.icons.mobile);
      
      if (result.success) {
        cat.icons.mobile = result.url;
        migrationResults.migrated++;
        migrationResults.details.push({ type: 'Category', id: cat._id, field: 'icons.mobile', old: cat.icons.mobile, new: result.url });
      } else {
        migrationResults.failed++;
        console.log(`  ⚠️  Failed: ${cat.icons.mobile} - ${result.reason}`);
      }
    }
    
    await Category.findByIdAndUpdate(cat._id, { icons: cat.icons });
  }
  
  console.log(`  ✅ Category migration complete`);
}

/**
 * Migrate Settings hero images
 */
async function migrateHeroImages() {
  console.log('\n📦 Migrating Hero images...');
  
  const settings = await Settings.findOne({}).lean();
  
  if (settings?.heroImages && settings.heroImages.length > 0) {
    for (let i = 0; i < settings.heroImages.length; i++) {
      const hero = settings.heroImages[i];
      if (hero?.imageUrl && hero.imageUrl.startsWith('/uploads/')) {
        migrationResults.totalFiles++;
        const result = await migrateFile(hero.imageUrl);
        
        if (result.success) {
          settings.heroImages[i].imageUrl = result.url;
          migrationResults.migrated++;
          migrationResults.details.push({ type: 'Settings', index: i, old: hero.imageUrl, new: result.url });
        } else {
          migrationResults.failed++;
          console.log(`  ⚠️  Failed: ${hero.imageUrl} - ${result.reason}`);
        }
      }
    }
    await Settings.updateOne({}, { heroImages: settings.heroImages });
  }
  
  console.log(`  ✅ Hero images migration complete`);
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('===========================================');
  console.log('🚀 Starting Cloud Storage Migration');
  console.log('===========================================');
  
  // Check cloud storage status
  const stats = storageService.getStorageStats();
  console.log(`\n📡 Cloud Storage Status: ${stats.cloudStorageEnabled ? '✅ Enabled' : '❌ Disabled'}`);
  
  if (!stats.cloudStorageEnabled) {
    console.log('\n❌ ERROR: Cloud storage is not configured!');
    console.log('Please ensure FIREBASE_STORAGE_BUCKET is set in .env');
    process.exit(1);
  }
  
  // Connect to database
  console.log('\n🔌 Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');
  
  // Run migrations
  await migrateAdminDishes();
  await migrateDishOffers();
  await migrateCategories();
  await migrateHeroImages();
  
  // Summary
  console.log('\n===========================================');
  console.log('📊 Migration Summary');
  console.log('===========================================');
  console.log(`Total files processed: ${migrationResults.totalFiles}`);
  console.log(`Successfully migrated: ${migrationResults.migrated}`);
  console.log(`Failed: ${migrationResults.failed}`);
  console.log('===========================================');
  
  // Save detailed results
  const reportPath = path.join(__dirname, 'migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(migrationResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  await mongoose.disconnect();
  console.log('\n✅ Migration complete!');
  
  process.exit(0);
}

// Run if called directly
runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
