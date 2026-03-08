// Test MongoDB connection for Cloud Run
const mongoose = require('mongoose');

// CRITICAL: Disable buffering BEFORE connecting
mongoose.set('bufferCommands', false);

async function testConnection() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace';
  
  console.log('Testing MongoDB connection...');
  console.log(`URI: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);
  
  try {
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      retryReads: true,
      retryWrites: true,
      directConnection: false,
      tls: true
    });

    console.log('✅ MongoDB Connected Successfully!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    
    // Test a simple query
    const db = conn.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`   Collections found: ${collections.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
