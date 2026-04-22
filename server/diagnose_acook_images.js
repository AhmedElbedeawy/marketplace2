const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Cook = require('./models/Cook');

async function diagnoseACookImages() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    // Find ACook user
    const user = await User.findOne({ email: 'acook@test.com' }).lean();
    
    if (!user) {
      console.log('❌ User acook@test.com not found');
      mongoose.disconnect();
      return;
    }

    console.log('='.repeat(80));
    console.log('USER DATA');
    console.log('='.repeat(80));
    console.log(`_id: ${user._id}`);
    console.log(`name: ${user.name}`);
    console.log(`email: ${user.email}`);
    console.log(`role_cook_status: ${user.role_cook_status}`);
    console.log(`profilePhoto: ${user.profilePhoto ? '✅ HAS VALUE' : '❌ EMPTY/NULL'}`);
    if (user.profilePhoto) {
      console.log(`  Value: ${user.profilePhoto.substring(0, 100)}...`);
    }

    // Find ACook's cook profile
    const cook = await Cook.findOne({ userId: user._id }).lean();
    
    console.log('\n' + '='.repeat(80));
    console.log('COOK DATA');
    console.log('='.repeat(80));
    
    if (!cook) {
      console.log('❌ Cook profile not found');
      mongoose.disconnect();
      return;
    }

    console.log(`_id: ${cook._id}`);
    console.log(`userId: ${cook.userId}`);
    console.log(`storeName: ${cook.storeName}`);
    console.log(`status: ${cook.status}`);
    console.log(`isTopRated: ${cook.isTopRated}`);
    console.log(`profilePhoto: ${cook.profilePhoto ? '✅ HAS VALUE' : '❌ EMPTY/NULL'}`);
    if (cook.profilePhoto) {
      console.log(`  Value: ${cook.profilePhoto.substring(0, 100)}...`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('COMPARISON');
    console.log('='.repeat(80));
    
    const hasUserPhoto = !!user.profilePhoto;
    const hasCookPhoto = !!cook.profilePhoto;
    const photosMatch = user.profilePhoto === cook.profilePhoto;

    console.log(`User.profilePhoto exists: ${hasUserPhoto ? '✅ YES' : '❌ NO'}`);
    console.log(`Cook.profilePhoto exists: ${hasCookPhoto ? '✅ YES' : '❌ NO'}`);
    console.log(`Photos match: ${photosMatch ? '✅ YES' : '❌ NO (MISMATCH!)'}`);

    if (!photosMatch && hasUserPhoto && hasCookPhoto) {
      console.log('\n⚠️  MISMATCH DETECTED:');
      console.log(`User has: ${user.profilePhoto.substring(0, 80)}...`);
      console.log(`Cook has: ${cook.profilePhoto.substring(0, 80)}...`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('WHAT DIFFERENT SURFACES SEE');
    console.log('='.repeat(80));

    console.log('\n📱 PUBLIC SURFACES (dish offers, top-rated cards):');
    console.log(`   Uses: cook.profilePhoto`);
    console.log(`   Value: ${cook.profilePhoto ? '✅ SHOWS IMAGE' : '❌ NO IMAGE'}`);

    console.log('\n👤 ACCOUNT SURFACES (Account avatar, Personal Information):');
    console.log(`   Uses: user.cookProfilePhoto (from /users/profile endpoint)`);
    console.log(`   Which is: cookProfile?.profilePhoto`);
    console.log(`   Value: ${cook.profilePhoto ? '✅ SHOWS IMAGE' : '❌ NO IMAGE'}`);
    console.log(`   Fallback: user.profilePhoto = ${user.profilePhoto ? '✅ HAS FALLBACK' : '❌ NO FALLBACK'}`);

    mongoose.disconnect();
    console.log('\n✅ Diagnosis complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    mongoose.disconnect();
    process.exit(1);
  }
}

diagnoseACookImages();
