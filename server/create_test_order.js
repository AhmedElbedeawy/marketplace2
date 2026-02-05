const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
const Cook = require('./models/Cook');

mongoose.connect('mongodb://localhost:27017/eltekkeya', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Creating test order...');
  
  const cook = await User.findOne({ email: 'cook@test.com' });
  const foodie = await User.findOne({ email: 'foodie@test.com' });
  const cookProfile = await Cook.findOne({ userId: cook._id });
  
  if (!cook || !foodie || !cookProfile) {
    console.log('❌ Required accounts not found');
    process.exit(1);
  }
  
  const order = await Order.create({
    customer: foodie._id,
    cook: cook._id,
    items: [{
      dishId: new mongoose.Types.ObjectId(),
      dishName: 'Test Dish',
      quantity: 2,
      price: 50,
      totalPrice: 100
    }],
    totalAmount: 100,
    deliveryFee: 10,
    finalAmount: 110,
    status: 'pending',
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    fulfillmentOption: 'delivery',
    deliveryAddress: {
      street: '123 Test St',
      city: 'Test City',
      country: 'SA'
    },
    orderDate: new Date(),
    estimatedDeliveryTime: new Date(Date.now() + 3600000)
  });
  
  console.log('✅ Test order created:', order._id);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
