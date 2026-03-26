const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables from the server directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Database connection
const connectDB = require('./config/db');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Track database connection status
let isDbConnected = false;

// Initialize database connection BEFORE server starts - WAIT for it
const initDb = async () => {
  try {
    const conn = await connectDB();
    isDbConnected = !!conn;
    console.log('[Server] Database connection established');
  } catch (error) {
    console.error('[Server] ERROR connecting to database:', error);
    isDbConnected = false;
  }
  return isDbConnected;
};

// Run DB init and then start server
initDb().then(() => {
  const PORT = process.env.PORT || 5005;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Database ready: ${isDbConnected}`);
  });
});

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
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
console.log(`[Server] Static /uploads route serving from: ${UPLOAD_DIR}`);

// Image proxy endpoint for Flutter Web to bypass CORS on GCS images
// IMPORTANT: Add security to only allow specific image hosts
const ALLOWED_IMAGE_HOSTS = [
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'eltekkeya.firebasestorage.app'
];

app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  
  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  try {
    // Security: Validate URL host is allowed
    const urlObj = new URL(imageUrl);
    const host = urlObj.host;
    
    const isAllowed = ALLOWED_IMAGE_HOSTS.some(allowed => 
      host === allowed || host.endsWith('.' + allowed)
    );
    
    if (!isAllowed) {
      console.error('[Proxy Image] Blocked invalid host:', host);
      return res.status(403).json({ error: 'Invalid image source host' });
    }
    
    // Fetch image from source URL
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    // Get content type from response or detect from URL
    const contentType = response.headers['content-type'] || 
      (imageUrl.endsWith('.png') ? 'image/png' :
       imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg') ? 'image/jpeg' :
       imageUrl.endsWith('.webp') ? 'image/webp' :
       imageUrl.endsWith('.gif') ? 'image/gif' :
       'application/octet-stream');
    
    // Set headers to allow CORS and cache
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', response.data.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // Send the image data
    res.send(response.data);
  } catch (error) {
    console.error('[Proxy Image] Error fetching image:', error.message);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Home Food Marketplace API' });
});

// Disable debug routes in production
const isDev = process.env.NODE_ENV !== 'production';

// Disable console.log in production
if (!isDev) {
  console.log = () => {};
}

// Debug endpoint to verify routes (development only)
if (isDev) {
  app.get('/api/debug/routes', (req, res) => {
    res.json({
      serverBuildStamp: 'MAR03_DB_FIX',
      routes: ['GET /api/orders/cook/orders/:id']
    });
  });
}

// Error handling for route imports
try {
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
  app.use('/api/messages', require('./routes/message.routes'));
  app.use('/api/support', require('./routes/support.routes'));
  
  console.log('[Server] All routes loaded successfully');
} catch (error) {
  console.error('[Server] ERROR loading routes:', error);
}

// Start notification scheduler for Phase 3 triggers
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATION_SCHEDULER === 'true') {
  try {
    require('./services/notificationScheduler');
    console.log('[Server] Notification scheduler started');
  } catch (error) {
    console.error('[Server] ERROR starting notification scheduler:', error);
  }
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});

module.exports = { app, server, io };
