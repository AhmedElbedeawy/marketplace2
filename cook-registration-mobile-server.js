const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Root route with HTML info page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cook Registration - Mobile</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { max-width: 500px; width: 90%; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; }
        h1 { color: #2C2C2C; margin-bottom: 10px; font-size: 28px; }
        p { color: #666; margin-bottom: 10px; line-height: 1.6; }
        .badge { background: #FF7A00; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 20px; }
        code { background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 Cook Registration (Mobile)</h1>
        <p>This server powers the Flutter mobile app cook registration</p>
        <p><strong>Status:</strong> ✅ Running on port 4001</p>
        <p><strong>API Endpoint:</strong> <code>POST /api/cooks/register</code></p>
        <div class="badge">Integration Ready</div>
      </div>
    </body>
    </html>
  `);
});

// API Routes
app.post('/api/cooks/register', (req, res) => {
  try {
    const { name, email, phone, expertise, area, profilePhoto } = req.body;
    console.log('Mobile cook registration received:', name);
    
    // Validate
    if (!name || !email || !phone || !expertise) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // In production, this would save to MongoDB via the main backend
    res.json({
      success: true,
      message: 'Cook registration successful! Your profile is under review.',
      data: { id: 'cook_' + Date.now(), name, email, expertise }
    });
  } catch (error) {
    console.error('Mobile registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Cook Registration Server (Mobile) running on port 4001' });
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`\n✅ Cook Registration Server (Mobile) running on http://localhost:${PORT}`);
  console.log(`📱 Access: http://localhost:${PORT}\n`);
});
