# MongoDB Connection Timeout Fix

## Issue
Production server is experiencing MongoDB connection timeouts:
- `Operation 'users.findOne()' buffering timed out after 10000ms`
- `Operation 'categories.find()' buffering timed out after 10000ms`
- All API endpoints returning 500 errors

## Root Cause
The MongoDB connection is timing out due to:
1. Missing connection pool configuration
2. Possible IP whitelist restrictions in MongoDB Atlas
3. No heartbeat mechanism to detect stale connections

## Fixes Applied

### 1. Enhanced Database Connection Configuration ✅

**File:** `server/config/db.js`

Added connection pool settings:
```javascript
{
  maxPoolSize: 10,           // Maximum number of connections
  minPoolSize: 5,            // Minimum number of connections (keep-alive)
  socketTimeoutMS: 45000,    // Socket timeout (45 seconds)
  serverSelectionTimeoutMS: 5000,  // Server selection timeout (5 seconds)
  retryReads: true,          // Retry failed read operations
  retryWrites: true,         // Retry failed write operations
  heartbeatFrequencyMS: 10000 // Check connection health every 10 seconds
}
```

### 2. Required Actions for Production

#### Step 1: Whitelist Production Server IP in MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Select your cluster: **MPCluster**
3. Click **Network Access** in the left sidebar
4. Click **Add IP Address**
5. Add your production server's public IP address
   - If you don't know it, check your GCP Compute Engine instance details
6. Click **Confirm**

**OR** (for testing only - not recommended for production):
- Add `0.0.0.0/0` to allow all IPs (security risk!)

#### Step 2: Verify MongoDB Connection String

Your current connection string:
```
mongodb+srv://ahmedelbedeawy_db_user:Z0AHQ6Eo07o2Nout@mpcluster.odymgfu.mongodb.net/?retryWrites=true&w=majority&appName=MPCluster
```

Make sure:
- Username: `ahmedelbedeawy_db_user`
- Password: `Z0AHQ6Eo07o2Nout` (no special characters that need encoding)
- Cluster: `mpcluster.odymgfu.mongodb.net`
- Database name is specified (add `/marketplace` before `?` if needed)

#### Step 3: Deploy the Updated Code

```bash
# On your production server
cd /path/to/server
git pull origin rescue/capture-working-state
npm install
pm2 restart server  # or however you manage the server
```

#### Step 4: Check Server Logs

After deployment, monitor the logs:
```bash
# Check for successful connection
tail -f server.log | grep "MongoDB Connected"
```

You should see:
```
MongoDB Connected: mpcluster-shard-00-00.odymgfu.mongodb.net
Database: marketplace
```

### 3. Testing Locally

To test the connection locally:

```bash
cd server
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

## Troubleshooting

### Still Getting Timeouts?

1. **Check MongoDB Atlas Status**
   - Go to atlas.mongodb.com
   - Verify cluster is running (green status)
   - Check if you've exceeded connection limits

2. **Test Connection from Server**
   SSH into your production server and run:
   ```bash
   node -e "
   const mongoose = require('mongoose');
   mongoose.connect('mongodb+srv://ahmedelbedeawy_db_user:Z0AHQ6Eo07o2Nout@mpcluster.odymgfu.mongodb.net/')
     .then(() => console.log('✅ Success'))
     .catch(err => console.error('❌ Failed:', err.message));
   "
   ```

3. **Check Firewall Rules**
   - Ensure outbound traffic on port 27017 is allowed
   - GCP: Check VPC network firewall rules

4. **DNS Resolution**
   From production server:
   ```bash
   nslookup mpcluster.odymgfu.mongodb.net
   ```
   Should return IP addresses

5. **Reset Database Password**
   If credentials might be compromised:
   - Go to MongoDB Atlas → Database Access
   - Edit user `ahmedelbedeawy_db_user`
   - Set new password
   - Update `.env` file with new password
   - Restart server

## Prevention

### Environment-Specific Configuration

Create `server/.env.production`:

```env
# Production MongoDB (separate from development)
MONGO_URI=mongodb+srv://ahmedelbedeawy_db_user:PASSWORD@mpcluster.odymgfu.mongodb.net/marketplace?retryWrites=true&w=majority

# Connection settings
NODE_ENV=production
PORT=5005

# CORS for production domains
CLIENT_URL=https://www.eltekkeya.com
ADMIN_URL=https://admin.eltekkeya.com

# JWT (use strong production secret)
JWT_SECRET=your-strong-production-secret-key-here
JWT_EXPIRE=30d
```

### Monitoring

Set up alerts in MongoDB Atlas:
1. Go to **Alerts** tab
2. Create alert for:
   - Connection count > 80% of limit
   - CPU usage > 80%
   - Disk usage > 80%
   - Replication lag > 60 seconds

## Summary

**What Changed:**
- ✅ Added connection pooling configuration
- ✅ Added heartbeat monitoring
- ✅ Added retry logic for failed operations
- ✅ Reduced server selection timeout from 10s to 5s

**What You Need to Do:**
1. ⚠️ Whitelist production server IP in MongoDB Atlas
2. ⚠️ Deploy updated code to production
3. ⚠️ Verify connection in production logs
4. ⚠️ Test login functionality

**Expected Result:**
- Login should work without timeouts
- All API calls should succeed
- No more "buffering timed out" errors
