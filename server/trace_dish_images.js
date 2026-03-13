const mongoose = require('mongoose');
require('dotenv').config();

const DishOffer = require('./models/DishOffer');
const AdminDish = require('./models/AdminDish');
const Cook = require('./models/Cook');

async function traceDishImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find cook account
    const cook = await Cook.findOne({ email: 'acook@test.com' });
    if (!cook) {
      console.log('❌ Cook account "acook@test.com" not found');
      process.exit(1);
    }
    console.log('👨‍🍳 Found cook:', cook._id, '-', cook.name);

    // Find all DishOffers for this cook
    const dishOffers = await DishOffer.find({ cook: cook._id })
      .populate('adminDishId')
      .lean();
    
    console.log(`\n📊 Found ${dishOffers.length} dish offers from this cook\n`);

    for (const offer of dishOffers) {
      const adminDish = offer.adminDishId;
      console.log('='.repeat(80));
      console.log(`\n🍽️  DISH: ${adminDish?.nameEn || 'Unknown'} / ${adminDish?.nameAr || 'غير معروف'}`);
      console.log(`   Offer ID: ${offer._id}`);
      console.log(`   Admin Dish ID: ${offer.adminDishId?._id || 'MISSING'}`);
      
      console.log('\n   📸 IMAGES:');
      console.log(`      - DishOffer.images: ${JSON.stringify(offer.images || [])}`);
      console.log(`      - AdminDish.image: ${adminDish?.image || 'MISSING'}`);
      console.log(`      - AdminDish.images: ${JSON.stringify(adminDish?.images || [])}`);
      
      console.log('\n   🔍 IMAGE URL CHECK:');
      const allImageUrls = [
        ...(offer.images || []),
        adminDish?.image,
        ...(adminDish?.images || [])
      ].filter(Boolean);
      
      console.log(`      Total image URLs found: ${allImageUrls.length}`);
      allImageUrls.forEach((url, idx) => {
        console.log(`      [${idx}] ${url}`);
      });

      console.log('='.repeat(80));
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

traceDishImages();
