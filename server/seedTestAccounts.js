const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seedTestAccounts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace');
    console.log('MongoDB Connected for seeding...');

    // Clear existing test accounts
    await User.deleteMany({ email: { $in: ['foodie@test.com', 'cook@test.com', 'admin@test.com'] } });

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
    const cook = await User.create({
      name: 'Test Cook',
      email: 'cook@test.com',
      password: 'test123',
      phone: '+9876543210',
      role: 'foodie',
      role_cook_status: 'active',
      storeName: 'Test Kitchen',
      pickupAddress: '123 Main St, Test City'
    });
    console.log('✅ Cook account created:', cook.email);

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
