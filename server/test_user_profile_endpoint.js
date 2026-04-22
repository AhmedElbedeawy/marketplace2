const axios = require('axios');
require('dotenv').config();

async function testUserProfileEndpoint() {
  try {
    console.log('🔍 Testing /users/profile endpoint for acook@test.com\n');

    // First, login to get token
    const loginResponse = await axios.post(`${process.env.API_URL || 'http://localhost:5000/api'}/auth/login`, {
      email: 'acook@test.com',
      password: 'password123'
    });

    if (!loginResponse.data || !loginResponse.data.token) {
      console.log('❌ Login failed');
      console.log('Response:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Now fetch profile
    const profileResponse = await axios.get(`${process.env.API_URL || 'http://localhost:5000/api'}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('='.repeat(80));
    console.log('PROFILE API RESPONSE');
    console.log('='.repeat(80));
    
    const profile = profileResponse.data;
    console.log(`name: ${profile.name}`);
    console.log(`email: ${profile.email}`);
    console.log(`role_cook_status: ${profile.role_cook_status}`);
    console.log(`profilePhoto: ${profile.profilePhoto ? '✅ HAS VALUE' : '❌ EMPTY'}`);
    if (profile.profilePhoto) {
      console.log(`  Value: ${profile.profilePhoto}`);
    }
    console.log(`cookProfilePhoto: ${profile.cookProfilePhoto ? '✅ HAS VALUE' : '❌ EMPTY'}`);
    if (profile.cookProfilePhoto) {
      console.log(`  Value: ${profile.cookProfilePhoto}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('WHAT ACCOUNT AVATAR WILL SEE');
    console.log('='.repeat(80));

    const avatarSrc = profile.role_cook_status && profile.role_cook_status !== 'none' 
      ? (profile.cookProfilePhoto || profile.profilePhoto) 
      : profile.profilePhoto;

    console.log(`Avatar src: ${avatarSrc ? '✅ ' + avatarSrc : '❌ NO IMAGE'}`);

    console.log('\n' + '='.repeat(80));
    console.log('FULL IMAGE URL TEST');
    console.log('='.repeat(80));

    if (avatarSrc) {
      const fullUrl = avatarSrc.startsWith('http') ? avatarSrc : `${process.env.API_URL || 'http://localhost:5000'}${avatarSrc}`;
      console.log(`Full URL: ${fullUrl}`);

      try {
        const imageResponse = await axios.head(fullUrl);
        console.log(`Image accessible: ✅ YES (status: ${imageResponse.status})`);
      } catch (err) {
        console.log(`Image accessible: ❌ NO (${err.response?.status || err.message})`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testUserProfileEndpoint();
