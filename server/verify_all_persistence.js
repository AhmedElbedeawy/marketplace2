require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const DishOffer = require('./models/DishOffer');
const AdminDish = require('./models/AdminDish');
const Category = require('./models/Category');
const Settings = require('./models/Settings');

async function verifyAllPersistence() {
  await mongoose.connect(process.env.MONGO_URI);
  
  console.log('\n========================================');
  console.log('📊 PROJECT-WIDE IMAGE PERSISTENCE CHECK');
  console.log('========================================\n');
  
  // 1. DishOffers
  console.log('1️⃣  DISH OFFERS');
  const offers = await DishOffer.find({}).sort({ createdAt: -1 }).limit(5);
  let offerCloud = 0, offerLocal = 0, offerOther = 0;
  offers.forEach(o => {
    if (o.images && o.images.length > 0) {
      o.images.forEach(img => {
        if (img.includes('storage.googleapis.com')) offerCloud++;
        else if (img.startsWith('/uploads/')) offerLocal++;
        else offerOther++;
      });
    }
  });
  console.log(`   ☁️  Cloud: ${offerCloud}`);
  console.log(`   ❌ Local: ${offerLocal}`);
  console.log(`   ❓ Other: ${offerOther}\n`);
  
  // 2. Admin Dishes
  console.log('2️⃣  ADMIN DISHES');
  const adminDishes = await AdminDish.find({}).sort({ createdAt: -1 }).limit(5);
  let dishCloud = 0, dishLocal = 0, dishOther = 0;
  adminDishes.forEach(d => {
    const img = d.imageUrl;
    if (!img) return;
    if (img.includes('storage.googleapis.com')) dishCloud++;
    else if (img.startsWith('/uploads/')) dishLocal++;
    else dishOther++;
  });
  console.log(`   ☁️  Cloud: ${dishCloud}`);
  console.log(`   ❌ Local: ${dishLocal}`);
  console.log(`   ❓ Other: ${dishOther}\n`);
  
  // 3. Categories
  console.log('3️⃣  CATEGORIES');
  const categories = await Category.find({}).sort({ createdAt: -1 }).limit(5);
  let catWebCloud = 0, catWebLocal = 0, catMobileCloud = 0, catMobileLocal = 0;
  categories.forEach(c => {
    if (c.icons?.web) {
      if (c.icons.web.includes('storage.googleapis.com')) catWebCloud++;
      else if (c.icons.web.startsWith('/uploads/')) catWebLocal++;
    }
    if (c.icons?.mobile) {
      if (c.icons.mobile.includes('storage.googleapis.com')) catMobileCloud++;
      else if (c.icons.mobile.startsWith('/uploads/')) catMobileLocal++;
    }
  });
  console.log(`   Web Icons:`);
  console.log(`     ☁️  Cloud: ${catWebCloud}`);
  console.log(`     ❌ Local: ${catWebLocal}`);
  console.log(`   Mobile Icons:`);
  console.log(`     ☁️  Cloud: ${catMobileCloud}`);
  console.log(`     ❌ Local: ${catMobileLocal}\n`);
  
  // 4. Settings (Hero images)
  console.log('4️⃣  SETTINGS (HERO IMAGES)');
  const settings = await Settings.findOne();
  let heroCloud = 0, heroLocal = 0;
  if (settings?.heroImages && settings.heroImages.length > 0) {
    settings.heroImages.forEach(img => {
      if (img.includes('storage.googleapis.com')) heroCloud++;
      else if (img.startsWith('/uploads/')) heroLocal++;
    });
  }
  console.log(`   ☁️  Cloud: ${heroCloud}`);
  console.log(`   ❌ Local: ${heroLocal}\n`);
  
  // Summary
  console.log('========================================');
  console.log('📋 SUMMARY');
  console.log('========================================');
  const totalCloud = offerCloud + dishCloud + catWebCloud + catMobileCloud + heroCloud;
  const totalLocal = offerLocal + dishLocal + catWebLocal + catMobileLocal + heroLocal;
  console.log(`Total Cloud URLs: ${totalCloud}`);
  console.log(`Total Local Paths: ${totalLocal}`);
  console.log(`========================================\n`);
  
  // Show newest records
  console.log('🔍 NEWEST RECORDS (for verification)\n');
  
  const newestOffer = await DishOffer.findOne({}).sort({ createdAt: -1 });
  if (newestOffer) {
    console.log('Newest DishOffer:', newestOffer._id);
    newestOffer.images?.forEach((img, i) => {
      const type = img.includes('storage.googleapis.com') ? '☁️' : (img.startsWith('/uploads/') ? '❌' : '❓');
      console.log(`  [${i}] ${type} ${img.substring(0, 80)}...`);
    });
    console.log();
  }
  
  const newestDish = await AdminDish.findOne({}).sort({ createdAt: -1 });
  if (newestDish) {
    console.log('Newest AdminDish:', newestDish._id);
    const type = newestDish.imageUrl?.includes('storage.googleapis.com') ? '☁️' : (newestDish.imageUrl?.startsWith('/uploads/') ? '❌' : '❓');
    console.log(`  Image: ${type} ${newestDish.imageUrl?.substring(0, 80) || 'N/A'}...\n`);
  }
  
  const newestCat = await Category.findOne({}).sort({ createdAt: -1 });
  if (newestCat) {
    console.log('Newest Category:', newestCat.nameEn || newestCat._id);
    const webType = newestCat.icons?.web?.includes('storage.googleapis.com') ? '☁️' : (newestCat.icons?.web?.startsWith('/uploads/') ? '❌' : '❓');
    const mobType = newestCat.icons?.mobile?.includes('storage.googleapis.com') ? '☁️' : (newestCat.icons?.mobile?.startsWith('/uploads/') ? '❌' : '❓');
    console.log(`  Web: ${webType} ${newestCat.icons?.web?.substring(0, 80) || 'N/A'}...`);
    console.log(`  Mobile: ${mobType} ${newestCat.icons?.mobile?.substring(0, 80) || 'N/A'}...\n`);
  }
  
  if (settings?.heroImages?.length > 0) {
    console.log('Settings Hero Images:');
    settings.heroImages.forEach((img, i) => {
      const type = img.includes('storage.googleapis.com') ? '☁️' : (img.startsWith('/uploads/') ? '❌' : '❓');
      console.log(`  [${i}] ${type} ${img.substring(0, 80)}...`);
    });
    console.log();
  }
  
  await mongoose.disconnect();
}

verifyAllPersistence().catch(console.error);
