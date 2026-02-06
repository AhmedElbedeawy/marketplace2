const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie_marketplace');
    
    const User = require('./models/User');
    const Cook = require('./models/Cook');
    
    // Delete if exists
    const existing = await User.findOne({ email: 'newcook@test.com' });
    if (existing) {
      await Cook.deleteOne({ userId: existing._id });
      await User.deleteOne({ _id: existing._id });
      console.log('Deleted existing');
    }
    
    // Create user
    const user = await User.create({
      name: 'New Test Cook',
      email: 'newcook@test.com',
      password: 'test123',
      phone: '+201111111119',
      role: 'foodie',
      isCook: true,
      role_cook_status: 'active',
      countryCode: 'EG'
    });
    
    // Create cook profile
    const cook = await Cook.create({
      userId: user._id,
      storeName: 'New Test Kitchen',
      storeStatus: 'approved',
      city: 'Cairo',
      pickupAddress: 'Cairo, Egypt',
      expertise: [],
      bio: 'New test cook',
      rating: 4.5,
      reviewCount: 10,
      isAvailable: true
    });
    
    user.role_cook = cook._id;
    await user.save();
    
    console.log('SUCCESS');
    console.log('Email: newcook@test.com');
    console.log('Password: test123');
    console.log('Kitchen: New Test Kitchen');
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

main();
