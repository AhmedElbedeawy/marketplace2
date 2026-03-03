const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace', {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      // Retry failed operations
      retryReads: true,
      retryWrites: true,
      // Heartbeat to detect stale connections
      heartbeatFrequencyMS: 10000
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.log('MongoDB connection failed. Starting server without database connection.');
    // Don't exit the process, let the server start without DB connection
  }
};

module.exports = connectDB;