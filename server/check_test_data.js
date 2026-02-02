const mongoose = require('mongoose');
const uri = 'mongodb+srv://ahmedelbedeawy_db_user:MongoDB1579@mpcluster.odymgfu.mongodb.net/?retryWrites=true&w=majority&appName=MPCluster';

(async () => {
  await mongoose.connect(uri);
  const User = require('./models/User');
  const foodie = await User.findOne({ email: 'foodie.p2@test.com' });
  const cook = await User.findOne({ email: 'cook.p2@test.com' });
  console.log('Foodie found:', !!foodie);
  console.log('Cook found:', !!cook);
  if (foodie) console.log('Foodie ID:', foodie._id);
  if (cook) console.log('Cook ID:', cook._id);
  await mongoose.disconnect();
  process.exit(0);
})();
