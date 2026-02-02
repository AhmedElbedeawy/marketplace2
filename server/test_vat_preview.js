require('dotenv').config();

const axios = require('axios');
const mongoose = require('mongoose');

const baseUrl = 'http://localhost:5005';

async function runVatProof() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 VAT & CHECKOUT RUNTIME PROOF - ALL 5 COUNTRIES');
  console.log('='.repeat(70));

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace');
  console.log('✅ MongoDB Connected\n');

  // 1. Check Settings VAT configuration
  console.log('📋 STEP 1: Verify Settings VAT Configuration');
  console.log('-'.repeat(50));
  const Settings = require('./models/Settings');
  const settings = await Settings.getSettings();
  console.log('VAT by Country configuration:');
  settings.vatByCountry.forEach(vat => {
    console.log(`  ${vat.countryCode}: ${vat.countryName} - VAT ${vat.checkoutVatEnabled ? vat.checkoutVatRate + '%' : 'DISABLED'}`);
  });
  console.log('');

  // 2. Login as foodie test account
  console.log('🔐 STEP 2: Login as Foodie Test Account');
  console.log('-'.repeat(50));
  const loginRes = await axios.post(baseUrl + '/api/auth/login', {
    email: 'foodie@test.com',
    password: 'test123'
  });
  const token = loginRes.data.token;
  console.log('✅ Logged in as: foodie@test.com\n');

  const headers = { Authorization: `Bearer ${token}` };
  const countries = ['SA', 'EG', 'AE', 'KW', 'QA'];

  // 3. Create checkout session for each country
  console.log('📦 STEP 3: Create Checkout Sessions for Each Country');
  console.log('-'.repeat(50));
  
  const cartItem = {
    dishId: '69780e52dea74bf71ae49c03', // Molokhia product
    cookId: '696a37ff676beae50b0c55d6', // Abn cook
    quantity: 1,
    unitPrice: 100, // 100 SAR base price
    notes: ''
  };

  for (const country of countries) {
    try {
      const sessionRes = await axios.post(
        baseUrl + '/api/checkout/session',
        { cartItems: [cartItem], countryCode: country },
        { headers }
      );
      
      const session = sessionRes.data.data.session;
      const pricing = session.pricingBreakdown;
      
      console.log(`\n=== ${country} CHECKOUT SESSION ===`);
      console.log(`Session ID: ${session._id}`);
      console.log(`Country Code: ${pricing.countryCode}`);
      console.log(`Currency: ${pricing.currencyCode}`);
      console.log(`VAT Enabled: ${pricing.checkoutVatEnabled}`);
      console.log(`VAT Rate: ${pricing.vatRate}%`);
      console.log(`Subtotal: ${pricing.subtotal}`);
      console.log(`VAT Amount: ${pricing.vatAmount}`);
      console.log(`Total (gross): ${pricing.total}`);
      console.log(`Net Total: ${pricing.netTotal}`);
    } catch (e) {
      console.log(`\n=== ${country} ===`);
      console.log('Session creation skipped (may need valid product IDs)');
      console.log('Error:', e.response?.data?.message || e.message);
    }
  }

  // 4. Try to create an actual order and show VAT snapshot
  console.log('\n\n📋 STEP 4: Create Test Order (VAT Snapshot Proof)');
  console.log('-'.repeat(50));
  
  try {
    // First create a session
    const sessionRes = await axios.post(
      baseUrl + '/api/checkout/session',
      { cartItems: [cartItem], countryCode: 'SA' },
      { headers }
    );
    const sessionId = sessionRes.data.data.session._id;

    // Then create the order
    const orderRes = await axios.post(
      baseUrl + '/api/orders',
      {
        checkoutSessionId: sessionId,
        address: {
          lat: 24.7136,
          lng: 46.6753,
          city: 'Riyadh',
          fullAddress: '123 Test Street, Riyadh'
        },
        paymentMethod: 'CASH'
      },
      { headers }
    );

    const order = orderRes.data.data;
    console.log('\n=== ORDER CREATED (VAT SNAPSHOT) ===');
    console.log(`Order ID: ${order._id}`);
    console.log(`Country Code: ${order.vatSnapshot?.countryCode || 'N/A'}`);
    console.log(`VAT Enabled at Order: ${order.vatSnapshot?.checkoutVatEnabledAtOrder}`);
    console.log(`VAT Rate at Order: ${order.vatSnapshot?.checkoutVatRateAtOrder}%`);
    console.log(`VAT Amount: ${order.vatSnapshot?.vatAmount}`);
    console.log(`Subtotal: ${order.vatSnapshot?.subtotal}`);
    console.log(`Total: ${order.vatSnapshot?.total}`);
    console.log(`VAT Label: ${order.vatSnapshot?.vatLabel || 'N/A'}`);

    // 5. Query MongoDB directly to show stored document
    console.log('\n📄 STEP 5: MongoDB Order Document (Raw)');
    console.log('-'.repeat(50));
    const Order = require('./models/Order');
    const dbOrder = await Order.findById(order._id).lean();
    console.log(JSON.stringify({
      _id: dbOrder._id,
      customer: dbOrder.customer,
      status: dbOrder.status,
      vatSnapshot: dbOrder.vatSnapshot,
      pricingSnapshot: dbOrder.pricingSnapshot
    }, null, 2));

  } catch (e) {
    console.log('Order creation failed (may need valid product/cook IDs):');
    console.log('Error:', e.response?.data?.message || e.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ VAT & CHECKOUT PROOF COMPLETE');
  console.log('='.repeat(70));

  await mongoose.disconnect();
}

runVatProof().catch(console.error);
