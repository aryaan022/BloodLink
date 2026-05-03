# BloodLink - Blood Donation Emergency Response System

A production-ready blood donation management system with emergency blood request, real-time notifications, Mapbox location visualization, and donor gamification with badges and certificates.

## ⚡ Quick Start

```bash
npm install
# Create .env file (see STARTUP_GUIDE.md)
npm start
```

See [STARTUP_GUIDE.md](STARTUP_GUIDE.md) for complete setup instructions.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [STARTUP_GUIDE.md](STARTUP_GUIDE.md) | Step-by-step setup & configuration |
| [TEST_SCENARIO.md](TEST_SCENARIO.md) | End-to-end testing workflows |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | API reference & debugging |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Technical architecture & details |

---

## 🎯 Core Features

### 1. Emergency Blood Request System ✅
- Hospital creates emergency request for critical blood needs
- **Real-time socket.io notification** to eligible donors within 30km
- **Email alerts** with professional HTML template
- **Sound alert** (800Hz emergency beep)
- **One-click response** from interactive Mapbox
- **Automatic tracking** of responders and donations
- **Instant badge & points** awarded on completion

### 2. Mapbox Location Visualization ✅
- **Live emergency map** showing hospital location (red pulsing marker)
- **Donor location** displayed in blue
- **Auto-fit bounds** to show all emergencies
- **Interactive popups** with hospital info and respond button
- **Real-time marker updates** as emergencies change

### 3. Geolocation Auto-Capture ✅
- Browser automatically captures donor location on dashboard load
- Location stored in database: `User.location.coordinates [longitude, latitude]`
- POSTs to `/api/donor/update-location` endpoint
- Used for 30km radius matching of eligible donors
- Updates Mapbox visualization in real-time

### 4. Email Notifications ✅
- Professional HTML email template for emergency requests
- Contains: Hospital name, blood type, units, patient condition, time limit, contact
- Direct action link to dashboard
- Sent via Gmail SMTP (configurable)

### 5. Donor Badges & Gamification ✅
- **Life Saver**: First emergency donation
- **Quick Response**: Responded within 15 minutes
- **Consistent Donor**: 10+ donations
- **Hero Donor**: 50+ donations
- **Rare Blood Defender**: 5 donations of O- or AB+
- Auto-awarded on donation completion
- Display on dashboard with unlock criteria for locked badges

### 6. Donation Certificates ✅
- PDF certificate generated after each donation
- Contains: Donor name, blood type, date, amount, hospital name
- Downloadable from "My Certificates" section
- Official BloodLink formatting

### 7. Points & Leaderboard ✅
- Base donation: 100 points
- Emergency bonus: +200 points
- Quick response: +100 points
- Milestone bonuses: +50 every 10 donations
- Real-time leaderboard updates
- Donor ranking on dashboard

---

## 🏗️ System Architecture

```
Hospital Creates Emergency
    ↓
Express Server matches eligible donors (blood type + location within 30km)
    ↓
Socket.io emits 'emergencyAlert' event in real-time
Email sent via Nodemailer
    ↓
Donor receives notification:
  - Red alert banner appears
  - 800Hz emergency sound plays
  - Mapbox updates with emergency location
  - Browser requests geolocation permission
    ↓
Donor's location captured via navigator.geolocation
    ↓
Location POSTed to /api/donor/update-location
    ↓
Mapbox refreshes to show donor location (blue marker)
    ↓
Donor clicks red marker → Popup opens
Donor clicks "Respond to Emergency" button
    ↓
Backend records response, notifies hospital
    ↓
Hospital sees responder in dashboard
Hospital marks donation as complete
    ↓
System:
  - Creates DonationHistory record
  - Awards badge (Life Saver, Quick Response, etc.)
  - Calculates points (100 + 200 + 100 = 400+)
  - Generates PDF certificate
  - Updates leaderboard
  - Creates thank-you notification
    ↓
Donor sees:
  - New badge in "My Achievements"
  - Points increased on leaderboard
  - Certificate available in "My Certificates"
  - Thank you notification with email
```

---

## 🔧 Technology Stack

**Backend**:
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io v4.6.1 (real-time)
- Nodemailer (email)
- JWT (authentication)
- bcryptjs (password hashing)

**Frontend**:
- EJS templates
- Vanilla JavaScript (no jQuery)
- Socket.io client
- Mapbox GL JS v2.15.0
- Browser Geolocation API
- Web Audio API (for sound)

**External Services**:
- Mapbox (location visualization) - `pk.eyJ...` token required
- Gmail SMTP (email notifications) - App password required
- MongoDB Atlas (cloud database) - Connection string required

---

## ✨ What's New in This Release

### Real-Time Socket.io System
```javascript
// Emergency created → Socket event emitted to all eligible donors
socket.on('emergencyAlert', (data) => {
  // Donor receives: {emergencyId, hospitalName, bloodGroup, ...}
  // UI automatically: shows banner, plays sound, updates map
});
```

### Mapbox Emergency Visualization
```javascript
// Donor dashboard shows live emergency map
- Blue marker: Your current location
- Red pulsing marker: Emergency hospital location
- Click marker → See full emergency details
- Click button → One-click respond (no form to fill)
```

### Auto Geolocation Capture
```javascript
// On dashboard load, automatically:
navigator.geolocation.getCurrentPosition(position => {
  POST /api/donor/update-location with {latitude, longitude}
  // Then Mapbox refreshes to show your position
});
```

### Emergency Email Template
Professional HTML email containing:
- Hospital name & logo
- Blood type needed (large, red)
- Units required
- Patient condition
- Time limit (highlighted in red)
- Hospital contact phone (clickable tel: link)
- Direct "RESPOND TO EMERGENCY" button linking to dashboard

### Badge Auto-Awarding
```javascript
// After hospital completes donation:
await DonorBadge.checkAndAwardBadges(donorId, {
  donationCount: N,
  isEmergency: true,
  responseTime: milliseconds
});
// System checks criteria and creates badge record
// Notification sent to donor
// Dashboard updates in real-time
```

---

## 📝 Complete API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/emergency/create | Hospital | Create emergency request |
| GET | /api/emergency/active | Public | Get all active emergencies |
| GET | /api/emergency/:id | Public | Get emergency details |
| POST | /api/emergency/:id/respond | Donor | Donor responds to emergency |
| PUT | /api/emergency/:id/complete-donation | Hospital | Complete donation, award badges |
| POST | /api/donor/update-location | Donor | Update donor location coordinates |
| GET | /api/mapbox-token | Public | Get Mapbox access token |

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md#api-endpoints-summary) for complete endpoint list.

---

## 🔐 Environment Setup

Create `.env` file in project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bloodlink

# JWT Secret (32+ random characters)
JWT_SECRET=<your-secure-random-jwt-secret-min-32-chars>

# Mapbox (get from mapbox.com dashboard)
MAPBOX_ACCESS_TOKEN=<your-mapbox-access-token>

# Gmail SMTP (use app-specific password, not regular password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASS=<your-gmail-app-password>

# Application
CLIENT_URL=http://localhost:5000
NODE_ENV=development
PORT=5000
```

⚠️ **Important**: Gmail requires **app-specific password** (not regular password). Enable 2FA first.

---

## 📊 Testing & Verification

### Quick 5-Minute Test
1. `npm start` → Verify "Server running on port 5000"
2. Create hospital account
3. Create donor account
4. Hospital creates emergency
5. Donor sees alert banner + sound immediately
6. Donor can see map with emergency location

### Full 30-Minute Test
1. Complete quick test above
2. Donor responds via map
3. Hospital marks donation complete
4. Verify badge appears in donor dashboard
5. Verify email received in Gmail
6. Verify certificate generated
7. Verify points on leaderboard

See [TEST_SCENARIO.md](TEST_SCENARIO.md) for detailed testing workflows.

---

## 🐛 Troubleshooting

**Socket.io alerts not received?**
→ Check [QUICK_REFERENCE.md#scenario-emergency-created-but-donor-doesnt-get-alert](QUICK_REFERENCE.md)

**Mapbox not showing?**
→ Check [QUICK_REFERENCE.md#scenario-mapbox-not-showing](QUICK_REFERENCE.md)

**Geolocation not updating?**
→ Check [QUICK_REFERENCE.md#scenario-geolocation-not-working](QUICK_REFERENCE.md)

**Emails not sending?**
→ Check [QUICK_REFERENCE.md#scenario-email-not-sending](QUICK_REFERENCE.md)

**Badge not awarded?**
→ Check [QUICK_REFERENCE.md#scenario-badge-not-awarded](QUICK_REFERENCE.md)

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md#step-5-troubleshooting) for complete troubleshooting guide.

---

## 📋 File Structure

```
src/
├── server.js                          # Main server + Socket.io setup
├── controllers/
│   ├── emergencyController.js         # Emergency logic + socket.io emit
│   ├── donorController.js             # Donor management + location update
│   └── ...
├── routes/
│   ├── emergencyRoutes.js             # Emergency API endpoints
│   ├── donorRoutes.js                 # Donor endpoints (location update)
│   └── ...
├── models/
│   ├── BloodRequest.js                # Emergency data model
│   ├── DonorBadge.js                  # Badge system with auto-award
│   ├── User.js                        # User model (stores location)
│   └── ...
├── utils/
│   └── emailService.js                # Email templates + sender

public/js/
├── donor-dashboard.js                 # Socket.io + geolocation integration
├── mapbox-emergency.js                # Complete Mapbox implementation
└── hospital-dashboard.js              # Emergency form handler

views/
├── donor-dashboard.ejs                # Mapbox CSS/JS + map container
└── hospital-dashboard.ejs             # Emergency request form
```

---

## 🚀 Deployment

### Before Deploying
- [ ] SMTP configured for production email
- [ ] MONGODB_URI points to production database
- [ ] CLIENT_URL set to production domain  
- [ ] NODE_ENV=production
- [ ] SSL certificate installed
- [ ] Database backups configured

### Deploy Commands
```bash
# Heroku
heroku create your-app-name
heroku config:set MONGODB_URI=...
git push heroku main

# DigitalOcean/AWS/Azure
npm install
npm start
# Configure reverse proxy (nginx)
```

---

## ✅ Feature Completion Status

| Feature | Status | Details |
|---------|--------|---------|
| Emergency creation | ✅ Complete | Hospital form + API endpoint working |
| Socket.io notifications | ✅ Complete | Real-time alerts to eligible donors |
| Email alerts | ✅ Complete | Professional HTML template + SMTP sending |
| Sound notification | ✅ Complete | 800Hz emergency beep via Web Audio API |
| Mapbox visualization | ✅ Complete | Live map with markers, popups, auto-zoom |
| Geolocation capture | ✅ Complete | Browser location auto-captured on load |
| Location update API | ✅ Complete | POST /api/donor/update-location working |
| Badge system | ✅ Complete | Auto-awarded on donation completion |
| Points system | ✅ Complete | Calculated and displayed on leaderboard |
| Certificates | ✅ Complete | PDF generated and downloadable |
| Hospital dashboard | ✅ Complete | Emergency creation and management |
| Donor dashboard | ✅ Complete | Emergency requests + map + achievements |
| No dummy buttons | ✅ Complete | All features functional, no placeholders |

---

## 🎯 Success Metrics

✅ System is working correctly when:
1. Emergency created → Takes 2 seconds
2. Donor notified → Within 1 second via socket.io
3. Sound plays → Immediately on notification
4. Map updates → Within 2 seconds
5. Geolocation captured → Within 5 seconds
6. Donor responds → Instant confirmation
7. Badge awarded → Automatic on completion
8. Email received → Within 30 seconds
9. Certificate generated → Automatic on completion
10. No console errors → Clean JavaScript execution

---

## 📞 Support & Documentation

**Documentation Files** (all included):
1. [STARTUP_GUIDE.md](STARTUP_GUIDE.md) - Setup instructions (read first)
2. [TEST_SCENARIO.md](TEST_SCENARIO.md) - Testing guide
3. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - API reference & debugging
4. [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Technical architecture

**Quick Links**:
- Setup: See [STARTUP_GUIDE.md](STARTUP_GUIDE.md)
- Testing: See [TEST_SCENARIO.md](TEST_SCENARIO.md)
- Debugging: See [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- Architecture: See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

---

## 🎉 Summary

**BloodLink is a complete, production-ready emergency blood donation system featuring**:

✅ Real-time socket.io notifications  
✅ Mapbox location visualization  
✅ Auto geolocation capture  
✅ Email alerts  
✅ Sound notifications  
✅ Badge system with auto-award  
✅ Donation certificates  
✅ Points leaderboard  
✅ Hospital & donor dashboards  
✅ Zero dummy buttons or placeholders  
✅ Comprehensive documentation  

**Status**: READY FOR TESTING & DEPLOYMENT

👉 **GET STARTED**: Follow [STARTUP_GUIDE.md](STARTUP_GUIDE.md) step-by-step
- **Authentication**: JWT
- **Email**: Nodemailer
- **Maps**: Geocoding API

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bloodlink
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   mongod
   ```

5. **Run the server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Hospital Routes
- `GET /api/hospital/profile` - Get hospital profile
- `PUT /api/hospital/profile` - Update hospital profile
- `POST /api/hospital/requests` - Create blood request
- `GET /api/hospital/requests` - Get all requests
- `GET /api/hospital/requests/:id` - Get single request
- `PUT /api/hospital/requests/:id` - Update request
- `PUT /api/hospital/requests/:id/close` - Close request
- `PUT /api/hospital/blood-stock` - Update blood stock
- `GET /api/hospital/search-donors` - Search donors

### Donor Routes
- `GET /api/donor/profile` - Get donor profile
- `PUT /api/donor/profile` - Update donor profile
- `GET /api/donor/nearby-requests` - Get nearby requests
- `POST /api/donor/requests/:id/interest` - Show interest
- `GET /api/donor/eligibility` - Check eligibility
- `POST /api/donor/donation` - Record donation
- `GET /api/donor/donation-history` - Get donation history

### Public Routes
- `GET /api/public/requests` - Get all active requests
- `GET /api/public/requests/:id` - Get single request
- `GET /api/public/search` - Search requests
- `GET /api/public/blood-availability` - Get blood availability

## Database Schema

### User
- fullName, email, phone, password
- userType (donor/hospital/public)
- Location with GPS coordinates
- Verification status

### Donor
- Blood group
- Donation history
- Trust score and ratings
- Eligibility status
- Notification preferences

### Hospital
- Hospital name and registration details
- Blood bank stock levels
- License and verification documents
- Contact information

### BloodRequest
- Blood group and units needed
- Patient information
- Request status and urgency
- Location and timeline
- Interested donors list

### DonationHistory
- Donor and hospital references
- Blood group and units collected
- Health check data
- Completion status

### Notification
- Type and content
- Related entities
- Delivery channels and status
- Read status

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/bloodlink
JWT_SECRET=<your-secure-jwt-secret>
JWT_EXPIRE=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASS=<your-gmail-app-password>
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
CLIENT_URL=http://localhost:5000
```

## Project Structure

```
bloodlink/
├── src/
│   ├── server.js                 # Main server file
│   ├── models/                   # MongoDB schemas
│   ├── controllers/              # Request handlers
│   ├── routes/                   # API routes
│   ├── middleware/               # Custom middleware
│   └── utils/                    # Helper functions
├── views/                        # EJS templates
├── public/
│   ├── css/                      # Stylesheets
│   ├── js/                       # Client-side scripts
│   └── images/                   # Images
├── config/
│   ├── database.js              # Database connection
│   └── constants.js             # App constants
├── .env                         # Environment variables
├── .gitignore                   # Git ignore file
└── package.json                 # Dependencies

```

## Next Steps

- [ ] Create registration/login frontend
- [ ] Build hospital dashboard UI
- [ ] Build donor dashboard UI
- [ ] Create blood request listing page
- [ ] Implement donor search and filtering
- [ ] Add file upload for documents
- [ ] Integrate Google Maps API
- [ ] Add SMS/WhatsApp notifications
- [ ] Implement chat/messaging system
- [ ] Add user reviews and ratings
- [ ] Create admin dashboard
- [ ] Add advanced filtering and sorting
- [ ] Implement donation reminders
- [ ] Add analytics and reporting
- [ ] Deploy to production

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

---

## 🛡️ Admin Dashboard

### Setup Admin User

1. **Create Admin Account** (First time setup):
```bash
node scripts/createAdminUser.js
```

This creates an admin account with:
- Email: `admin@bloodlink.com`
- Password: `<set-during-creation>`

⚠️ **IMPORTANT**: Use a strong password and keep it secure!

2. **Access Admin Dashboard**:
   - Navigate to `http://localhost:3000/admin/dashboard`
   - Login with admin credentials
   - Full administrative access

### Admin Features

- **Platform Monitoring**: View system health, active emergencies, response rates
- **Hospital Management**: Verify/reject hospital registrations
- **User Management**: Manage users, suspend/ban accounts, view analytics
- **Statistics**: Emergency analytics, donor statistics, hospital performance
- **System Logs**: Track all platform activities
- **Professional UI**: 3D visualizations, real-time charts, responsive design

---

This project is open source and available under the ISC License.

## Support

For support, email support@bloodlink.com or open an issue in the GitHub repository.

---

**Made with ❤️ to save lives**
