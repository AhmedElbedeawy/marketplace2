const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Cook = require('./models/Cook');

async function testTopRatedResponse() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    // Simulate the exact query from getTopRatedCooks
    const countryCode = 'SA';
    
    const cooks = await Cook.find({ 
      status: 'active', 
      isAvailable: true, 
      isTopRated: true,
      countryCode: countryCode.toUpperCase(),
      'location.lat': { $ne: 0 },
      'location.lng': { $ne: 0 }
    })
      .sort({ 'ratings.average': -1, ordersCount: -1 })
      .populate('userId', 'name email')
      .lean();

    console.log('='.repeat(80));
    console.log('EXACT API RESPONSE STRUCTURE');
    console.log('='.repeat(80));
    console.log(`\nTotal cooks returned: ${cooks.length}\n`);

    if (cooks.length > 0) {
      console.log('FIRST COOK OBJECT (exact structure mobile will receive):');
      console.log('='.repeat(80));
      console.log(JSON.stringify(cooks[0], null, 2));
      
      console.log('\n' + '='.repeat(80));
      console.log('FIELD MAPPING ANALYSIS');
      console.log('='.repeat(80));
      
      const cook = cooks[0];
      console.log('\nBackend Cook model fields:');
      console.log(`  _id: ${cook._id}`);
      console.log(`  name: ${cook.name}`);
      console.log(`  storeName: ${cook.storeName}`);
      console.log(`  profilePhoto: ${cook.profilePhoto}`);
      console.log(`  ratings.average: ${cook.ratings?.average}`);
      console.log(`  ratings.count: ${cook.ratings?.count}`);
      console.log(`  ordersCount: ${cook.ordersCount}`);
      console.log(`  expertise: ${cook.expertise}`);
      console.log(`  userId.name: ${cook.userId?.name}`);
      
      console.log('\nMobile Chef.fromJson expects:');
      console.log(`  id: json['_id'] ✅`);
      console.log(`  name: json['name'] ✅ (but should it be storeName?)`);
      console.log(`  profileImage: json['profileImage'] ❌ Backend has 'profilePhoto'`);
      console.log(`  rating: json['rating'] ❌ Backend has 'ratings.average'`);
      console.log(`  reviewCount: json['reviewCount'] ❌ Backend has 'ratings.count'`);
      console.log(`  expertise: json['expertise'] ⚠️  Backend has array of ObjectIds`);
      console.log(`  ordersCount: json['ordersCount'] ✅`);
    }

    mongoose.disconnect();
    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    mongoose.disconnect();
    process.exit(1);
  }
}

testTopRatedResponse();
