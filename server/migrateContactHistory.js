const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const UserContactHistory = require('./models/UserContactHistory');

dotenv.config();

const migrateContactHistory = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for migration...');

    const users = await User.find({ isDeleted: false });
    console.log(`Found ${users.length} users to migrate.`);

    for (const user of users) {
      if (user.email) {
        const emailValue = user.email.toLowerCase().trim();
        await UserContactHistory.findOneAndUpdate(
          { userId: user._id, type: 'email', value: emailValue },
          { status: 'reserved' },
          { upsert: true, new: true }
        );
      }
      if (user.phone) {
        const phoneValue = user.phone.trim();
        await UserContactHistory.findOneAndUpdate(
          { userId: user._id, type: 'phone', value: phoneValue },
          { status: 'reserved' },
          { upsert: true, new: true }
        );
      }
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrateContactHistory();

