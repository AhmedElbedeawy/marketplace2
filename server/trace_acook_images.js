/**
 * Trace exact image fields for Acook@test.com
 * Check what's in User model vs Cook model
 */
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Cook = require('./models/Cook');

async function traceImageFields() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: 'acook@test.com' }).lean();
    
    if (!user) {
      console.log('❌ User not found: acook@test.com');
      process.exit(1);
    }

    console.log('=== USER MODEL ===');
    console.log('User ID:', user._id);
    console.log('User Name:', user.name);
    console.log('User role_cook_status:', user.role_cook_status);
    console.log('User profilePhoto:', user.profilePhoto);
    console.log('');

    // Find cook profile
    const cook = await Cook.findOne({ userId: user._id }).lean();
    
    if (!cook) {
      console.log('❌ Cook profile not found for this user');
      process.exit(1);
    }

    console.log('=== COOK MODEL ===');
    console.log('Cook ID:', cook._id);
    console.log('Cook Name:', cook.name);
    console.log('Cook storeName:', cook.storeName);
    console.log('Cook profilePhoto:', cook.profilePhoto);
    console.log('Cook originalPhoto:', cook.originalPhoto);
    console.log('');

    console.log('=== ANALYSIS ===');
    console.log('User profilePhoto exists:', !!user.profilePhoto);
    console.log('Cook profilePhoto exists:', !!cook.profilePhoto);
    console.log('');

    console.log('=== WHAT EACH SURFACE SEES ===');
    console.log('');
    console.log('1. PUBLIC SURFACES (Top-Rated Cards, Dish Pages):');
    console.log('   Source: Cook model directly');
    console.log('   Field: cook.profilePhoto');
    console.log('   Value:', cook.profilePhoto || '(empty)');
    console.log('');

    console.log('2. ACCOUNT PAGE AVATAR (FoodieSettings.js line 521):');
    console.log('   Logic: user.role_cook_status !== "none" ? (user.cookProfilePhoto || user.profilePhoto) : user.profilePhoto');
    console.log('   Since user.role_cook_status =', user.role_cook_status);
    console.log('   It checks: user.cookProfilePhoto || user.profilePhoto');
    console.log('   user.cookProfilePhoto:', user.cookProfilePhoto || '(not set)');
    console.log('   user.profilePhoto:', user.profilePhoto || '(empty)');
    console.log('   RESULT:', user.cookProfilePhoto || user.profilePhoto || '(BOTH EMPTY - shows initials)');
    console.log('');

    console.log('3. HEADER AVATAR (FoodieHeader.js line 274):');
    console.log('   Same logic as Account Page');
    console.log('   RESULT:', user.cookProfilePhoto || user.profilePhoto || '(BOTH EMPTY - shows initials)');
    console.log('');

    console.log('=== ROOT CAUSE ===');
    if (cook.profilePhoto && !user.cookProfilePhoto) {
      console.log('❌ Cook.profilePhoto HAS the image, but user.cookProfilePhoto is EMPTY');
      console.log('❌ Account surfaces are reading from User.cookProfilePhoto which is not synced');
      console.log('✅ Public surfaces read from Cook.profilePhoto which has the image');
    } else if (cook.profilePhoto === user.cookProfilePhoto) {
      console.log('✅ Both fields have the same value');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

traceImageFields();
