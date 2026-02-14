const axios = require('axios');

const BASE_URL = 'http://localhost:5005/api';

// Get a valid token from test account
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTZhMzdmZjY3NmJlYWU1MGIwYzU1ZDYiLCJyb2xlIjoiY29vayIsImlhdCI6MTczODY4NDAyNn0.RUDjuW_XW4_7LM_nB5lxTLzYVz36xF6r1HGxWdmB0wA';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TEST_TOKEN}`
  }
});

async function testEnglishBroadcast() {
  console.log('\n📧 TEST 1: Create English Broadcast');
  console.log('─'.repeat(50));

  try {
    const response = await api.post('/notifications/broadcast', {
      title: 'Test English Broadcast',
      message: 'This is an English test notification from Phase 4 verification',
      type: 'announcement',
      role: 'all',
      language: 'en'
    });

    console.log('✅ Broadcast created successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

async function testArabicBroadcast() {
  console.log('\n📧 TEST 2: Create Arabic Broadcast');
  console.log('─'.repeat(50));

  try {
    const response = await api.post('/notifications/broadcast', {
      titleAr: 'اختبار البث العربي',
      messageAr: 'هذه رسالة اختبار عربية من التحقق من المرحلة 4',
      type: 'announcement',
      role: 'all',
      language: 'ar'
    });

    console.log('✅ Arabic broadcast created successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

async function checkNotifications() {
  console.log('\n🔍 TEST 3: Fetch Notifications (Check Database)');
  console.log('─'.repeat(50));

  try {
    const response = await api.get('/notifications');
    
    console.log(`✅ Fetched ${response.data.data.notifications.length} notifications`);
    
    // Find test notifications
    const testNotifications = response.data.data.notifications.filter(n => 
      n.title?.includes('Test') || n.titleAr?.includes('اختبار')
    );

    if (testNotifications.length > 0) {
      console.log(`\n📌 Found ${testNotifications.length} test notifications:`);
      testNotifications.forEach((n, idx) => {
        console.log(`\n[${idx + 1}] Notification ID: ${n._id}`);
        console.log(`   Title (EN): ${n.title || 'N/A'}`);
        console.log(`   Title (AR): ${n.titleAr || 'N/A'}`);
        console.log(`   Message (EN): ${n.message?.substring(0, 50) || 'N/A'}...`);
        console.log(`   Message (AR): ${n.messageAr?.substring(0, 50) || 'N/A'}...`);
        console.log(`   Type: ${n.type}`);
        console.log(`   Created: ${new Date(n.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('⚠️  No test notifications found in database');
    }

    return testNotifications;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return [];
  }
}

async function runAllTests() {
  console.log('🧪 ARABIC NOTIFICATIONS VERIFICATION TEST SUITE');
  console.log('═'.repeat(50));

  // Test English broadcast
  await testEnglishBroadcast();
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test Arabic broadcast
  await testArabicBroadcast();
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check what's in the database
  const testNotifications = await checkNotifications();

  console.log('\n' + '═'.repeat(50));
  console.log('📋 PHASE 4 VERIFICATION SUMMARY');
  console.log('═'.repeat(50));
  
  if (testNotifications.length >= 2) {
    const enNotif = testNotifications.find(n => n.title?.includes('English'));
    const arNotif = testNotifications.find(n => n.titleAr?.includes('عربي'));

    console.log('\n✅ Schema verification:');
    console.log(`   - titleAr field exists: ${enNotif?.titleAr !== undefined ? '✓' : '✗'}`);
    console.log(`   - messageAr field exists: ${enNotif?.messageAr !== undefined ? '✓' : '✗'}`);

    console.log('\n✅ English broadcast saved correctly:');
    console.log(`   - Has title: ${!!enNotif?.title}`);
    console.log(`   - Has message: ${!!enNotif?.message}`);
    console.log(`   - titleAr is null: ${enNotif?.titleAr === null}`);

    console.log('\n✅ Arabic broadcast saved correctly:');
    console.log(`   - Has titleAr: ${!!arNotif?.titleAr}`);
    console.log(`   - Has messageAr: ${!!arNotif?.messageAr}`);
    console.log(`   - Can fallback to English: ${!arNotif?.title ? 'fallback ready' : 'title present'}`);
  } else {
    console.log('\n❌ Insufficient test data to verify');
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Open web app in Arabic mode');
  console.log('2. Verify new notifications display Arabic text');
  console.log('3. Switch to English mode');
  console.log('4. Verify notifications show English fallback');
  console.log('\n' + '═'.repeat(50));
}

runAllTests().catch(console.error);
