# BloodLink - Complete Feature Test Scenarios

## Project Overview
BloodLink is a blood donation management system with three major features:
1. **Emergency Blood Request System** - For hospitals to request blood in life-threatening situations
2. **Donation Certificates** - Automatically generated after donations
3. **Donor Badges & Gamification** - Badges and points awarded for donations

---

## Feature 1: Emergency Blood Request System (COMPLETE)

### Architecture Components
- **Backend**: Express.js server with MongoDB
- **Real-time Communication**: Socket.io for instant donor notifications
- **Location Services**: Browser Geolocation API + Mapbox GL JS for visualization
- **Email Notifications**: Nodemailer with Gmail SMTP
- **Database**: Stores emergency requests and donor responses

### Workflow End-to-End Test

#### Step 1: Hospital Creates Emergency Request
1. Hospital logs in and navigates to "Emergency Request" tab
2. Form requires:
   - Emergency Level: Urgent/Critical/Life Threatening
   - Blood Group: Select from dropdown (O+, O-, A+, A-, B+, B-, AB+, AB-)
   - Units Needed: 1-10 units
   - Patient Name & Age
   - Patient Condition: Accident/Surgery/Childbirth/Trauma/Cancer/Other
   - Contact Phone & Email
3. Hospital submits form
4. **Expected Outcome**:
   - Emergency request created in MongoDB (BloodRequest collection)
   - API response: Status 200 with emergencyId

#### Step 2: System Matches and Notifies Eligible Donors
**Endpoint**: `POST /api/emergency/create`
**Process**:
1. Find all donors with matching blood type
2. Filter by location (within 30km radius using geospatial query)
3. Check last donation date (must be >90 days for repeat donors)
4. Create Notification records in database
5. **Send Real-Time Socket.io Alert**:
   - Emit 'emergencyAlert' event to each eligible donor's socket room
   - Payload includes: emergencyId, hospitalName, bloodGroup, unitsNeeded, patientCondition, emergencyLevel, requiredWithin, contact, timestamp

6. **Send Email Notification**:
   - Template: emergencyRequestNotification (from emailService.js)
   - Includes: Hospital name, blood type, units, patient condition, time limit, contact phone
   - Direct response link to dashboard

#### Step 3: Donor Receives Notification
1. Donor is logged into Donor Dashboard
2. **Socket.io listener ('emergencyAlert')** triggers:
   - **Visual Alert**: Red emergency banner appears at top of page
   - **Audio Alert**: 800Hz beep plays via Web Audio API
   - **Count Badge**: Emergency count increases
   - **Map Update**: Mapbox emergency map updates with new marker
   - **Banner Action**: "View Emergency" button appears

3. **Automatic Geolocation Update**:
   - Browser requests geolocation from donor (asking for permission)
   - If granted: POST to `/api/donor/update-location` with latitude/longitude
   - Coordinates stored in User.location.coordinates [longitude, latitude]
   - Mapbox map refreshes to show donor's position

4. **Email Received**:
   - Professional HTML email with emergency details
   - Direct action link to dashboard

#### Step 4: Donor Views and Responds to Emergency
1. Donor clicks "View Emergency" or goes to Emergency Requests section
2. Mapbox map displays:
   - Blue marker for donor's location
   - Pulsing red marker for emergency location
   - Popup shows hospital name, blood type, units needed
   - "Respond to Emergency" button in popup
3. Donor clicks "Respond to Emergency"
4. **Expected Outcome**:
   - Donor is marked as responding to emergency
   - Hospital sees responder in their emergency dashboard
   - Notification created: "You accepted emergency at [Hospital]"

#### Step 5: Hospital Confirms Arrival and Donation
1. Hospital logs in to dashboard
2. Sees responding donors in Emergency Request details
3. When donor arrives: Hospital clicks "Mark as Arrived"
4. When donation complete: Hospital clicks "Complete Donation"
5. **System Actions**:
   - Mark emergency response as completed
   - Award Donor Badge (if criteria met):
     * "Life Saver" badge: Complete first emergency donation
     * "Quick Response" badge: Respond within 15 minutes of alert
     * Other badges based on donation count
   - Award Points: 100 (base) + 200 (emergency bonus) + 100 (quick response) = 400+ points
   - Create DonationHistory record
   - Generate Donation Certificate (PDF)
   - Create Notification: "Thank you for saving lives!"

#### Step 6: Donor Receives Certificate and Views Achievements
1. Certificate auto-downloaded or available in "My Certificates" section
2. New badge appears in "My Achievements" section
3. Points updated on leaderboard
4. Notification sent: "You earned 'Life Saver' badge!"

---

## Feature 2: Donation Certificates

### Components
- **Model**: Certificate.js stores certificate metadata
- **Storage**: PDF generated and stored/served
- **Generator**: pdfkit or similar PDF library
- **Routes**: GET /api/donor/certificates

### Test Scenario
1. Complete an emergency donation (see Feature 1, Step 5)
2. Certificate should be automatically generated
3. Navigate to "My Certificates" tab in donor dashboard
4. Certificate displays:
   - Hospital name
   - Blood type donated
   - Date of donation
   - Amount collected
   - Donor name
   - Official BloodLink seal/logo
5. Download button generates PDF file with naming format: `Certificate_BloodType_Date.pdf`

**Expected Files**: Should be in [models/Certificate.js](models/Certificate.js)

---

## Feature 3: Donor Badges & Gamification

### Badge Types
- **Life Saver**: First emergency donation completed
- **Quick Response**: Responded to emergency within 15 minutes
- **Consistent Donor**: 10 successful donations
- **Hero Donor**: 50 successful donations
- **Rare Blood Defender**: Complete 5 donations of O- or AB+ blood type

### Points System
- Base donation: 100 points
- Emergency bonus: +200 points
- Quick response bonus: +100 points
- First donation: +50 points
- Milestone bonuses: Every 10 donations +50 points

### Test Scenario
1. Complete emergency donation
2. Check "My Achievements" tab
3. Badge should appear immediately
4. Points updated on leaderboard
5. Badge shows:
   - Icon/image
   - Name
   - Description
   - Date earned
   - Unlock criteria (for locked badges)

**Files**: [models/DonorBadge.js](models/DonorBadge.js), checkAndAwardBadges() in emergencyController.js

---

## Critical Endpoints to Verify

### 1. Emergency Creation
```
POST /api/emergency/create
Headers: Authorization: Bearer {token}
Body: {
  hospitalId, bloodGroup, unitsNeeded, patientName, patientAge,
  patientCondition, conditionDetails, emergencyLevel,
  requiredWithin, emergencyContact: {name, phone, email}
}
Response: {success: true, emergency: {...}, notifiedCount: N}
```

### 2. Get Active Emergencies
```
GET /api/emergency/active
No auth required (public endpoint)
Response: [{_id, hospitalName, bloodGroup, unitsNeeded, ...}]
```

### 3. Update Donor Location
```
POST /api/donor/update-location
Headers: Authorization: Bearer {token}
Body: {latitude, longitude}
Response: {success: true, coordinates: [lon, lat]}
```

### 4. Get Mapbox Token
```
GET /api/mapbox-token
No auth required
Response: {token: "pk.eyJ..."}
```

### 5. Respond to Emergency
```
POST /api/emergency/:emergencyId/respond
Headers: Authorization: Bearer {token}
Response: {success: true, message: "Response recorded"}
```

### 6. Complete Emergency Donation
```
PUT /api/emergency/:emergencyId/complete-donation
Headers: Authorization: Bearer {token}
Body: {donorId, donated: true, units: N}
Response: {success: true, badgesAwarded: [...], certificateId: "..."}
```

---

## Socket.io Events

### Server → Client (Donor)
1. **emergencyAlert**: When new emergency is created
   ```
   {
     emergencyId, hospitalName, bloodGroup, unitsNeeded,
     patientCondition, emergencyLevel, requiredWithin,
     contact, timestamp
   }
   ```

2. **requestMatched**: When hospital marks responder as arrived
   ```
   {emergencyId, message: "..."}
   ```

3. **notificationUpdate**: When notification state changes
   ```
   {count: N}
   ```

### Client → Server (Donor)
1. **join**: When donor logs in
   ```
   {donorUserId: "..."}
   ```

2. **disconnect**: When donor logs out or closes dashboard

---

## Testing Checklist

### Setup & Configuration
- [ ] `.env` file contains valid:
  - [ ] MONGODB_URI (MongoDB connection)
  - [ ] JWT_SECRET (token signing)
  - [ ] MAPBOX_ACCESS_TOKEN (pk.eyJ...)
  - [ ] SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (Gmail)
  - [ ] CLIENT_URL (frontend URL for email links)

- [ ] Package.json has required packages:
  - [ ] socket.io v4.6.1+
  - [ ] mongoose (MongoDB)
  - [ ] nodemailer (email)
  - [ ] jsonwebtoken (JWT)
  - [ ] bcryptjs (password hashing)

### Emergency Feature Tests
- [ ] Hospital can create emergency request
- [ ] Eligible donors receive socket.io notification instantly
- [ ] Donor hears emergency sound alert
- [ ] Donor's location automatically captured (if permission granted)
- [ ] Mapbox shows donor and emergency locations
- [ ] Donor can respond to emergency
- [ ] Hospital sees responding donor
- [ ] Hospital can mark donation as complete
- [ ] System awards badge to donor
- [ ] System awards points to donor
- [ ] Email notifications sent (verify Gmail inbox)
- [ ] Donor receives certificate PDF

### Badge System Tests
- [ ] First emergency donation awards "Life Saver" badge
- [ ] Quick response (within 15 min) awards bonus
- [ ] Points calculated correctly
- [ ] Leaderboard updates in real-time
- [ ] Badges display in My Achievements

### Certificate Tests
- [ ] Certificate generated after donation
- [ ] PDF downloads successfully
- [ ] Certificate contains correct information
- [ ] Multiple certificates can be downloaded

### Error Handling Tests
- [ ] If geolocation denied: Show fallback message, allow donation anyway
- [ ] If email fails: Still complete donation, don't block flow
- [ ] If socket.io disconnects: Reconnect automatically
- [ ] If hospital cancels emergency: Notify all responders

### Performance Tests
- [ ] System can handle 10+ simultaneous emergencies
- [ ] Mapbox loads without lag even with 20+ markers
- [ ] Donor notifications received within 1 second

---

## Browser Console Debugging

Open DevTools (F12) and check:

1. **Socket.io Status**:
   ```javascript
   console.log(socket); // Should show Socket instance
   console.log(socket.connected); // Should be true
   ```

2. **Mapbox Initialization**:
   ```javascript
   console.log(mapboxgl); // Should show Mapbox library
   console.log(window.emergencyMapFunctions); // Should show map functions
   ```

3. **Geolocation**:
   ```javascript
   navigator.geolocation.getCurrentPosition(
     pos => console.log(pos.coords)
   );
   ```

4. **Emergency Count**:
   ```javascript
   // Check network tab for /api/emergency/active request
   // Should return array of active emergencies
   ```

5. **Socket Events**:
   ```javascript
   socket.on('emergencyAlert', (data) => console.log('EMERGENCY:', data));
   ```

---

## Common Issues & Solutions

### Issue: Donors not receiving notifications
**Causes**:
- Socket.io not connected (check WebSocket in Network tab)
- global.io not accessible in controller
- Donor not in correct room

**Solution**:
- Verify `global.io = io;` in server.js line ~95
- Check socket.emit('join', {donorUserId}) called in loadDonorData()
- Check browser console for socket connection status

### Issue: Geolocation not updating
**Causes**:
- User denied geolocation permission
- Browser doesn't support geolocation
- /api/donor/update-location endpoint not found

**Solution**:
- Check browser permissions (click lock icon in address bar)
- Verify route exists: router.post('/update-location', ...)
- Check Network tab for POST request success (200 status)

### Issue: Mapbox not showing
**Causes**:
- Mapbox CSS/JS not loaded
- Mapbox token invalid
- Container div missing or wrong ID

**Solution**:
- Verify Mapbox links in donor-dashboard.ejs head section
- Check token in /api/mapbox-token response
- Check for div id="emergencyMap" in HTML

### Issue: Badges not awarded
**Causes**:
- DonorBadge model not properly imported
- checkAndAwardBadges() not called
- Database connection issue

**Solution**:
- Check emergencyController.js imports
- Verify completeEmergencyDonation calls checkAndAwardBadges()
- Check MongoDB connection in Network tab

### Issue: Emails not sending
**Causes**:
- SMTP credentials invalid
- sendEmail() function not imported
- Email template missing

**Solution**:
- Test SMTP in .env with: `npm run test-email`
- Verify sendEmail imported from emailService
- Check emailTemplates object in emailService.js

---

## Success Criteria

✅ **All features are working correctly when**:
1. Hospital creates emergency → Donors instantly notified via socket.io with sound
2. Donor's location auto-captured → Mapbox shows both positions
3. Donor responds → Hospital sees response immediately
4. Donation completed → Badge + Points + Certificate awarded instantly
5. Email sent → Donor receives email within 30 seconds
6. No console errors → All JavaScript executes cleanly
7. All API endpoints return 200 status → No 404 or 500 errors
8. Leaderboard updates → Points visible immediately
9. Multiple emergencies handled → System doesn't crash with multiple simultaneous requests
10. Mobile responsive → Works on phone screens (geolocation, map, form)

---

## Files Modified/Created in This Session

**New Files**:
- `public/js/mapbox-emergency.js` - Mapbox integration (600+ lines)

**Modified Files**:
- `src/server.js` - Added global.io, /api/mapbox-token endpoint
- `src/controllers/emergencyController.js` - Added socket.io emit in notifyAllEligibleDonors()
- `src/controllers/donorController.js` - Added updateLocation() function
- `src/routes/donorRoutes.js` - Added /update-location route
- `public/js/donor-dashboard.js` - Added socket.io, geolocation, map integration (200+ lines)
- `views/donor-dashboard.ejs` - Added Mapbox CSS/JS, map container, script tag
- `src/utils/emailService.js` - Added emergencyRequestNotification template

**Already Implemented** (no changes needed):
- Emergency models (BloodRequest, Notification)
- Emergency routes and controllers
- Badge awarding logic
- Certificate generation logic
- Email sending infrastructure

---

## Next Steps for User

1. **Verify Configuration**:
   - Check .env has all required variables
   - Test MongoDB connection
   - Test SMTP credentials

2. **Start Backend**:
   ```bash
   npm start
   ```
   Should see: "Server running on port 5000" and "MongoDB connected"

3. **Test Complete Workflow**:
   - Create hospital account
   - Create donor account
   - Hospital creates emergency
   - Donor should receive socket notification + sound
   - Verify Mapbox shows locations
   - Donor responds
   - Hospital completes donation
   - Verify badge awarded and certificate generated

4. **Check Email Delivery**:
   - Look in Gmail sent folder to confirm emails are being sent
   - Check spam folder if not in inbox
   - Verify email template looks correct

5. **Monitor Logs**:
   - Watch console for any errors
   - Check Network tab for failed API calls
   - Check browser console for JavaScript errors

---

**Status**: ✅ All major features implemented. Ready for end-to-end testing.
**Last Updated**: Session with comprehensive real-time notification and location integration
