const http = require('http');

const BASE_URL = 'http://localhost:5005';

const apiCall = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

(async () => {
  console.log('Testing login...');
  try {
    const result = await apiCall('POST', '/api/auth/login', {
      email: 'foodie.p2@test.com',
      password: 'password123'
    });
    console.log('Login status:', result.status);
    console.log('Login response:', JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log('Login error:', e.message);
  }

  process.exit(0);
})();
