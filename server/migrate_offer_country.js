/**
 * Migration: Set countryCode on existing DishOffers
 * 
 * This script sets the countryCode field on existing DishOffer records
 * by looking up the cook's countryCode.
 * 
 * Run: node server/migrate_offer_country.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const DishOffer = require('./models/DishOffer');
const Cook = require('./models/Cook');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodie';

async function migrate() {
  console.log('🔄 Starting DishOffer countryCode migration...\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all offers without countryCode
    const offersWithoutCountry = await DishOffer.find({ 
      $or: [
        { countryCode: { $exists: false } },
        { countryCode: null },
        { countryCode: '' }
      ]
    });
    
    console.log(`📊 Found ${offersWithoutCountry.length} offers without countryCode`);
    
    if (offersWithoutCountry.length === 0) {
      console.log('✅ No offers need migration');
      return;
    }
    
    let updated = 0;
    let failed = 0;
    
    for (const offer of offersWithoutCountry) {
      try {
        // Get cook's countryCode
        const cook = await Cook.findById(offer.cook);
        
        if (cook && cook.countryCode) {
          offer.countryCode = cook.countryCode;
          await offer.save();
          updated++;
          console.log(`  ✅ Updated offer ${offer._id} with countryCode: ${cook.countryCode}`);
        } else {
          // Default to SA if cook not found or no countryCode
          offer.countryCode = 'SA';
          await offer.save();
          updated++;
          console.log(`  ⚠️  Updated offer ${offer._id} with default countryCode: SA (cook not found)`);
        }
      } catch (err) {
        failed++;
        console.error(`  ❌ Failed to update offer ${offer._id}:`, err.message);
      }
    }
    
    console.log(`\n✅ Migration complete: ${updated} updated, ${failed} failed`);
    
    // Verify
    const remaining = await DishOffer.countDocuments({ 
      $or: [
        { countryCode: { $exists: false } },
        { countryCode: null },
        { countryCode: '' }
      ]
    });
    console.log(`📊 Remaining offers without countryCode: ${remaining}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

migrate();
