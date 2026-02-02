const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marketplace');

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.log('MongoDB connection failed. Starting server without database connection.');
    // Don't exit the process, let the server start without DB connection
  }
};

module.exports = connectDB;