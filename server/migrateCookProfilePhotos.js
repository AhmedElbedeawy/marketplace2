/**
 * Migrate Cook Profile Photos from Base64 to Firebase Storage URLs
 * 
 * This script finds all cooks with base64/data URI profile photos
 * and uploads them to Firebase Storage, replacing the stored value
 * with the public URL.
 */

const mongoose = require('mongoose');
const Cook = require('./models/Cook');
const User = require('./models/User');
const { processAndSaveImage } = require('./services/storageService');

async function migrateCookProfilePhotos() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all cooks with profilePhoto starting with 'data:' (base64)
    const cooks = await Cook.find({ 
      profilePhoto: { $regex: /^data:/ } 
    });
    
    console.log(`\n📊 Found ${cooks.length} cooks with base64 profile photos\n`);
    
    if (cooks.length === 0) {
      console.log('✅ No base64 profile photos found - migration complete!');
      mongoose.disconnect();
      return;
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const cook of cooks) {
      try {
        console.log(`\n[${migratedCount + 1}/${cooks.length}] Processing cook: ${cook.storeName || cook.name}`);
        
        const base64Data = cook.profilePhoto;
        
        // Extract base64 data (remove "data:image/jpeg;base64," prefix)
        const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          console.log(`  ⚠️  Skipping - invalid base64 format`);
          errorCount++;
          continue;
        }
        
        const imageType = matches[1];
        const base64String = matches[2];
        
        // Convert base64 to buffer
        const buffer = Buffer.from(base64String, 'base64');
        
        console.log(`  📦 Image size: ${(buffer.length / 1024).toFixed(2)} KB`);
        
        // Upload to Firebase Storage using processAndSaveImage
        const destination = `cooks/${cook._id}/profile`;
        
        console.log(`  ☁️  Uploading to: ${destination}`);
        const publicUrl = await processAndSaveImage(buffer, {
          category: 'cooks',
          filename: `profile-${cook._id}.jpg`,
          width: 400,
          height: 400,
          quality: 85,
          uploadToCloud: true
        });
        
        console.log(`  ✅ Uploaded: ${publicUrl}`);
        
        // Update Cook document
        cook.profilePhoto = publicUrl;
        await cook.save();
        
        // Also update User document to keep in sync
        await User.findByIdAndUpdate(cook.userId, { profilePhoto: publicUrl });
        
        console.log(`  ✓ Migrated successfully`);
        migratedCount++;
        
      } catch (error) {
        console.error(`  ❌ Error migrating cook ${cook._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total base64 photos found: ${cooks.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(50));
    
    if (migratedCount > 0) {
      console.log(`\n✅ Migration complete! ${migratedCount} cook profile photos converted to Firebase Storage URLs`);
      console.log('\n💡 Next steps:');
      console.log('   1. Deploy this change to production');
      console.log('   2. The /dish-offers/by-admin-dish endpoint will now return lightweight URLs');
      console.log('   3. Payload will drop from ~1.97 MB to ~50-100 KB');
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateCookProfilePhotos();
