const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie_marketplace');
  console.log('Connected');
  
  const ExpertiseCategory = require('./models/ExpertiseCategory');
  const User = require('./models/User');
  const Cook = require('./models/Cook');
  
  // Create expertise category
  let cat = await ExpertiseCategory.findOne({ name: 'Traditional Egyptian' });
  if (!cat) {
    cat = await ExpertiseCategory.create({ name: 'Traditional Egyptian', nameAr: 'مصري تقليدي' });
    console.log('Created category:', cat._id.toString());
  } else {
    console.log('Found category:', cat._id.toString());
  }
  
  // Delete existing cook2 if exists
  const existingUser = await User.findOne({ email: 'cook2@test.com' });
  if (existingUser) {
    await Cook.deleteOne({ userId: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
    console.log('Deleted existing cook2');
  }
  
  // Create user
  const user = await User.create({
    name: 'Cook Two',
    email: 'cook2@test.com',
    password: 'test123',
    phone: '+201111111112',
    role: 'foodie',
    isCook: true,
    role_cook_status: 'active',
    countryCode: 'EG'
  });
  console.log('Created user:', user._id.toString());
  
  // Create cook profile
  const cook = await Cook.create({
    userId: user._id,
    storeName: 'Second Test Kitchen',
    storeStatus: 'approved',
    city: 'Cairo',
    pickupAddress: 'Test Address 2, Cairo',
    expertise: [cat._id],
    bio: 'Second test cook for multi-cook testing',
    rating: 4.5,
    reviewCount: 10,
    isAvailable: true
  });
  console.log('Created cook:', cook._id.toString());
  
  // Link user to cook
  user.role_cook = cook._id;
  await user.save();
  
  console.log('\n✅ cook2@test.com created successfully!');
  console.log('Email: cook2@test.com');
  console.log('Password: test123');
  console.log('Kitchen: Second Test Kitchen');
  
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
