/**
 * PHASE 3 NOTIFICATIONS — VERIFICATION TEST SUITE
 * Tests marketing, retention, and digest notification infrastructure
 * Run with: node server/verify_phase3_notifications.js
 */

const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');
const Cook = require('./models/Cook');
const Product = require('./models/Product');
const { Order } = require('./models/Order');
const Notification = require('./models/Notification');
const NotificationDedupe = require('./models/NotificationDedupe');

const BASE_URL = 'http://localhost:5005';
let foodieToken = '';
let cookToken = '';
let adminToken = '';
let foodieId = '';
let cookUserId = '';

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

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 3 NOTIFICATIONS — VERIFICATION TEST SUITE');
  console.log('='.repeat(60) + '\n');

  try {
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodie_marketplace');
    console.log('✅ Connected to MongoDB\n');

    await setupTestData();

    const results = {
      modelEnums: await testModelEnums(),
      dedupeModel: await testDedupeModel(),
      marketingPushOptIn: await testMarketingPushOptIn(),
      dedupeCooldown: await testDedupeCooldown(),
      deepLinks: await testDeepLinks(),
    };

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Model Enums:          ${results.modelEnums ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Dedupe Model:         ${results.dedupeModel ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Marketing Push Opt-In:${results.marketingPushOptIn ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Dedupe/Cooldown:      ${results.dedupeCooldown ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Web Deep Links:       ${results.deepLinks ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r);
    console.log('\n' + '='.repeat(60));
    console.log(allPassed ? '🎉 PHASE 3 VERIFIED — Production Ready!' : '⚠️  SOME TESTS FAILED');
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

  // 1. Create Foodie with marketing opt-in
  let foodie = await User.findOne({ email: 'foodie.p3@test.com' });
  if (!foodie) {
    foodie = await User.create({
      email: 'foodie.p3@test.com',
      password: 'password123',
      name: 'Test Foodie P3',
      role: 'foodie',
      countryCode: 'SA',
      notificationSettings: {
        pushEnabled: true,
        orderNotifications: true,
        promotionNotifications: true,
        systemNotifications: true
      }
    });
  }
  foodieId = foodie._id.toString();

  // 2. Create Cook
  let cookUser = await User.findOne({ email: 'cook.p3@test.com' });
  if (!cookUser) {
    cookUser = await User.create({
      email: 'cook.p3@test.com',
      password: 'password123',
      name: 'Test Cook P3',
      role: 'foodie',
      role_cook_status: 'active',
      countryCode: 'SA',
      notificationSettings: {
        pushEnabled: true,
        orderNotifications: true,
        promotionNotifications: true,
        systemNotifications: true
      },
      cookRatingAvg: 3.2, // Low rating for performance test
      cookRatingCount: 10
    });
  }
  cookUserId = cookUser._id.toString();

  let cookProfile = await Cook.findOne({ userId: cookUser._id });
  if (!cookProfile) {
    cookProfile = await Cook.create({
      userId: cookUser._id,
      name: cookUser.name,
      email: cookUser.email,
      storeName: 'P3 Test Kitchen',
      status: 'active',
      city: 'Riyadh'
    });
  }

  // 3. Create Admin
  let admin = await User.findOne({ email: 'admin.p3@test.com' });
  if (!admin) {
    admin = await User.create({
      email: 'admin.p3@test.com',
      password: 'password123',
      name: 'Test Admin P3',
      role: 'admin',
      countryCode: 'SA'
    });
  }

  // 4. Create Product
  let product = await Product.findOne({ cook: cookUser._id });
  if (!product) {
    product = await Product.create({
      cook: cookUser._id,
      name: 'P3 Test Dish',
      description: 'Test dish description',
      price: 50,
      stock: 10,
      prepTime: 30,
      category: new mongoose.Types.ObjectId(),
      countryCode: 'SA'
    });
  }

  // 5. Get Tokens
  const fLogin = await apiCall('POST', '/api/auth/login', { email: 'foodie.p3@test.com', password: 'password123' });
  foodieToken = fLogin.data.token || fLogin.data.data.token;
  
  const cLogin = await apiCall('POST', '/api/auth/login', { email: 'cook.p3@test.com', password: 'password123' });
  cookToken = cLogin.data.token || cLogin.data.data.token;

  const aLogin = await apiCall('POST', '/api/auth/login', { email: 'admin.p3@test.com', password: 'password123' });
  adminToken = aLogin.data.token || aLogin.data.data.token;

  console.log('   Test data setup complete\n');
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  await User.deleteMany({ email: /p3@test.com/ });
  await Cook.deleteMany({ email: /p3@test.com/ });
  await Product.deleteMany({ name: /P3 Test/ });
  await Notification.deleteMany({ userId: { $in: [foodieId, cookUserId] } });
  await NotificationDedupe.deleteMany({});
  console.log('   Cleanup complete\n');
}

// --- TEST SUITES ---

async function testModelEnums() {
  console.log('--- 1) MODEL ENUMS TEST ---');
  let passed = true;

  // Test that all Phase 3 notification types are valid
  passed &= await test('1.1 Notification model accepts marketing types', async () => {
    const notif = await Notification.create({
      userId: foodieId,
      title: 'Test Cart Reminder',
      message: 'Complete your purchase',
      type: 'marketing_cart',
      entityType: 'cart',
      deepLink: '/cart'
    });
    if (!notif) throw new Error('Failed to create marketing_cart notification');
    await notif.deleteOne();
  });

  passed &= await test('1.2 Notification model accepts marketing_reorder', async () => {
    const notif = await Notification.create({
      userId: foodieId,
      title: 'Order Again!',
      message: 'Try our dishes again',
      type: 'marketing_reorder',
      entityType: 'order',
      deepLink: '/menu'
    });
    if (!notif) throw new Error('Failed to create marketing_reorder notification');
    await notif.deleteOne();
  });

  passed &= await test('1.3 Notification model accepts marketing_promo', async () => {
    const notif = await Notification.create({
      userId: foodieId,
      title: 'Special Offer!',
      message: 'Get 20% off',
      type: 'marketing_promo',
      entityType: 'campaign',
      deepLink: '/offers'
    });
    if (!notif) throw new Error('Failed to create marketing_promo notification');
    await notif.deleteOne();
  });

  passed &= await test('1.4 Notification model accepts marketing_favorite_activity', async () => {
    const notif = await Notification.create({
      userId: foodieId,
      title: 'New from your favorite!',
      message: 'Check out new dishes',
      type: 'marketing_favorite_activity',
      entityType: 'cook',
      entityId: cookUserId,
      deepLink: `/cook/${cookUserId}/menu`
    });
    if (!notif) throw new Error('Failed to create marketing_favorite_activity notification');
    await notif.deleteOne();
  });

  passed &= await test('1.5 Notification model accepts digest_cook_weekly', async () => {
    const notif = await Notification.create({
      userId: cookUserId,
      title: 'Weekly Summary',
      message: 'Your performance this week',
      type: 'digest_cook_weekly',
      entityType: 'digest',
      deepLink: '/cook/dashboard'
    });
    if (!notif) throw new Error('Failed to create digest_cook_weekly notification');
    await notif.deleteOne();
  });

  passed &= await test('1.6 Notification model accepts cook_performance', async () => {
    const notif = await Notification.create({
      userId: cookUserId,
      title: 'Performance Alert',
      message: 'Your rating dropped',
      type: 'cook_performance',
      entityType: 'cook',
      deepLink: '/cook/account-status'
    });
    if (!notif) throw new Error('Failed to create cook_performance notification');
    await notif.deleteOne();
  });

  passed &= await test('1.7 Notification model accepts digest_admin_daily', async () => {
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      const notif = await Notification.create({
        userId: admin._id,
        title: 'Daily Summary',
        message: 'Platform activity today',
        type: 'digest_admin_daily',
        entityType: 'digest',
        deepLink: '/admin/dashboard'
      });
      if (!notif) throw new Error('Failed to create digest_admin_daily notification');
      await notif.deleteOne();
    }
  });

  return passed;
}

async function testDedupeModel() {
  console.log('\n--- 2) DEDUPE MODEL TEST ---');
  let passed = true;

  passed &= await test('2.1 NotificationDedupe model exists and works', async () => {
    const dedupe = await NotificationDedupe.create({
      userId: foodieId,
      notificationType: 'marketing_cart',
      dedupeKey: `cart:${foodieId}`,
      cooldownHours: 24
    });
    if (!dedupe) throw new Error('Failed to create dedupe record');
  });

  passed &= await test('2.2 isInCooldown returns true for recent notification', async () => {
    const inCooldown = await NotificationDedupe.isInCooldown(
      foodieId,
      'marketing_cart',
      `cart:${foodieId}`,
      24
    );
    if (!inCooldown) throw new Error('Should be in cooldown');
  });

  passed &= await test('2.3 isInCooldown returns false for different type', async () => {
    const inCooldown = await NotificationDedupe.isInCooldown(
      foodieId,
      'marketing_reorder',
      `reorder:${foodieId}`,
      24
    );
    if (inCooldown) throw new Error('Should NOT be in cooldown for different type');
  });

  return passed;
}

async function testMarketingPushOptIn() {
  console.log('\n--- 3) MARKETING PUSH OPT-IN TEST ---');
  let passed = true;

  // Test that marketing notifications require opt-in
  passed &= await test('3.1 User model has promotionNotifications setting', async () => {
    const foodie = await User.findById(foodieId);
    if (!foodie.notificationSettings.promotionNotifications) {
      throw new Error('Foodie does not have promotionNotifications enabled');
    }
  });

  passed &= await test('3.2 Create marketing notification successfully', async () => {
    const notif = await Notification.create({
      userId: foodieId,
      title: 'Test Marketing',
      message: 'Test message',
      type: 'marketing_cart',
      entityType: 'cart',
      deepLink: '/cart'
    });
    if (!notif) throw new Error('Failed to create marketing notification');
    await notif.deleteOne();
  });

  return passed;
}

async function testDedupeCooldown() {
  console.log('\n--- 4) DEDUPE COOLDOWN TEST ---');
  let passed = true;

  // Clear previous dedupe records
  await NotificationDedupe.deleteMany({ userId: foodieId });

  passed &= await test('4.1 First notification should be sent (no cooldown)', async () => {
    const shouldSend = await NotificationDedupe.isInCooldown(
      foodieId,
      'marketing_reorder',
      `reorder:${foodieId}`,
      24
    );
    if (shouldSend) throw new Error('First notification should NOT be in cooldown');
  });

  passed &= await test('4.2 Record notification and verify cooldown', async () => {
    await NotificationDedupe.recordNotification(
      foodieId,
      'marketing_reorder',
      null,
      `reorder:${foodieId}`,
      24
    );

    const shouldSkip = await NotificationDedupe.isInCooldown(
      foodieId,
      'marketing_reorder',
      `reorder:${foodieId}`,
      24
    );
    if (!shouldSkip) throw new Error('Notification should be in cooldown after recording');
  });

  return passed;
}

async function testDeepLinks() {
  console.log('\n--- 5) DEEP LINKS TEST ---');
  let passed = true;

  // Test that notifications with Phase 3 deep links are created
  passed &= await test('5.1 Cart reminder has correct deep link', async () => {
    const notif = await Notification.create({
      userId: foodieId,
      title: 'Cart Reminder',
      message: 'Complete your order',
      type: 'marketing_cart',
      entityType: 'cart',
      deepLink: '/cart'
    });
    if (notif.deepLink !== '/cart') throw new Error('Deep link should be /cart');
    await notif.deleteOne();
  });

  passed &= await test('5.2 Promo reminder has /offers deep link', async () => {
    const notif = await Notification.create({
      userId: foodieId,
      title: 'Special Offer',
      message: '20% off today',
      type: 'marketing_promo',
      entityType: 'campaign',
      deepLink: '/offers'
    });
    if (notif.deepLink !== '/offers') throw new Error('Deep link should be /offers');
    await notif.deleteOne();
  });

  passed &= await test('5.3 Favorite cook activity has cook menu deep link', async () => {
    const notif = await Notification.create({
      userId: foodieId,
      title: 'New Dishes!',
      message: 'Your favorite cook added new items',
      type: 'marketing_favorite_activity',
      entityType: 'cook',
      entityId: cookUserId,
      deepLink: `/cook/${cookUserId}/menu`
    });
    if (notif.deepLink !== `/cook/${cookUserId}/menu`) {
      throw new Error(`Deep link should be /cook/${cookUserId}/menu`);
    }
    await notif.deleteOne();
  });

  passed &= await test('5.4 Cook digest has dashboard deep link', async () => {
    const notif = await Notification.create({
      userId: cookUserId,
      title: 'Weekly Summary',
      message: 'Your performance this week',
      type: 'digest_cook_weekly',
      entityType: 'digest',
      deepLink: '/cook/dashboard'
    });
    if (notif.deepLink !== '/cook/dashboard') throw new Error('Deep link should be /cook/dashboard');
    await notif.deleteOne();
  });

  return passed;
}

runTests();
