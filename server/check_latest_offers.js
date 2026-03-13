require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const DishOffer = require('./models/DishOffer');

async function checkLatestOffers() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const offers = await DishOffer.find({}).sort({ createdAt: -1 }).limit(3);
  
  console.log('\n=== LATEST DISH OFFERS ===\n');
  offers.forEach(o => {
    console.log(`Name: ${o.name || 'N/A'} (${o._id})`);
    console.log(`  countryCode: ${o.countryCode}`);
    console.log(`  images count: ${o.images?.length || 0}`);
    if (o.images && o.images.length > 0) {
      o.images.forEach((img, i) => {
        const isCloud = img.includes('firebasestorage.googleapis.com') || img.includes('storage.googleapis.com');
        const isLocal = img.startsWith('/uploads/');
        console.log(`    [${i}] ${isCloud ? '☁️ CLOUD' : (isLocal ? '❌ LOCAL' : '❓ OTHER')}: ${img.substring(0, 80)}...`);
      });
    }
    console.log();
  });
  
  await mongoose.disconnect();
}

checkLatestOffers().catch(console.error);
