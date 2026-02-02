require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Cook = require('./models/Cook');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check if cook2@test.com already exists
    let user = await User.findOne({ email: 'cook2@test.com' });
    
    if (user) {
      console.log('User cook2@test.com already exists');
    } else {
      // Create new demo cook user
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = await User.create({
        name: 'Demo Cook 2',
        email: 'cook2@test.com',
        password: hashedPassword,
        phone: '+20 111 222 3333',
        role: 'foodie',
        isCook: true,
        role_cook_status: 'active'
      });
      console.log('Created user:', user.email);
    }
    
    // Check if Cook record exists
    let cook = await Cook.findOne({ userId: user._id });
    
    if (cook) {
      console.log('Cook record already exists for this user');
    } else {
      // Create Cook record
      cook = await Cook.create({
        userId: user._id,
        name: user.name,
        email: user.email,
        storeName: 'Fresh Bites Kitchen',
        area: 'New Cairo',
        expertise: [],
        bio: 'Second demo cook account - approved and ready to use',
        profilePhoto: '',
        isTopRated: false,
        status: 'active'
      });
      console.log('Cook record created:', cook._id);
    }
    
    console.log('\n=== Demo Cook Account Created ===');
    console.log('Email: cook2@test.com');
    console.log('Password: password123');
    console.log('Status: Active and Approved');
    console.log('Store Name:', cook.storeName);
    console.log('================================\n');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
