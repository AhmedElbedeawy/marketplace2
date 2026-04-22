const axios = require('axios');
require('dotenv').config();

async function testTopRatedAPI() {
  try {
    const baseUrl = process.env.API_URL || 'http://localhost:5000/api';
    const url = `${baseUrl}/cooks/top-rated`;
    
    console.log('🔍 Testing Top Rated API endpoint');
    console.log(`URL: ${url}\n`);

    const response = await axios.get(url, {
      headers: {
        'x-country-code': 'SA'
      }
    });

    console.log('✅ Response Status:', response.status);
    console.log('\n📊 Response Structure:');
    console.log(`  success: ${response.data.success}`);
    console.log(`  count: ${response.data.count}`);
    console.log(`  data.length: ${response.data.data ? response.data.data.length : 0}`);

    if (response.data.data && response.data.data.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('COOKS RETURNED BY API:');
      console.log('='.repeat(80));
      
      response.data.data.forEach((cook, index) => {
        console.log(`\n${index + 1}. ${cook.storeName || cook.name}`);
        console.log(`   _id: ${cook._id}`);
        console.log(`   name: ${cook.name}`);
        console.log(`   storeName: ${cook.storeName}`);
        console.log(`   profilePhoto: ${cook.profilePhoto || '❌ NULL'}`);
        console.log(`   ratings.average: ${cook.ratings?.average}`);
        console.log(`   ratings.count: ${cook.ratings?.count}`);
        console.log(`   ordersCount: ${cook.ordersCount}`);
        console.log(`   expertise: ${Array.isArray(cook.expertise) ? cook.expertise.length + ' items' : cook.expertise}`);
        console.log(`   status: ${cook.status}`);
        console.log(`   isAvailable: ${cook.isAvailable}`);
        console.log(`   isTopRated: ${cook.isTopRated}`);
      });

      console.log('\n' + '='.repeat(80));
      console.log('MOBILE PARSING TEST');
      console.log('='.repeat(80));

      // Simulate mobile Chef.fromJson
      const firstCook = response.data.data[0];
      console.log('\nSimulating Chef.fromJson for first cook:');
      console.log(`  id: ${firstCook._id}`);
      console.log(`  name (storeName || name): ${firstCook.storeName || firstCook.name}`);
      console.log(`  profileImage (profilePhoto || profileImage): ${firstCook.profilePhoto || firstCook.profileImage || '❌ NULL'}`);
      
      let rating = 0.0;
      if (firstCook.ratings && typeof firstCook.ratings === 'object') {
        rating = firstCook.ratings.average || 0.0;
      } else {
        rating = firstCook.rating || 0.0;
      }
      console.log(`  rating: ${rating}`);
      
      let reviewCount = 0;
      if (firstCook.ratings && typeof firstCook.ratings === 'object') {
        reviewCount = firstCook.ratings.count || 0;
      } else {
        reviewCount = firstCook.reviewCount || 0;
      }
      console.log(`  reviewCount: ${reviewCount}`);

    } else {
      console.log('\n❌ API returned empty data array');
    }

  } catch (error) {
    console.error('❌ API call failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testTopRatedAPI();
