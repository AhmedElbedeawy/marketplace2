const mongoose = require('mongoose');
const uri = 'mongodb+srv://ahmedelbedeawy_db_user:MongoDB1579@mpcluster.odymgfu.mongodb.net/?retryWrites=true&w=majority&appName=MPCluster';

(async () => {
  console.log('Testing MongoDB connection...');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB!');

    const User = require('./models/User');
    const count = await User.countDocuments();
    console.log('Users in DB:', count);

    await mongoose.disconnect();
    console.log('Done.');
  } catch (e) {
    console.log('Error:', e.message);
  }
  process.exit(0);
})();
