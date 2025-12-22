# BloodLink - Startup & Deployment Guide

## Prerequisites

- **Node.js**: v14 or higher (check: `node --version`)
- **npm**: v6 or higher (check: `npm --version`)
- **MongoDB**: Atlas or local instance
- **Gmail Account**: For SMTP email notifications
- **Mapbox Account**: For location visualization

---

## Step 1: Initial Setup

### 1.1 Install Dependencies
```bash
cd "c:\Users\aryan\OneDrive\Desktop\Blood link"
npm install
```

Expected packages:
- express
- socket.io v4.6.1+
- mongoose
- mongodb
- nodemailer
- jsonwebtoken
- bcryptjs
- cookie-parser
- cors

### 1.2 Create `.env` File

Create file at root: `.env`

```env
# MongoDB Connection
MONGODB_URI=<your-mongodb-uri>

# JWT Secret (minimum 32 characters, use random string)
JWT_SECRET=<your-secure-random-jwt-secret-min-32-chars>

# Mapbox Token (get from mapbox.com)
MAPBOX_ACCESS_TOKEN=<your-mapbox-access-token>

# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASS=<your-gmail-app-password>

# Application URLs
CLIENT_URL=http://localhost:5000
NODE_ENV=development
PORT=5000
```

### 1.3 Gmail Setup for SMTP

**Important**: Gmail doesn't allow regular passwords for SMTP. You must use an "App Password":

1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" (if not already enabled)
3. Go back to Security settings
4. Find "App passwords" (appears after 2FA is enabled)
5. Select "Mail" and "Windows Computer"
6. Gmail generates 16-character password
7. Copy this 16-character password to `SMTP_PASS` in `.env`

**Example**:
```
SMTP_USER=bloodlink.notify@gmail.com
SMTP_PASS=<your-16-char-gmail-app-password>
```

### 1.4 MongoDB Setup

**Using MongoDB Atlas** (cloud):
1. Create account at https://mongodb.com/cloud/atlas
2. Create cluster (free tier available)
3. Create database user with password
4. Get connection string: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bloodlink`
5. Add to `.env` as `MONGODB_URI`

**Using Local MongoDB**:
```env
MONGODB_URI=mongodb://localhost:27017/bloodlink
```

### 1.5 Mapbox Setup

1. Create account at https://mapbox.com
2. Go to Account → Tokens
3. Copy default public token (starts with `pk.eyJ`)
4. Paste into `.env` as `MAPBOX_ACCESS_TOKEN`

---

## Step 2: Verify Configuration

### 2.1 Check .env File Exists
```bash
# Windows PowerShell
Test-Path .env
# Should output: True

# Show content
Get-Content .env
```

### 2.2 Test MongoDB Connection
```bash
npm start
```

Look for output:
```
✓ MongoDB connected
✓ Server running on port 5000
```

If you see MongoDB connection error:
- Verify `MONGODB_URI` is correct
- Check if MongoDB Atlas cluster is active
- Verify IP whitelist on MongoDB Atlas includes your IP (allow 0.0.0.0/0 for development)
- Check firewall isn't blocking MongoDB port 27017

### 2.3 Test Socket.io
```
Open: http://localhost:5000
Open DevTools (F12) → Console
Type: socket.connected
Should show: true (or Socket object)
```

If Socket not connected:
- Check Network tab → WS filter
- Should see WebSocket connection to `http://localhost:5000/socket.io`
- If not, server may not have Socket.io initialized

### 2.4 Test Mapbox Token
```
Open: http://localhost:5000
Open DevTools → Network tab
Create emergency (as hospital) or load donor dashboard
Look for GET request: /api/mapbox-token
Response should show: {"token": "pk.eyJ..."}
```

If token not returned:
- Check MAPBOX_ACCESS_TOKEN in .env
- Verify server has app.get('/api/mapbox-token') route
- Check token format (should start with pk.eyJ)

---

## Step 3: Start the Application

### 3.1 Development Mode
```bash
npm start
```

**Expected Output**:
```
✓ Server running on port 5000
✓ MongoDB connected
✓ Socket.io initialized
✓ Email service ready
```

### 3.2 Check Server Health
```
Open browser: http://localhost:5000/health
Should see: {status: "ok"}
```

### 3.3 Access Application
```
Dashboard: http://localhost:5000/
Hospital Login: http://localhost:5000/auth/login
Donor Login: http://localhost:5000/auth/login
```

---

## Step 4: Complete Setup Verification

### 4.1 Create Test Accounts

**Create Hospital Account**:
1. Go to http://localhost:5000/auth/signup
2. Select "Hospital"
3. Fill form with test data:
   - Email: hospital@test.com
   - Password: <your-test-password>
   - Hospital Name: Test Hospital
   - License: TEST123456
   - Contact: +1234567890
4. Submit → Should redirect to dashboard

**Create Donor Account**:
1. Go to http://localhost:5000/auth/signup
2. Select "Donor"
3. Fill form:
   - Email: donor@test.com
   - Password: <your-test-password>
   - Name: Test Donor
   - Blood Type: O+
   - Age: 25
   - Location: [latitude, longitude] (e.g., 40.7128, -74.0060 for NYC)
4. Submit → Should redirect to dashboard

### 4.2 Test Emergency Creation

**As Hospital Account**:
1. Click "Emergency Request" tab
2. Fill emergency form:
   - Emergency Level: Critical
   - Blood Group: O+
   - Units: 2
   - Patient Name: John Doe
   - Condition: Accident / Trauma
   - Contact: +9876543210
3. Submit

**Expected**:
- Form submitted successfully
- Redirect to hospital dashboard
- Emergency appears in "Active Emergencies"
- Console shows: "Emergency created successfully"

### 4.3 Test Donor Notification

**As Donor Account** (in different browser/tab):
1. Login to Donor Dashboard
2. Browser should ask for geolocation permission (click "Allow")
3. After hospital creates emergency:
   - Red alert banner should appear
   - Sound alarm should play (if volume on)
   - Emergency Requests count should increase
   - Mapbox should update with emergency location

**In Browser Console**:
```javascript
console.log(socket.connected);  // Should be true
// Check Network → WS tab → Messages
// Should see emergencyAlert event with data
```

### 4.4 Test Map Functionality

1. In Donor Dashboard, click "Emergency Requests"
2. Mapbox should display with:
   - Blue marker at donor location
   - Red pulsing marker at hospital location
   - Zoom fitted to show both
3. Click red marker → Popup shows hospital info
4. Click "Respond to Emergency" button

**Expected**:
- Popup appears with full emergency details
- Respond button submits without page reload
- Hospital sees new responder

### 4.5 Test Email Notification

1. Create emergency as hospital
2. Check Gmail inbox (SMTP_USER account)
3. Should receive email from bloodlink system:
   - Subject: "🚨 EMERGENCY Blood Request - [Blood Type]"
   - Contains hospital name, blood type, units, patient condition
   - Has direct link to dashboard
   - Professional HTML formatting

**If Email Not Received**:
- Check spam folder
- Verify SMTP_USER email is correct
- Verify SMTP_PASS is app-specific password (16 chars)
- Check server logs for email errors
- Try sending test email: https://ethereal.email (for testing)

### 4.6 Test Donation Completion & Badges

**As Hospital**:
1. See responder in emergency details
2. When donor arrives, click "Mark as Arrived"
3. When donation done, click "Complete Donation"
4. Confirm donation (units donated, etc.)

**As Donor**:
1. Should see notification: "Thank you for saving lives!"
2. Navigate to "My Achievements"
3. Should see new badge: "Life Saver" or "Quick Response"
4. Points should increase on leaderboard
5. Navigate to "My Certificates"
6. Should see PDF download for donation

**If Badges Not Appearing**:
- Check MongoDB → DonorBadge collection
- Verify completeEmergencyDonation() was called
- Check server logs for errors
- Try creating another donation

---

## Step 5: Troubleshooting

### Problem: Cannot Connect to MongoDB

**Error**: `MongooseError: Cannot connect to MongoDB`

**Solutions**:
```bash
# 1. Verify connection string
echo $env:MONGODB_URI    # PowerShell
$env:MONGODB_URI        # Check if set

# 2. Test connection manually
mongosh "your-mongodb-uri"

# 3. Check if local MongoDB is running
# For local: Start MongoDB service
# For Atlas: Verify IP whitelist and credentials

# 4. Check .env file syntax
# Make sure no spaces around = signs
# Correct: MONGODB_URI=<your-mongodb-uri>
# Wrong: MONGODB_URI = <your-mongodb-uri>
```

### Problem: Socket.io Not Connected

**Error**: `socket.connected = false` in console

**Solutions**:
```bash
# 1. Verify server started properly
npm start
# Should show: "Server running on port 5000"

# 2. Check Network tab
# Open DevTools → Network → WS filter
# Should see WebSocket connection to /socket.io

# 3. Check for port conflicts
# If port 5000 in use: Change PORT in .env
# Then restart server

# 4. Check firewall
# Allow Node.js through Windows Firewall
```

### Problem: Mapbox Not Showing

**Error**: Blank gray area where map should be

**Solutions**:
```javascript
// In console, check:
console.log(mapboxgl);                          // Should exist
console.log(window.emergencyMapFunctions);      // Should exist
console.log(mapboxgl.accessToken);              // Should have token

// Check Network tab:
// GET /api/mapbox-token should return 200 with token
```

If Mapbox CSS not loaded:
```html
<!-- Check in donor-dashboard.ejs for these lines: -->
<link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css">
<script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js">
```

### Problem: Geolocation Not Working

**Error**: Mapbox shows blank map without locations

**Solutions**:
```javascript
// In console:
navigator.geolocation.getCurrentPosition(
  pos => console.log(pos.coords),
  err => console.log('Geolocation error:', err)
);
```

**Common Issues**:
- User denied geolocation → Click lock icon in address bar, allow location
- HTTP only (not HTTPS) → Geolocation blocked unless localhost
- Browser doesn't support → Try Chrome or Edge
- Server couldn't receive location → Check POST /api/donor/update-location in Network tab

### Problem: Email Not Sending

**Error**: No email received, server shows error in logs

**Solutions**:
```bash
# 1. Verify SMTP settings
# Check .env has:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASS=<your-16-char-gmail-app-password>

# 2. Verify app password (NOT regular password)
# Go to: https://myaccount.google.com/apppasswords
# Generate new app password, copy to SMTP_PASS

# 3. Test email sending
# In Node REPL:
```

```javascript
const {sendEmail, emailTemplates} = require('./src/utils/emailService');
await sendEmail(
  'test@example.com',
  'Test Email',
  emailTemplates.emergencyRequestNotification(
    'Test Hospital', 'O+', 2, 'Test condition', 30, '555-1234'
  )
);
```

### Problem: Emergency Not Notifying Donors

**Error**: Hospital creates emergency but donors don't get alert

**Solutions**:
1. **Check donor location set**:
   - POST /api/donor/update-location should succeed
   - MongoDB check: User collection → donor user → location.coordinates should exist

2. **Check blood type matches**:
   - Emergency bloodGroup must match donor bloodGroup

3. **Check distance < 30km**:
   - Adjust test by creating donor closer to hospital
   - Or change distance filter in emergencyController

4. **Check socket.io room joined**:
   ```javascript
   // In donor dashboard console:
   console.log('Socket ID:', socket.id);
   console.log('Current donor ID:', currentDonorId);
   // These should be defined
   ```

5. **Check global.io accessible**:
   ```javascript
   // In server.js, verify line exists:
   // global.io = io;
   
   // In emergencyController.js, verify emits:
   if (global.io) {
     global.io.to(donorId).emit('emergencyAlert', {...});
   }
   ```

### Problem: Badge Not Awarded

**Error**: Donation completed but no badge appears

**Solutions**:
```javascript
// In MongoDB check:
// DonorBadge collection → Should have records for user

// In server logs, search for:
// "Badge awarded" or "checkAndAwardBadges"

// Verify function called in emergencyController.js:
// await DonorBadge.checkAndAwardBadges(donorId, {...});
```

---

## Step 6: Environment-Specific Configuration

### Development Setup
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5000
MONGODB_URI=mongodb://localhost:27017/bloodlink
# OR for Atlas:
MONGODB_URI=<your-mongodb-atlas-uri>
```

### Testing Setup
```env
NODE_ENV=testing
PORT=5001
MONGODB_URI=<your-test-mongodb-uri>
SMTP_USER=<your-test-email@gmail.com>
```

### Production Setup (before deploying)
```env
NODE_ENV=production
PORT=3000
CLIENT_URL=https://bloodlink-app.com
MONGODB_URI=<your-production-mongodb-uri>
SMTP_USER=noreply@bloodlink-app.com
JWT_SECRET=<your-production-jwt-secret-min-32-chars>
# Rest same as dev
```

---

## Step 7: Monitoring & Logs

### View Server Logs
```bash
npm start
# All logs output to console
# Press Ctrl+C to stop
```

### Key Log Messages to Watch For

| Message | Meaning |
|---------|---------|
| `✓ Server running on port 5000` | Server started successfully |
| `✓ MongoDB connected` | Database connected |
| `POST /api/emergency/create` | Emergency created |
| `Emitting emergencyAlert` | Notification being sent |
| `Badge awarded` | Badge system working |
| `Email sent to` | Email notification sent |
| `error: MongoDB connection failed` | Database connection issue |
| `error: SMTP configuration invalid` | Email issue |

### Debug Mode
```bash
# Start with debug logging
DEBUG=* npm start
# Very verbose output (not recommended for production)

# Or use nodemon for auto-restart on file changes
npm install -g nodemon
nodemon src/server.js
```

---

## Step 8: Performance Tuning

### MongoDB Indexes (for speed)
```javascript
// In MongoDB terminal, add indexes:
db.users.createIndex({ location: "2dsphere" });        // For geospatial queries
db.bloodrequests.createIndex({ status: 1 });           // For active emergencies
db.notifications.createIndex({ userId: 1, read: 1 });  // For notification queries
db.donors.createIndex({ bloodGroup: 1 });              // For blood type matching
```

### Increase File Descriptors (Linux/Mac)
```bash
ulimit -n 10000  # Allows more simultaneous connections
```

### Enable Gzip Compression
```javascript
// In server.js, add:
const compression = require('compression');
app.use(compression());
npm install compression
```

---

## Step 9: Backup & Recovery

### Backup MongoDB Data
```bash
# Atlas: Automated backups available in Atlas dashboard
# Local MongoDB:
mongodump --uri="<your-mongodb-uri>"
# Creates backup in ./dump/ folder
```

### Restore from Backup
```bash
mongorestore --uri="<your-mongodb-uri>" ./dump/bloodlink
```

---

## Quick Checklist: Before First Use

- [ ] .env file created with all 9 required variables
- [ ] npm install completed (node_modules folder exists)
- [ ] SMTP_USER and SMTP_PASS are from Gmail app passwords
- [ ] MONGODB_URI connects successfully
- [ ] MAPBOX_ACCESS_TOKEN starts with pk.eyJ
- [ ] npm start shows no errors
- [ ] http://localhost:5000/health returns {status: "ok"}
- [ ] Hospital account created and can login
- [ ] Donor account created and can login
- [ ] Emergency can be created
- [ ] Donor receives socket.io notification
- [ ] Mapbox displays locations
- [ ] Email received in Gmail
- [ ] Badge awarded on completion
- [ ] Certificate generated

---

## Support & Debugging Resources

**Error Messages & Solutions**: See "Step 5: Troubleshooting" section above

**Official Documentation**:
- Socket.io: https://socket.io/docs/v4/
- Mapbox: https://docs.mapbox.com/mapbox-gl-js/
- MongoDB: https://docs.mongodb.com/
- Express: https://expressjs.com/

**Test Server Status**:
```bash
# From any terminal in project directory:
curl http://localhost:5000/health
# Should return: {"status":"ok"}
```

---

**Status**: Ready for deployment ✅
**Last Updated**: Complete setup guide created
