/**
 * Category Migration Script
 * 
 * This script migrates existing categories to add the new bilingual fields:
 * - nameEn (required, copy from legacy name)
 * - nameAr (required, copy from existing nameAr or legacy name)
 * - icons.web, icons.mobile (empty for now, can be uploaded via admin)
 * - sortOrder (based on old hardcoded display order)
 * 
 * Run with: node migrateCategories.js
 * 
 * NOTE: This is a ONE-TIME migration. After running, new categories should
 * use the API with the new fields.
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Connect to database
const connectDB = require('./config/db');
connectDB();

const Category = require('./models/Category');

// Old hardcoded display order from frontend
const OLD_DISPLAY_ORDER = [
  'Roasted',      // was id: '1'
  'Grilled',      // was id: '2'
  'Casseroles',   // was id: '3'
  'Traditional',  // was id: '4'
  'Fried',        // was id: '5'
  'Oven',         // was id: '6'
  'Sides'         // was id: '7'
];

// Build legacy name to sortOrder mapping
const legacyOrderMap = {};
OLD_DISPLAY_ORDER.forEach((name, idx) => {
  legacyOrderMap[name.toLowerCase()] = idx;
});

async function migrate() {
  console.log('🚀 Starting category migration...\n');
  
  try {
    const categories = await Category.find().sort({ _id: 1 });
    
    console.log(`Found ${categories.length} categories to migrate.\n`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const category of categories) {
      try {
        const updates = {};
        let hasChanges = false;
        
        // 1. Set nameEn (required) - copy from legacy name
        if (!category.nameEn) {
          updates.nameEn = category.name;
          hasChanges = true;
        }
        
        // 2. Set nameAr (required) - use existing or copy from legacy name
        if (!category.nameAr) {
          updates.nameAr = category.name;
          hasChanges = true;
        }
        
        // 3. Set icons structure (ensure icons object exists)
        if (!category.icons) {
          updates.icons = { web: '', mobile: '' };
          hasChanges = true;
        } else {
          // Ensure both web and mobile exist
          if (!category.icons.web) {
            updates['icons.web'] = '';
            hasChanges = true;
          }
          if (!category.icons.mobile) {
            updates['icons.mobile'] = '';
            hasChanges = true;
          }
        }
        
        // 4. Set sortOrder (based on legacy hardcoded order)
        // Unknown categories get 99 (appended at end)
        if (category.sortOrder === undefined || category.sortOrder === 0) {
          const legacyOrder = legacyOrderMap[category.name.toLowerCase()];
          updates.sortOrder = legacyOrder !== undefined ? legacyOrder : 99;
          hasChanges = true;
        }
        
        // 5. Ensure nameAr is required (some may be empty string)
        if (category.nameAr === '') {
          updates.nameAr = category.name;
          hasChanges = true;
        }
        
        if (hasChanges) {
          await Category.findByIdAndUpdate(category._id, updates);
          console.log(`✅ Migrated: ${category.name}`);
          console.log(`   - nameEn: "${updates.nameEn}"`);
          console.log(`   - nameAr: "${updates.nameAr}"`);
          console.log(`   - sortOrder: ${updates.sortOrder}`);
          console.log(`   - icons.web: "${updates.icons?.web || updates['icons.web'] || ''}"`);
          console.log(`   - icons.mobile: "${updates.icons?.mobile || updates['icons.mobile'] || ''}"\n`);
          migrated++;
        } else {
          console.log(`⏭ Skipped (already migrated): ${category.name}`);
          skipped++;
        }
      } catch (err) {
        console.error(`❌ Error migrating ${category.name}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Errors: ${errors}`);
    console.log('\n✅ Migration complete!');
    
    // Verify the migration
    console.log('\n🔍 Verification - Sample categories after migration:\n');
    const samples = await Category.find().sort({ sortOrder: 1 }).limit(5);
    samples.forEach(cat => {
      console.log(`  [${cat.sortOrder}] ${cat.nameEn} / ${cat.nameAr}`);
      console.log(`      icons.web: ${cat.icons?.web || '(empty)'} | icons.mobile: ${cat.icons?.mobile || '(empty)'}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
    process.exit(0);
  }
}

// Run migration
migrate();
