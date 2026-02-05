const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/eltekkeya', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const user = await User.findOne({ email: 'cook@test.com' });
  console.log('\n=== Current cook@test.com ===');
  console.log('Email:', user?.email);
  console.log('Role:', user?.role);
  console.log('Name:', user?.name);
  
  if (user && user.role !== 'cook') {
    user.role = 'cook';
    await user.save();
    console.log('\n✅ Role updated to: cook');
  } else if (user) {
    console.log('\n✅ Role is already: cook');
  } else {
    console.log('\n❌ User not found');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
