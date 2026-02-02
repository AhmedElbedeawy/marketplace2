// Simple test to verify admin panel can connect to backend
const axios = require('axios');

async function testConnection() {
  try {
    console.log('Testing connection to backend...');
    
    // Test direct connection
    const response = await axios.post('http://localhost:5005/api/auth/demo-login', {
      role: 'admin'
    }, {
      timeout: 5000
    });
    
    console.log('✅ Connection successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Connection failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else if (error.request) {
      console.log('No response received:', error.message);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testConnection();