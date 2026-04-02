/**
 * Migration Script: Fix Legacy /uploads/... Image Paths
 * 
 * Problem: Some DishOffer documents have image paths like "/uploads/offers/xxx.jpg"
 * which don't exist in production (Cloud Run has no local storage).
 * 
 * Solution: Find all offers with local paths and re-upload to GCS.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Load ALL models to register schemas (required for refs)
const modelsPath = path.join(__dirname, 'models');
fs.readdirSync(modelsPath)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const modelName = path.basename(file, '.js');
    console.log(`Loading model: ${modelName}`);
    require(path.join(modelsPath, file));
  });

// Now load DishOffer after all models are registered
const DishOffer = mongoose.model('DishOffer');
const storageService = require('./services/storageService');

const connectDB = require('./config/db');

async function migrateLegacyUploads() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Database connected');

    // Find all offers with legacy /uploads/... paths
    console.log('\n🔍 Searching for offers with legacy /uploads/... paths...');
    const offersWithLocalPaths = await DishOffer.find({
      images: { $regex: '^/uploads/' }
    });

    console.log(`📊 Found ${offersWithLocalPaths.length} offers with legacy paths`);

    if (offersWithLocalPaths.length === 0) {
      console.log('✅ No migration needed - all offers use GCS URLs');
      return;
    }

    // Process each offer
    let migratedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < offersWithLocalPaths.length; i++) {
      const offer = offersWithLocalPaths[i];
      
      console.log(`\n[${i + 1}/${offersWithLocalPaths.length}] Processing offer ID: ${offer._id}`);
      console.log(`  Current images: ${offer.images.join(', ')}`);

      const updatedImages = [];
      let needsUpdate = false;

      for (const imageUrl of offer.images) {
        if (imageUrl.startsWith('/uploads/')) {
          console.log(`  ⚠️  Legacy path found: ${imageUrl}`);
          
          // Check if file exists locally
          const localPath = path.join(__dirname, imageUrl);
          
          if (fs.existsSync(localPath)) {
            console.log(`  📁 File exists locally, uploading to GCS...`);
            
            try {
              const buffer = fs.readFileSync(localPath);
              const category = imageUrl.split('/')[1] || 'offers';
              const filename = path.basename(imageUrl);
              
              // Upload to GCS via storage service
              const gcsUrl = await storageService.processAndSaveImage(buffer, {
                category,
                filename: filename.replace('.jpg', ''),
                uploadToCloud: true
              });

              // Only accept valid GCS URLs
              if (gcsUrl.includes('storage.googleapis.com') || gcsUrl.includes('firebasestorage.googleapis.com')) {
                console.log(`  ✅ Uploaded to GCS: ${gcsUrl}`);
                updatedImages.push(gcsUrl);
                needsUpdate = true;
              } else {
                console.log(`  ❌ Upload returned non-GCS URL: ${gcsUrl} - keeping original`);
                updatedImages.push(imageUrl);
                failedCount++;
              }
            } catch (error) {
              console.error(`  ❌ Upload failed: ${error.message}`);
              updatedImages.push(imageUrl);
              failedCount++;
            }
          } else {
            console.log(`  ❌ File not found locally: ${localPath}`);
            console.log(`     This offer may have been created on a different server instance`);
            updatedImages.push(imageUrl);
          }
        } else {
          // Already a GCS URL or other format
          updatedImages.push(imageUrl);
        }
      }

      // Update document if changes were made
      if (needsUpdate) {
        try {
          offer.images = updatedImages;
          await offer.save();
          console.log(`  ✅ Offer updated successfully`);
          migratedCount++;
        } catch (error) {
          console.error(`  ❌ Failed to save offer: ${error.message}`);
          failedCount++;
        }
      } else {
        console.log(`  ⏭️  No changes needed (files missing or already migrated)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total offers processed: ${offersWithLocalPaths.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Failed/Skipped: ${failedCount}`);
    console.log(`Remaining with legacy paths: ${offersWithLocalPaths.length - migratedCount}`);
    console.log('='.repeat(60));

    if (failedCount > 0) {
      console.log('\n⚠️  WARNING: Some offers could not be migrated.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

console.log('🚀 Starting legacy upload migration...\n');
migrateLegacyUploads();
