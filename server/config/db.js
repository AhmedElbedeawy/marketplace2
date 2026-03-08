const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace';
    
    console.log(`Attempting MongoDB connection to: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);
    
    // CRITICAL FOR CLOUD RUN: Disable buffering to prevent timeout errors
    mongoose.set('bufferCommands', false);
    
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000, // Increased for serverless
      connectTimeoutMS: 30000, // Connection timeout
      heartbeatFrequencyMS: 10000,
      retryReads: true,
      retryWrites: true,
      directConnection: false, // Required for Atlas replica sets
      tls: true // Required for Atlas
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.log('Server starting without database connection - endpoints will return 503');
    return null;
  }
};

module.exports = connectDB;