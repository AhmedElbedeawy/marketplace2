const mongoose = require('mongoose');
const User = require('./models/User');
const Cook = require('./models/Cook');
require('dotenv').config();

const seedTestAccounts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace');
    console.log('MongoDB Connected for seeding...');

    // Clear existing test accounts
    await User.deleteMany({ email: { $in: ['foodie@test.com', 'cook@test.com', 'admin@test.com'] } });
    
    // Clear existing cook profiles for test accounts
    await Cook.deleteMany({ email: { $in: ['cook@test.com'] } });

    // Create Foodie Test Account
    const foodie = await User.create({
      name: 'Sara',
      email: 'foodie@test.com',
      password: 'test123',
      phone: '+1234567890',
      role: 'foodie'
    });
    console.log('✅ Foodie account created:', foodie.email);

    // Create Cook Test Account
    const cookUser = await User.create({
      name: 'Test Cook',
      email: 'cook@test.com',
      password: 'test123',
      phone: '+9876543210',
      role: 'foodie',
      isCook: true,
      role_cook_status: 'active',
      storeName: 'Test Kitchen',
      pickupAddress: '123 Main St, Test City'
    });
    console.log('✅ Cook account created:', cookUser.email);

    // Create Cook Profile for the cook test account
    const cookProfile = await Cook.create({
      userId: cookUser._id,
      name: cookUser.name,
      email: cookUser.email,
      storeName: cookUser.storeName || 'Test Kitchen',
      countryCode: 'SA',
      expertise: [],
      questionnaire: {
        experienceLevel: 'intermediate',
        totalOrders: '50-100',
        dailyOrders: '5-10',
        signatureDishes: ['Test Dish'],
        fulfillmentMethods: ['pickup', 'delivery']
      },
      profilePhoto: '',
      isActive: true,
      status: 'active',
      ratings: {
        average: 4.5,
        count: 10
      }
    });
    console.log('✅ Cook profile created:', cookProfile.storeName);

    // Create Admin Test Account
    const admin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'test123',
      phone: '+5555555555',
      role: 'admin'
    });
    console.log('✅ Admin account created:', admin.email);

    console.log('\n🎉 Test accounts created successfully!\n');
    console.log('Login Credentials:');
    console.log('─────────────────────────────────────');
    console.log('Foodie Account:');
    console.log('  Name: Sara');
    console.log('  Email: foodie@test.com');
    console.log('  Password: test123\n');
    console.log('Cook Account:');
    console.log('  Email: cook@test.com');
    console.log('  Password: test123\n');
    console.log('Admin Account:');
    console.log('  Email: admin@test.com');
    console.log('  Password: test123');
    console.log('─────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding test accounts:', error);
    process.exit(1);
  }
};

seedTestAccounts();
