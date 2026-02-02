const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodie_marketplace');

  const User = require('./models/User');
  const Cook = require('./models/Cook');
  const Product = require('./models/Product');
  const { Order } = require('./models/Order');
  const Invoice = require('./models/Invoice');

  // Manually run setup logic
  console.log('1. Creating Foodie...');
  let foodie = await User.findOne({ email: 'foodie.p2@test.com' });
  if (!foodie) {
    foodie = await User.create({
      email: 'foodie.p2@test.com',
      password: 'password123',
      name: 'Test Foodie P2',
      role: 'foodie',
      countryCode: 'SA',
      notificationSettings: { pushEnabled: true, orderNotifications: true, systemNotifications: true }
    });
    console.log('   Foodie created:', foodie._id);
  } else {
    console.log('   Foodie exists:', foodie._id);
  }

  console.log('2. Creating Cook...');
  let cookUser = await User.findOne({ email: 'cook.p2@test.com' });
  if (!cookUser) {
    cookUser = await User.create({
      email: 'cook.p2@test.com',
      password: 'password123',
      name: 'Test Cook P2',
      role: 'foodie',
      role_cook_status: 'active',
      countryCode: 'SA',
      notificationSettings: { pushEnabled: true, orderNotifications: true, systemNotifications: true }
    });
    console.log('   Cook User created:', cookUser._id);
  } else {
    console.log('   Cook User exists:', cookUser._id);
  }

  let cookProfile = await Cook.findOne({ userId: cookUser._id });
  if (!cookProfile) {
    cookProfile = await Cook.create({
      userId: cookUser._id,
      name: cookUser.name,
      email: cookUser.email,
      storeName: 'P2 Test Kitchen',
      status: 'active',
      city: 'Riyadh'
    });
    console.log('   Cook Profile created:', cookProfile._id);
  } else {
    console.log('   Cook Profile exists:', cookProfile._id);
  }

  console.log('3. Creating Product...');
  let product = await Product.findOne({ cook: cookUser._id });
  if (!product) {
    product = await Product.create({
      cook: cookUser._id,
      name: 'P2 Test Dish',
      description: 'Test dish description',
      price: 50,
      stock: 10,
      prepTime: 30,
      category: new mongoose.Types.ObjectId(),
      countryCode: 'SA'
    });
    console.log('   Product created:', product._id);
  } else {
    console.log('   Product exists:', product._id);
  }

  console.log('4. Creating Order...');
  let order = await Order.findOne({ customer: foodie._id });
  if (!order) {
    order = await Order.create({
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
        cook: cookUser._id,
        pickupAddress: 'Cook Kitchen',
        cookLocationSnapshot: { lat: 24.7, lng: 46.7, address: 'Cook Addr', city: 'Riyadh' },
        totalAmount: 50,
        status: 'delivered',
        items: [{ product: product._id, quantity: 1, price: 50 }]
      }]
    });
    console.log('   Order created:', order._id);
  } else {
    console.log('   Order exists:', order._id);
  }

  console.log('5. Creating Invoice...');
  let invoice = await Invoice.findOne({ cook: cookProfile._id });
  if (!invoice) {
    invoice = await Invoice.create({
      cook: cookProfile._id,
      invoiceNumber: 'INV-' + Date.now(),
      periodMonth: '2025-01',
      grossAmount: 50,
      commissionAmount: 5,
      netAmount: 45,
      amountDue: 45,
      currency: 'SAR',
      status: 'issued'
    });
    console.log('   Invoice created:', invoice._id);
  } else {
    console.log('   Invoice exists:', invoice._id);
  }

  console.log('\nSetup complete!');
  await mongoose.disconnect();
  process.exit(0);
})();
