/**
 * PHASE 2 NOTIFICATIONS — VERIFICATION TEST SUITE
 * Run with: node server/verify_phase2_notifications.js
 */

const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');
const Cook = require('./models/Cook');
const { Order } = require('./models/Order');
const Invoice = require('./models/Invoice');
const OrderRating = require('./models/OrderRating');
const Product = require('./models/Product');
const Notification = require('./models/Notification');

const BASE_URL = 'http://localhost:5005';
let foodieToken = '';
let cookToken = '';
let adminToken = '';
let foodieId = '';
let cookUserId = '';
let cookProfileId = '';
let adminId = '';
let testOrderId = '';
let testProductId = '';
let testInvoiceId = '';
let testRatingId = '';

// Test helper
const test = async (name, fn) => {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
};

const apiCall = async (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('API call timeout: ' + path));
    }, 10000); // 10 second timeout

    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2 NOTIFICATIONS — VERIFICATION TEST SUITE');
  console.log('='.repeat(60) + '\n');

  try {
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodie_marketplace');
    console.log('✅ Connected to MongoDB\n');

    await setupTestData();

    const results = {
      ratings: await runRatingTests(),
      payouts: await runPayoutTests(),
      orderChanges: await runOrderChangeTests(),
      issueResolution: await runIssueResolutionTests(),
      moderation: await runModerationTests(),
      support: await runSupportTests(),
    };

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Ratings & Reviews:   ${results.ratings ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Payouts:             ${results.payouts ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Order Changes:       ${results.orderChanges ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Issue Resolution:    ${results.issueResolution ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Account Moderation:  ${results.moderation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Support Messages:    ${results.support ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r);
    console.log('\n' + '='.repeat(60));
    console.log(allPassed ? '🎉 PHASE 2 VERIFIED — Production Ready!' : '⚠️  SOME TESTS FAILED');
    console.log('='.repeat(60) + '\n');

    await cleanupTestData();

  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

async function setupTestData() {
  console.log('🔧 Setting up test data...\n');

  // 1. Create Foodie
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
  }
  foodieId = foodie._id.toString();

  // 2. Create Cook
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
  }
  cookUserId = cookUser._id.toString();

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
  }
  cookProfileId = cookProfile._id.toString();

  // 3. Create Admin
  let admin = await User.findOne({ email: 'admin.p2@test.com' });
  if (!admin) {
    admin = await User.create({
      email: 'admin.p2@test.com',
      password: 'password123',
      name: 'Test Admin P2',
      role: 'admin',
      countryCode: 'SA'
    });
  }
  adminId = admin._id.toString();

  // 4. Create Product
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
  }
  testProductId = product._id.toString();

  // 5. Create Completed Order
  let order = await Order.create({
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
  testOrderId = order._id.toString();

  // 6. Create Invoice
  let invoice = await Invoice.create({
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
  testInvoiceId = invoice._id.toString();

  // 7. Get Tokens
  const fLogin = await apiCall('POST', '/api/auth/login', { email: 'foodie.p2@test.com', password: 'password123' });
  foodieToken = fLogin.data.token || fLogin.data.data.token;
  
  const cLogin = await apiCall('POST', '/api/auth/login', { email: 'cook.p2@test.com', password: 'password123' });
  cookToken = cLogin.data.token || cLogin.data.data.token;

  const aLogin = await apiCall('POST', '/api/auth/login', { email: 'admin.p2@test.com', password: 'password123' });
  adminToken = aLogin.data.token || aLogin.data.data.token;

  console.log('   Test data setup complete\n');
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  await User.deleteMany({ email: /p2@test.com/ });
  await Cook.deleteMany({ email: /p2@test.com/ });
  await Product.deleteMany({ name: /P2 Test/ });
  await Order.deleteMany({ customer: foodieId });
  await Invoice.deleteMany({ cook: cookProfileId });
  await OrderRating.deleteMany({ customer: foodieId });
  await Notification.deleteMany({ userId: { $in: [foodieId, cookUserId, adminId] } });
  console.log('   Cleanup complete\n');
}

// --- TEST SUITES ---

async function runRatingTests() {
  console.log('--- 1) RATING & REVIEW TESTS ---');
  let passed = true;

  passed &= await test('1.1 Foodie submits rating -> Cook notified', async () => {
    await apiCall('POST', `/api/ratings/order/${testOrderId}`, {
      dishRatings: [{ product: testProductId, rating: 5, review: 'Great!' }]
    }, { Authorization: `Bearer ${foodieToken}` });

    const notif = await Notification.findOne({ userId: cookUserId, type: 'rating' }).sort({ createdAt: -1 });
    if (!notif) throw new Error('Cook not notified of rating');
    if (notif.deepLink !== '/cook/reviews') throw new Error('Incorrect deep link');
    testRatingId = (await OrderRating.findOne({ order: testOrderId }))._id.toString();
  });

  passed &= await test('1.2 Cook replies to rating -> Foodie notified', async () => {
    await apiCall('POST', `/api/ratings/${testRatingId}/reply`, {
      reply: 'Thank you!'
    }, { Authorization: `Bearer ${cookToken}` });

    const notif = await Notification.findOne({ userId: foodieId, type: 'rating_reply' }).sort({ createdAt: -1 });
    if (!notif) throw new Error('Foodie not notified of reply');
    if (notif.deepLink !== `/orders/${testOrderId}`) throw new Error('Incorrect deep link');
  });

  return passed;
}

async function runPayoutTests() {
  console.log('\n--- 2) PAYOUT TESTS ---');
  let passed = true;

  passed &= await test('2.1 Mark payout completed -> Cook notified', async () => {
    const result = await apiCall('POST', `/api/invoices/admin/invoices/${testInvoiceId}/payouts`, {
      method: 'bank_transfer',
      status: 'completed',
      amount: 45
    }, { Authorization: `Bearer ${adminToken}` });
    console.log('      Payout API response:', result.status, JSON.stringify(result.data).substring(0, 200));

    const notif = await Notification.findOne({ userId: cookUserId, type: 'payout' }).sort({ createdAt: -1 });
    console.log('      Notification found:', !!notif);
    if (notif) {
      console.log('      Notification details:', notif.userId, notif.type, notif.title);
    }
    if (!notif) throw new Error('Cook not notified of payout');
    if (notif.deepLink !== '/cook/payouts') throw new Error('Incorrect deep link');
  });

  passed &= await test('2.2 Mark payout failed -> Cook notified', async () => {
    const result = await apiCall('POST', `/api/invoices/admin/invoices/${testInvoiceId}/payouts`, {
      method: 'bank_transfer',
      status: 'failed',
      amount: 45
    }, { Authorization: `Bearer ${adminToken}` });
    console.log('      Payout API response:', result.status, JSON.stringify(result.data).substring(0, 200));

    const notif = await Notification.findOne({ userId: cookUserId, type: 'payout_failed' }).sort({ createdAt: -1 });
    console.log('      Notification found:', !!notif);
    if (!notif) throw new Error('Cook not notified of failed payout');
  });

  return passed;
}

async function runOrderChangeTests() {
  console.log('\n--- 3) ORDER CHANGE TESTS ---');
  let passed = true;

  passed &= await test('3.1 Update order scheduled time -> Foodie notified', async () => {
    await apiCall('PUT', `/api/orders/${testOrderId}/scheduled-time`, {
      scheduledTime: new Date(Date.now() + 86400000)
    }, { Authorization: `Bearer ${adminToken}` });

    const notif = await Notification.findOne({ userId: foodieId, type: 'order_update' }).sort({ createdAt: -1 });
    if (!notif) throw new Error('Foodie not notified of time update');
    if (notif.deepLink !== `/orders/${testOrderId}`) throw new Error('Incorrect deep link');
  });

  passed &= await test('3.2 Mark item unavailable -> Foodie & Admin notified', async () => {
    await apiCall('PUT', `/api/orders/${testOrderId}/items/${testProductId}/unavailable`, {}, { Authorization: `Bearer ${adminToken}` });

    const foodieNotif = await Notification.findOne({ userId: foodieId, type: 'order_issue' }).sort({ createdAt: -1 });
    const adminNotif = await Notification.findOne({ userId: adminId, type: 'order_issue_admin' }).sort({ createdAt: -1 });

    if (!foodieNotif) throw new Error('Foodie not notified of unavailable item');
    if (!adminNotif) throw new Error('Admin not notified of unavailable item');
  });

  return passed;
}

async function runIssueResolutionTests() {
  console.log('\n--- 4) ISSUE RESOLUTION TESTS ---');
  let passed = true;

  passed &= await test('4.1 Resolve order issue -> Foodie & Cook notified', async () => {
    // First report an issue
    await apiCall('POST', `/api/orders/${testOrderId}/report-issue`, {
      reason: 'Missing items',
      description: 'The burger was missing'
    }, { Authorization: `Bearer ${foodieToken}` });

    // Then resolve it
    await apiCall('PATCH', `/api/admin/issues/${testOrderId}/resolve`, {
      adminNotes: 'Refund issued'
    }, { Authorization: `Bearer ${adminToken}` });

    const fNotif = await Notification.findOne({ userId: foodieId, type: 'issue_update' }).sort({ createdAt: -1 });
    const cNotif = await Notification.findOne({ userId: cookUserId, type: 'issue_update' }).sort({ createdAt: -1 });

    if (!fNotif) throw new Error('Foodie not notified of resolution');
    if (!cNotif) throw new Error('Cook not notified of resolution');
    if (fNotif.deepLink !== `/orders/${testOrderId}`) throw new Error('Incorrect deep link');
  });

  return passed;
}

async function runModerationTests() {
  console.log('\n--- 5) MODERATION TESTS ---');
  let passed = true;
  console.log('      cookUserId:', cookUserId);

  passed &= await test('5.1 Send cook warning -> Cook notified', async () => {
    const result = await apiCall('POST', `/api/admin/cooks/${cookUserId}/warning`, {
      message: 'Please update your photos'
    }, { Authorization: `Bearer ${adminToken}` });
    console.log('      Warning API response:', result.status, JSON.stringify(result.data).substring(0, 200));

    const notif = await Notification.findOne({ userId: cookUserId, type: 'account_warning' }).sort({ createdAt: -1 });
    console.log('      Notification found:', !!notif);
    if (notif) {
      console.log('      Notification details:', notif.userId, notif.type, notif.title);
    }
    if (!notif) throw new Error('Cook not notified of warning');
    if (notif.deepLink !== '/cook/account-status') throw new Error('Incorrect deep link');
  });

  passed &= await test('5.2 Apply cook restriction -> Cook notified', async () => {
    const result = await apiCall('POST', `/api/admin/cooks/${cookUserId}/restrict`, {
      restrictions: 'No new dishes',
      reason: 'Incomplete profile'
    }, { Authorization: `Bearer ${adminToken}` });
    console.log('      Restriction API response:', result.status, JSON.stringify(result.data).substring(0, 200));

    const notif = await Notification.findOne({ userId: cookUserId, type: 'account_restriction' }).sort({ createdAt: -1 });
    console.log('      Notification found:', !!notif);
    if (!notif) throw new Error('Cook not notified of restriction');
  });

  return passed;
}

async function runSupportTests() {
  console.log('\n--- 6) SUPPORT MESSAGE TESTS ---');
  let passed = true;

  // Create a valid ObjectId for the support thread
  const testThreadId = new mongoose.Types.ObjectId();

  passed &= await test('6.1 Send support message -> User notified', async () => {
    await apiCall('POST', '/api/support/messages', {
      userId: foodieId,
      message: 'How can we help?',
      threadId: testThreadId.toString()
    }, { Authorization: `Bearer ${adminToken}` });

    const notif = await Notification.findOne({ userId: foodieId, type: 'support_message' }).sort({ createdAt: -1 });
    if (!notif) throw new Error('User not notified of support message');
    if (notif.deepLink !== `/support/messages/${testThreadId}`) throw new Error('Incorrect deep link');
  });

  return passed;
}

runTests();
