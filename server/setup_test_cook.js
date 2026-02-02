const mongoose = require('mongoose');
require('dotenv').config();

async function setupTestCook() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace');

  const User = require('./models/User');
  const Cook = require('./models/Cook');

  // Find a user with isCook=true
  const cookUser = await User.findOne({ isCook: true });
  if (!cookUser) {
    console.log('No cook user found. Creating one...');
    // Create a test cook user
    const testUser = await User.create({
      name: 'Test Cook',
      email: 'testcook@example.com',
      password: 'password123',
      isCook: true,
      role_cook_status: 'approved',
      countryCode: 'SA',
      storeName: 'Test Kitchen'
    });
    console.log('Created test user:', testUser._id);

    // Create matching Cook profile
    const testCook = await Cook.create({
      userId: testUser._id,
      storeName: 'Test Kitchen',
      profilePhoto: '',
      ratings: { average: 0, count: 0 },
      expertise: [],
      isActive: true
    });
    console.log('Created test cook:', testCook._id);
    console.log('\nTest credentials:');
    console.log('  User ID:', testUser._id);
    console.log('  Cook ID:', testCook._id);
    console.log('  Email: testcook@example.com');
    console.log('  Password: password123');

    await mongoose.disconnect();
    return { userId: testUser._id, cookId: testCook._id };
  }

  // Check if user already has a Cook profile
  let cook = await Cook.findOne({ userId: cookUser._id });

  if (!cook) {
    console.log('User has isCook=true but no Cook profile. Creating one...');
    cook = await Cook.create({
      userId: cookUser._id,
      name: cookUser.name,
      email: cookUser.email,
      storeName: cookUser.storeName || cookUser.name + "'s Kitchen",
      countryCode: cookUser.countryCode || 'SA',
      profilePhoto: '',
      ratings: { average: 0, count: 0 },
      expertise: [],
      status: 'active',
      isActive: true
    });
    console.log('Created cook profile:', cook._id);
  } else {
    console.log('User already has Cook profile:', cook._id);
  }

  console.log('\nTest setup complete:');
  console.log('  User ID:', cookUser._id);
  console.log('  Cook ID:', cook._id);
  console.log('  Email:', cookUser.email);

  await mongoose.disconnect();
  return { userId: cookUser._id, cookId: cook._id };
}

setupTestCook()
  .then(result => {
    console.log('\nResult:', result);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
