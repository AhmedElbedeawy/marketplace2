const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb+srv://ahmedelbedeawy_db_user:MongoDB1579@mpcluster.odymgfu.mongodb.net/?retryWrites=true&w=majority&appName=MPCluster');
  const User = require('./models/User');
  const Invoice = require('./models/Invoice');
  const Notification = require('./models/Notification');

  console.log('Checking test users...');

  const foodie = await User.findOne({ email: 'foodie.p2@test.com' });
  const cook = await User.findOne({ email: 'cook.p2@test.com' });
  const admin = await User.findOne({ email: 'admin.p2@test.com' });

  console.log('Foodie:', foodie ? { id: foodie._id, role: foodie.role, cookStatus: foodie.role_cook_status } : 'NOT FOUND');
  console.log('Cook:', cook ? { id: cook._id, role: cook.role, cookStatus: cook.role_cook_status } : 'NOT FOUND');
  console.log('Admin:', admin ? { id: admin._id, role: admin.role } : 'NOT FOUND');

  const invoices = await Invoice.find({}).limit(3);
  console.log('\nInvoices:', invoices.length);
  invoices.forEach(inv => {
    console.log('  -', inv._id, 'cook:', inv.cook);
  });

  const notifs = await Notification.find({}).sort({ createdAt: -1 }).limit(5);
  console.log('\nRecent Notifications:', notifs.length);
  notifs.forEach(n => {
    console.log('  -', n.type, 'userId:', n.userId, 'title:', n.title);
  });

  await mongoose.disconnect();
  process.exit(0);
})();
