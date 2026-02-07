const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

// Load environment variables from the server directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Database connection
const connectDB = require('./config/db');
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Environment configuration for uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR) 
  : path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploaded images
// NOTE: For production, ensure this directory is mounted on persistent storage
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true
}));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Home Food Marketplace API' });
});

// Debug endpoint to verify routes
app.get('/api/debug/routes', (req, res) => {
  res.json({
    serverBuildStamp: 'FEB04_A1',
    routes: [
      'GET /api/orders/cook/orders/:id'
    ]
  });
});

// Debug endpoint to verify routes
app.get("/api/debug/routes", (req, res) => {
  res.json({
    serverBuildStamp: "FEB04_A1",
    routes: [
      "GET /api/orders/cook/orders/:id"
    ]
  });
});
// Error handling for route imports
try {
  // User routes
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/users', require('./routes/user.routes'));
  app.use('/api/products', require('./routes/product.routes'));
  app.use('/api/orders', require('./routes/order.routes'));
  app.use('/api/cart', require('./routes/cart.routes'));
  app.use('/api/favorites', require('./routes/favorite.routes'));
  app.use('/api/categories', require('./routes/category.routes'));
  app.use('/api/expertise', require('./routes/expertise.routes'));
  app.use('/api/admin', require('./routes/admin.routes'));
  app.use('/api/admin-dishes', require('./routes/adminDish.routes'));
  app.use('/api/public/admin-dishes', require('./routes/adminDishPublic.routes'));
  app.use('/api/dish-offers', require('./routes/dishOffer.routes'));
  app.use('/api/settings', require('./routes/settings.routes'));
  app.use('/api/cooks', require('./routes/cook.routes'));
  app.use('/api/ratings', require('./routes/rating.routes'));
  app.use('/api/checkout', require('./routes/checkout.routes'));
  app.use('/api/campaigns', require('./routes/campaign.routes'));
  app.use('/api/dashboard', require('./routes/dashboard.routes'));
  app.use('/api/addresses', require('./routes/address.routes'));
  app.use('/api/invoices', require('./routes/invoice.routes'));
  app.use('/api/notifications', require('./routes/notification.routes'));
  app.use('/api/support', require('./routes/support.routes'));
} catch (error) {
  console.error('Error loading routes:', error);
}

// Start notification scheduler for Phase 3 triggers
// Only start in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATION_SCHEDULER === 'true') {
  try {
    const { startScheduler } = require('./services/notificationScheduler');
    startScheduler();
    console.log('Notification scheduler initialized');
  } catch (error) {
    console.error('Failed to start notification scheduler:', error);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: "We couldn't find what you're looking for.", code: 'NOT_FOUND' });
});

// Global error handler
const { globalErrorHandler } = require('./utils/errorHandler');
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5005;

server.listen(PORT, () => {
  console.log("SERVER_BUILD_STAMP: FEB04_A1");
  console.log(`Server is running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = { app, io };
