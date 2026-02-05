const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function addDummyNotification() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    const { createNotification } = require('./utils/notifications');
    
    const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    if (!admin) {
      console.log('No admin user found');
      process.exit(1);
    }
    
    console.log('Found admin:', admin.email);
    
    await createNotification({
      userId: admin._id,
      role: 'admin',
      title: 'Test: New Order Issue Reported',
      message: 'This is a test notification for Order #123456: Missing items in order',
      type: 'issue',
      entityType: 'issue',
      entityId: new mongoose.Types.ObjectId(),
      deepLink: '/issues/test-order-id',
      countryCode: 'SA'
    });
    
    console.log('Dummy notification created successfully!');
    console.log('Admin will see this at: http://localhost:3001/issues');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addDummyNotification();
