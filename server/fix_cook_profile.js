const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie_marketplace');
    
    const User = require('./models/User');
    const Cook = require('./models/Cook');
    
    // Find the user
    const user = await User.findOne({ email: 'cooksecond@test.com' });
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('Found user:', user._id.toString());
    
    // Check if cook profile exists
    let cook = await Cook.findOne({ userId: user._id });
    
    if (!cook) {
      // Create cook profile
      cook = await Cook.create({
        userId: user._id,
        name: 'Second Test Cook',
        email: 'cooksecond@test.com',
        storeName: 'Second Test Kitchen',
        storeStatus: 'approved',
        city: 'Cairo',
        pickupAddress: 'Cairo, Egypt',
        countryCode: 'EG',
        expertise: [],
        bio: 'Second test cook for multi-cook testing',
        rating: 4.5,
        reviewCount: 10,
        isAvailable: true
      });
      console.log('Created cook profile:', cook._id.toString());
    } else {
      console.log('Cook profile exists:', cook._id.toString());
    }
    
    // Link user to cook
    user.role_cook = cook._id;
    await user.save();
    console.log('Linked user to cook');
    
    console.log('\n✅ Cook profile fixed!');
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();