/**
 * One-time DB repair script
 * Fixes existing approved cooks who have role_cook_status='active' but isCook=false
 * 
 * Usage: cd server && node scripts/fixCookIsCookFlag.js
 * 
 * IMPORTANT: This script loads MONGO_URI from server/.env
 * Make sure you run it from the server directory or set MONGO_URI environment variable.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env (same as backend)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

async function fixCookIsCookFlag() {
  console.log('🔧 Starting DB repair: Fixing isCook flag for approved cooks...\n');

  // Validate MONGO_URI is loaded (try both MONGO_URI and MONGODB_URI for compatibility)
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ ERROR: MONGO_URI environment variable is not set!');
    console.error('');
    console.error('This script requires MONGO_URI to connect to the database.');
    console.error('Make sure server/.env exists and contains MONGO_URI=...');
    console.error('');
    console.error('Current working directory:', process.cwd());
    console.error('Expected .env location:', path.join(__dirname, '..', '.env'));
    console.error('');
    process.exit(1);
  }

  console.log('✅ MONGO_URI loaded (connecting to:', mongoUri.substring(0, 40) + '...)');
  console.log('');

  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all users with role_cook_status='active' but isCook=false/missing
    const brokenCooks = await User.find({
      role_cook_status: 'active',
      isCook: { $ne: true }
    });

    console.log(`📊 Found ${brokenCooks.length} cook(s) with role_cook_status='active' but isCook!=true\n`);

    if (brokenCooks.length === 0) {
      console.log('✅ No repairs needed. All approved cooks have isCook=true');
      process.exit(0);
    }

    // Show affected users
    console.log('Affected users:');
    brokenCooks.forEach(user => {
      console.log(`  - ${user.email} (isCook: ${user.isCook}, role: ${user.role})`);
    });
    console.log('');

    // Fix them
    const result = await User.updateMany(
      { role_cook_status: 'active', isCook: { $ne: true } },
      { $set: { isCook: true } }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} user(s)\n`);

    // Verify the fix
    const stillBroken = await User.countDocuments({
      role_cook_status: 'active',
      isCook: { $ne: true }
    });

    if (stillBroken === 0) {
      console.log('✅ VERIFICATION PASSED: All approved cooks now have isCook=true');
    } else {
      console.log(`⚠️  WARNING: ${stillBroken} user(s) still have isCook!=true`);
    }

    // Show fixed users
    const fixedCooks = await User.find({ role_cook_status: 'active' }).select('email isCook role role_cook_status');
    console.log('\n📋 Current approved cooks:');
    fixedCooks.forEach(user => {
      console.log(`  ✓ ${user.email} (isCook: ${user.isCook}, role: ${user.role}, status: ${user.role_cook_status})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixCookIsCookFlag();
