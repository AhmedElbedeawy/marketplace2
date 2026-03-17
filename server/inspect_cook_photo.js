const mongoose = require('mongoose');
const DishOffer = require('./models/DishOffer');

async function inspectCook() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get one offer with populated cook
    const offer = await DishOffer.findOne({ 
      adminDishId: '69925eb855922f9132707cdd',
      isActive: true 
    })
    .populate('cook')
    .select('cook');
    
    if (!offer) {
      console.log('No offers found for this dish');
      mongoose.disconnect();
      return;
    }
    
    const cook = offer.cook;
    console.log('\n=== COOK OBJECT INSPECTION ===\n');
    console.log('Cook ID:', cook._id);
    console.log('Store Name:', cook.storeName);
    console.log('\nprofilePhoto TYPE:', typeof cook.profilePhoto);
    console.log('profilePhoto LENGTH:', cook.profilePhoto?.length || 0);
    console.log('profilePhoto PREVIEW:', cook.profilePhoto?.substring(0, 200) + '...');
    console.log('\noriginalPhoto TYPE:', typeof cook.originalPhoto);
    console.log('originalPhoto LENGTH:', cook.originalPhoto?.length || 0);
    console.log('originalPhoto PREVIEW:', cook.originalPhoto?.substring(0, 200) + '...');
    
    // Check if it's base64
    if (cook.profilePhoto?.startsWith('data:image')) {
      console.log('\n⚠️  WARNING: profilePhoto is a BASE64 DATA URI!');
      console.log('Full size estimate:', Math.round(cook.profilePhoto.length / 1024), 'KB');
    } else if (cook.profilePhoto?.startsWith('/uploads') || cook.profilePhoto?.startsWith('http')) {
      console.log('\n✓ profilePhoto is a normal path/URL');
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

inspectCook();
