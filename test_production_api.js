const https = require('https');

// Direct test of production API
const url = 'https://api.eltekkeya.com/api/cooks/top-rated?country=SA&limit=10';

console.log('Testing production API directly...');
console.log('URL:', url);
console.log('');

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    console.log('');
    
    try {
      const parsed = JSON.parse(data);
      console.log('Success:', parsed.success);
      console.log('Count:', parsed.count);
      console.log('Data length:', parsed.data ? parsed.data.length : 0);
      
      if (parsed.data && parsed.data.length > 0) {
        console.log('\nCooks returned:');
        parsed.data.forEach((cook, i) => {
          console.log(`${i+1}. ${cook.storeName || cook.name}`);
          console.log(`   isTopRated: ${cook.isTopRated}`);
          console.log(`   status: ${cook.status}`);
          console.log(`   profilePhoto: ${cook.profilePhoto}`);
        });
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err.message);
});
