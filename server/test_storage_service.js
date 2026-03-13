require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const storageService = require('./services/storageService');

async function testStorageService() {
  console.log('\n=== TESTING STORAGE SERVICE ===\n');
  
  const stats = storageService.getStorageStats();
  console.log('getStorageStats():', stats);
  
  const isEnabled = storageService.isCloudStorageEnabled();
  console.log('isCloudStorageEnabled():', isEnabled);
  
  console.log('\nChecking if cloud upload will work...');
  console.log('  useCloudStorage (internal): requires checking storage module directly');
  
  // Try to access internal state
  const mod = require('./services/storageService');
  console.log('  Module exports:', Object.keys(mod));
}

testStorageService().catch(console.error);
