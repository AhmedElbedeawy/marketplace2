const http = require('http');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5005';

const apiCall = (method, path, body = null, headers = {}) => {
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

(async () => {
  require('dotenv').config();
  
  // Login as admin
  console.log('1. Logging in as admin...');
  const adminLogin = await apiCall('POST', '/api/auth/login', {
    email: 'admin.p2@test.com',
    password: 'password123'
  });
  const adminToken = adminLogin.data.token || adminLogin.data.data?.token;
  console.log('   Admin token:', adminToken ? 'Found' : 'Not found');

  // Get test data
  console.log('\n2. Getting test data from MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./models/User');
  const Invoice = require('./models/Invoice');

  const cook = await User.findOne({ email: 'cook.p2@test.com' });
  const invoice = await Invoice.findOne({});

  console.log('   Cook ID:', cook?._id);
  console.log('   Invoice ID:', invoice?._id);
  console.log('   Invoice cook:', invoice?.cook);

  // Test payout
  console.log('\n3. Testing payout API...');
  const payoutResult = await apiCall('POST', `/api/admin/invoices/${invoice._id}/payouts`, {
    method: 'bank_transfer',
    status: 'completed',
    amount: 45
  }, { Authorization: `Bearer ${adminToken}` });

  console.log('   Payout status:', payoutResult.status);
  console.log('   Payout response:', JSON.stringify(payoutResult.data, null, 2));

  // Check notification
  const Notification = require('./models/Notification');
  const notif = await Notification.findOne({ userId: cook._id, type: 'payout' }).sort({ createdAt: -1 });
  console.log('\n4. Checking notification...');
  console.log('   Notification found:', !!notif);
  if (notif) {
    console.log('   Notification:', {
      type: notif.type,
      title: notif.title,
      deepLink: notif.deepLink
    });
  }

  await mongoose.disconnect();
  process.exit(0);
})();
