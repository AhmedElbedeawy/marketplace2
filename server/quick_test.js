const http = require('http');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Cook = require('./models/Cook');
const Product = require('./models/Product');
const { Order } = require('./models/Order');
const Notification = require('./models/Notification');

const BASE_URL = 'http://localhost:5005';
const logFile = fs.createWriteStream('/Users/AhmedElbedeawy/Desktop/Marketplace Project/server/test_output.log', { flags: 'w' });

function log(msg) {
  const line = new Date().toISOString() + ' ' + msg + '\n';
  console.log(msg);
  logFile.write(line);
}

const apiCall = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), 5000);
    const url = new URL(path, BASE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    }, res => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

(async () => {
  log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  log('Connected!');

  // Setup data
  log('Setting up test data...');
  let foodie = await User.findOne({ email: 'quick.p2@test.com' });
  if (!foodie) {
    foodie = await User.create({ email: 'quick.p2@test.com', password: 'password123', name: 'Quick Foodie', role: 'foodie', countryCode: 'SA', notificationSettings: { pushEnabled: true, orderNotifications: true, systemNotifications: true }});
  }
  log('Foodie: ' + foodie._id);

  let cookUser = await User.findOne({ email: 'quick.cook.p2@test.com' });
  if (!cookUser) {
    cookUser = await User.create({ email: 'quick.cook.p2@test.com', password: 'password123', name: 'Quick Cook', role: 'foodie', role_cook_status: 'active', countryCode: 'SA', notificationSettings: { pushEnabled: true, orderNotifications: true, systemNotifications: true }});
  }
  log('Cook: ' + cookUser._id);

  let cookProfile = await Cook.findOne({ userId: cookUser._id });
  if (!cookProfile) {
    cookProfile = await Cook.create({ userId: cookUser._id, name: cookUser.name, email: cookUser.email, storeName: 'Quick Kitchen', status: 'active', city: 'Riyadh' });
  }
  log('CookProfile: ' + cookProfile._id);

  let product = await Product.findOne({ name: 'Quick Test Dish' });
  if (!product) {
    product = await Product.create({ cook: cookUser._id, name: 'Quick Test Dish', description: 'Test', price: 50, stock: 10, prepTime: 30, category: new mongoose.Types.ObjectId(), countryCode: 'SA' });
  }
  log('Product: ' + product._id);

  let admin = await User.findOne({ email: 'quick.admin.p2@test.com' });
  if (!admin) {
    admin = await User.create({ email: 'quick.admin.p2@test.com', password: 'password123', name: 'Quick Admin', role: 'admin', countryCode: 'SA' });
  }
  log('Admin: ' + admin._id);

  // Get tokens
  log('Getting tokens...');
  const fLogin = await apiCall('POST', '/api/auth/login', { email: 'quick.p2@test.com', password: 'password123' });
  const foodieToken = fLogin.data.token || fLogin.data.data?.token;
  log('Foodie token: ' + (foodieToken ? 'OK' : 'FAIL'));

  // Create order
  log('Creating order...');
  let order = await Order.create({ customer: foodie._id, status: 'completed', totalAmount: 50, deliveryAddress: { addressLine1: 'Test St', city: 'Riyadh', countryCode: 'SA', label: 'Home', lat: 24.7136, lng: 46.6753 }, subOrders: [{ cook: cookUser._id, pickupAddress: 'Cook Kitchen', cookLocationSnapshot: { lat: 24.7, lng: 46.7, address: 'Cook Addr', city: 'Riyadh' }, totalAmount: 50, status: 'delivered', items: [{ product: product._id, quantity: 1, price: 50 }] }] });
  log('Order: ' + order._id);

  // Test 1: Rating
  log('=== TEST 1: Rating ===');
  const ratingRes = await apiCall('POST', '/api/ratings/order/' + order._id, { dishRatings: [{ product: product._id.toString(), rating: 5, review: 'Great!' }] }, { Authorization: 'Bearer ' + foodieToken });
  log('Rating response: ' + ratingRes.status);

  const ratingNotif = await Notification.findOne({ userId: cookUser._id, type: 'rating' }).sort({ createdAt: -1 });
  log('Rating notification: ' + (ratingNotif ? 'FOUND' : 'NOT FOUND'));

  // Cleanup
  log('Cleaning up...');
  await User.deleteMany({ email: /quick.p2@test.com/ });
  await Cook.deleteMany({ userId: cookUser?._id });
  await Product.deleteMany({ name: /Quick Test/ });
  await Order.deleteMany({ customer: foodie._id });
  await Notification.deleteMany({ userId: { $in: [foodie._id, cookUser._id, admin._id] } });

  log('Done!');
  logFile.end();
  await mongoose.disconnect();
  process.exit(0);
})();
