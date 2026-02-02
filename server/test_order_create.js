const mongoose = require('mongoose');
const uri = 'mongodb+srv://ahmedelbedeawy_db_user:MongoDB1579@mpcluster.odymgfu.mongodb.net/?retryWrites=true&w=majority&appName=MPCluster';

(async () => {
  console.log('Connecting...');
  await mongoose.connect(uri);

  const { Order } = require('./models/Order');
  const User = require('./models/User');

  console.log('Finding users...');
  const foodie = await User.findOne({ email: 'foodie.p2@test.com' });
  const cook = await User.findOne({ email: 'cook.p2@test.com' });

  console.log('Foodie:', foodie ? foodie._id : 'NOT FOUND');
  console.log('Cook:', cook ? cook._id : 'NOT FOUND');

  if (!foodie || !cook) {
    console.log('Users not found, exiting...');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Creating order...');
  try {
    const order = await Order.create({
      customer: foodie._id,
      status: 'completed',
      totalAmount: 50,
      deliveryAddress: {
        addressLine1: 'Test St',
        city: 'Riyadh',
        countryCode: 'SA',
        label: 'Home',
        lat: 24.7136,
        lng: 46.6753
      },
      subOrders: [{
        cook: cook._id,
        pickupAddress: 'Cook Kitchen',
        cookLocationSnapshot: { lat: 24.7, lng: 46.7, address: 'Cook Addr', city: 'Riyadh' },
        totalAmount: 50,
        status: 'delivered',
        items: [{ product: cook._id, quantity: 1, price: 50 }]
      }]
    });
    console.log('Order created:', order._id);
  } catch (e) {
    console.log('Error creating order:', e.message);
  }

  await mongoose.disconnect();
  process.exit(0);
})();
