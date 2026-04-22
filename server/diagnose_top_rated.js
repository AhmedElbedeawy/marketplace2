const mongoose = require('mongoose');
require('dotenv').config();

const Cook = require('./models/Cook');

async function diagnoseTopRatedCooks() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    // Get ALL cooks with isTopRated: true
    const topRatedCooks = await Cook.find({ isTopRated: true })
      .select('userId name storeName status isAvailable countryCode profilePhoto location ratings ordersCount')
      .lean();

    console.log(`📊 Total cooks with isTopRated=true: ${topRatedCooks.length}\n`);

    if (topRatedCooks.length === 0) {
      console.log('❌ No cooks found with isTopRated=true');
      mongoose.disconnect();
      return;
    }

    console.log('='.repeat(80));
    console.log('COOK-BY-COOK ANALYSIS');
    console.log('='.repeat(80));

    topRatedCooks.forEach((cook, index) => {
      console.log(`\n${index + 1}. ${cook.storeName || cook.name}`);
      console.log(`   _id: ${cook._id}`);
      console.log(`   userId: ${cook.userId}`);
      console.log(`   status: ${cook.status}`);
      console.log(`   isAvailable: ${cook.isAvailable}`);
      console.log(`   countryCode: ${cook.countryCode}`);
      console.log(`   location.lat: ${cook.location?.lat}`);
      console.log(`   location.lng: ${cook.location?.lng}`);
      console.log(`   ratings.average: ${cook.ratings?.average}`);
      console.log(`   ordersCount: ${cook.ordersCount}`);
      console.log(`   profilePhoto: ${cook.profilePhoto ? '✅ Has photo' : '❌ No photo'}`);

      // Check which filters would exclude this cook
      const issues = [];
      if (cook.status !== 'active') issues.push('❌ status not active');
      if (!cook.isAvailable) issues.push('❌ isAvailable is false');
      if (cook.countryCode !== 'SA') issues.push(`❌ countryCode is ${cook.countryCode}, not SA`);
      if (!cook.location?.lat || cook.location.lat === 0) issues.push('❌ location.lat is 0 or missing');
      if (!cook.location?.lng || cook.location.lng === 0) issues.push('❌ location.lng is 0 or missing');

      if (issues.length === 0) {
        console.log(`   ✅ WOULD PASS ALL FILTERS`);
      } else {
        console.log(`   ❌ EXCLUDED BY: ${issues.join(', ')}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('FILTER SIMULATION');
    console.log('='.repeat(80));

    // Simulate the exact query from getTopRatedCooks
    const countryCode = 'SA';
    
    const queryResult = await Cook.find({ 
      status: 'active', 
      isAvailable: true, 
      isTopRated: true,
      countryCode: countryCode.toUpperCase(),
      'location.lat': { $ne: 0 },
      'location.lng': { $ne: 0 }
    })
      .select('userId name storeName status isAvailable countryCode location ratings ordersCount')
      .sort({ 'ratings.average': -1, ordersCount: -1 })
      .lean();
    
    console.log('✅ NO distance filter applied (top-rated cooks are platform-wide)');

    console.log(`\n📊 Cooks passing ALL filters: ${queryResult.length}`);
    console.log(`📊 After limit(5): ${Math.min(queryResult.length, 5)}`);

    if (queryResult.length > 0) {
      console.log('\n✅ Cooks that WOULD be returned to mobile:');
      queryResult.slice(0, 5).forEach((cook, index) => {
        console.log(`   ${index + 1}. ${cook.storeName || cook.name} (rating: ${cook.ratings?.average}, orders: ${cook.ordersCount})`);
      });
    }

    // Find cooks that are marked top-rated but excluded
    const excludedCooks = topRatedCooks.filter(topCook => 
      !queryResult.find(queryCook => queryCook._id.toString() === topCook._id.toString())
    );

    if (excludedCooks.length > 0) {
      console.log(`\n❌ Cooks MARKED as Top Rated but EXCLUDED from mobile (${excludedCooks.length}):`);
      excludedCooks.forEach((cook, index) => {
        const issues = [];
        if (cook.status !== 'active') issues.push(`status="${cook.status}"`);
        if (!cook.isAvailable) issues.push('isAvailable=false');
        if (cook.countryCode !== 'SA') issues.push(`countryCode="${cook.countryCode}"`);
        if (!cook.location?.lat || cook.location.lat === 0) issues.push('lat=0');
        if (!cook.location?.lng || cook.location.lng === 0) issues.push('lng=0');

        console.log(`   ${index + 1}. ${cook.storeName || cook.name} - Excluded because: ${issues.join(', ')}`);
      });
    }

    mongoose.disconnect();
    console.log('\n✅ Diagnosis complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    mongoose.disconnect();
    process.exit(1);
  }
}

diagnoseTopRatedCooks();
