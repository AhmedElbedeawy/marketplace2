const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve static files from the build/web directory
app.use(express.static(path.join(__dirname, 'build', 'web')));

// Handle all routes by serving index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'web', 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'web', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});