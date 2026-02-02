// test_coupon_fix.js (using native fetch)
async function testCouponGeneration() {
  const API_URL = 'http://localhost:5005/api';
  
  try {
    // 1. Get token (assuming we have a test admin account from previous seeds)
    console.log('Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'test123'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in successfully.');

    // 2. Create COUPON campaign
    console.log('Creating COUPON campaign...');
    const now = new Date();
    const startAt = new Date(now.getTime() + 1000).toISOString(); // 1 second from now
    const endAt = new Date(now.getTime() + 86400000).toISOString(); // 24 hours from now

    const campaignData = {
      name: 'Test Verify Fix ' + Date.now(),
      type: 'COUPON',
      startAt: startAt,
      endAt: endAt,
      discountPercent: 20,
      minOrderValue: 50,
      scope: {
        applyToAll: true
      }
    };

    const campaignRes = await fetch(`${API_URL}/campaigns`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(campaignData)
    });

    const campaignResult = await campaignRes.json();
    console.log('Campaign Creation Result:', JSON.stringify(campaignResult, null, 2));

    if (campaignResult.success && campaignResult.coupon) {
      console.log('✅ SUCCESS: Coupon code generated:', campaignResult.coupon);
    } else {
      console.log('❌ FAILURE: Coupon code NOT generated or missing in response.');
    }

  } catch (error) {
    console.error('❌ ERROR during testing:', error.message);
  }
}

testCouponGeneration();
