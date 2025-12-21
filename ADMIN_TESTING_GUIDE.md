# Admin Dashboard Testing Guide

## Setup Steps

### 1. Start the Server
```bash
npm start
```

The server should start on `http://localhost:5000`

### 2. Create Admin User
In a new terminal window:
```bash
npm run create-admin
```

This creates an admin account with:
- **Email**: admin@bloodlink.com
- **Password**: Admin@123

### 3. Access Admin Dashboard
1. Go to `http://localhost:5000/`
2. Click "Admin Login" or navigate to `/auth/login`
3. Enter admin credentials:
   - Email: admin@bloodlink.com
   - Password: Admin@123
4. You'll be redirected to `http://localhost:5000/admin/dashboard`

---

## Feature Testing Checklist

### Dashboard Page ✓
- [ ] **System Health Card** - Shows percentage (should be 100% for healthy system)
- [ ] **Active Emergencies Card** - Shows current emergency count
- [ ] **Response Rate Card** - Shows success rate percentage
- [ ] **Donors Online Card** - Shows available donors count
- [ ] **Key Metrics Section**:
  - [ ] Total Users count
  - [ ] Total Donors breakdown
  - [ ] Total Hospitals breakdown
  - [ ] Today's Activity (donations and emergencies)
  - [ ] Avg Response Time in minutes
- [ ] **3D Blood Type Visualization** - Interactive 3D bars showing blood type distribution
- [ ] **Emergency Level Chart** - Doughnut chart showing emergency levels
- [ ] **Blood Type Demand Chart** - Bar chart showing blood type demand
- [ ] **Recent Emergencies List** - Shows latest 5 active emergencies

### Hospital Management Page ✓
- [ ] **Hospital Table Displays**:
  - [ ] Hospital name
  - [ ] Contact email
  - [ ] Contact phone
  - [ ] Verification status badge (Verified/Pending/Rejected)
  - [ ] Registration date
- [ ] **Search Functionality** - Search by hospital name works
- [ ] **Status Filter** - Can filter by All/Verified/Pending/Rejected
- [ ] **Verify Hospital**:
  - [ ] Click "Verify" on pending hospital
  - [ ] Modal opens with hospital details
  - [ ] Click "Verify Hospital" button
  - [ ] Status updates to "Verified"
  - [ ] Hospital notification sent
- [ ] **Reject Hospital**:
  - [ ] Click "Reject" on pending hospital
  - [ ] Enter rejection reason in prompt
  - [ ] Status updates appropriately
  - [ ] Rejection notification sent to hospital user

### User Management Page ✓
- [ ] **Users Table Displays**:
  - [ ] Full name
  - [ ] Email address
  - [ ] User type (Donor/Hospital)
  - [ ] Account status badge (Active/Suspended/Banned)
  - [ ] Join date
  - [ ] Manage button
- [ ] **Search Functionality** - Search by name works
- [ ] **Type Filter** - Filter by Donor/Hospital
- [ ] **Status Filter** - Filter by Active/Suspended/Banned
- [ ] **Update User Status**:
  - [ ] Click "Manage" button
  - [ ] Modal opens
  - [ ] Select status from dropdown
  - [ ] Enter reason (if applicable)
  - [ ] Click "Update Status"
  - [ ] Status updates successfully
  - [ ] User receives notification
- [ ] **Delete User**:
  - [ ] Click "Manage" button
  - [ ] Confirm deletion
  - [ ] User is removed from table
  - [ ] All related records deleted

### Statistics Page ✓
- [ ] **Emergency Statistics Tab**:
  - [ ] Total Emergencies count
  - [ ] Active Emergencies count
  - [ ] Success Rate percentage
  - [ ] Avg Response Time
  - [ ] Urgency Level pie chart renders
  - [ ] Most Requested Blood Types bar chart renders
- [ ] **Donor Statistics Tab**:
  - [ ] Total Donors count
  - [ ] Active Donors count
  - [ ] Average Donations per donor
  - [ ] Total Donations across platform
  - [ ] Top 10 Donors list shows:
    - [ ] Donor rank
    - [ ] Donor name
    - [ ] Blood group and email
    - [ ] Total donation count
- [ ] **Hospital Statistics Tab**:
  - [ ] Total Hospitals count
  - [ ] Verified Hospitals count
  - [ ] Verification Rate percentage
  - [ ] Top 10 Hospitals by requests shows:
    - [ ] Hospital rank
    - [ ] Hospital name and city
    - [ ] Number of requests
    - [ ] Success rate percentage

### System Logs Page ✓
- [ ] **Logs Table Displays**:
  - [ ] Timestamp of each activity
  - [ ] Activity type
  - [ ] User who performed action
  - [ ] Activity message/description
  - [ ] Status badge
- [ ] **Search Functionality** - Search logs by message
- [ ] **Type Filter** - Filter by activity type
- [ ] **Pagination** - Loads 50 most recent logs

### Navigation & UI ✓
- [ ] **Sidebar Navigation** - All 6 items clickable and functional
- [ ] **Page Title** - Updates correctly for each page
- [ ] **Last Update Time** - Shows on dashboard
- [ ] **Logout Button** - Clears session and redirects to login
- [ ] **Responsive Design** - Works on desktop, tablet, mobile
- [ ] **Notifications** - Success/error messages appear correctly
- [ ] **Modal Close** - Clicking X or "Close" button closes modals

### Data Accuracy ✓
- [ ] **Dashboard Metrics** - Match actual data in database
- [ ] **Hospital Counts** - Match total hospitals created
- [ ] **User Statistics** - Match actual donors and hospitals
- [ ] **Emergency Data** - Shows real emergency requests
- [ ] **Charts** - Display correct data from backend

---

## Test Scenarios

### Scenario 1: Complete Hospital Verification Workflow
1. Create a hospital account (register as hospital if not exists)
2. Go to Hospital Management page
3. Find unverified hospital in table
4. Click "Verify" button
5. Modal should show hospital details
6. Click "Verify Hospital" button
7. Hospital status should change to "Verified"
8. Success notification should appear

**Expected Result**: Hospital marked as verified, hospital user receives notification

### Scenario 2: User Management & Status Change
1. Go to User Management page
2. Find any active user
3. Click "Manage" button
4. Select "Suspend" from status dropdown
5. Enter reason: "Violation of terms"
6. Click "Update Status"
7. User status should change to "Suspended"
8. User should receive notification

**Expected Result**: User account suspended, record updated, user notified

### Scenario 3: Statistics & Analytics Verification
1. Go to Statistics page
2. Check Emergency Statistics tab:
   - Verify total emergencies >= active emergencies
   - Success rate is between 0-100%
   - Response time > 0
3. Click Donor Statistics tab:
   - Total donors >= active donors
   - Avg donations is reasonable
4. Click Hospital Statistics tab:
   - Verification rate is calculated correctly

**Expected Result**: All statistics display correctly with valid data

### Scenario 4: Search & Filter Operations
1. Go to Hospital Management
2. Type a hospital name in search (e.g., "City Hospital")
3. Table filters to show only matching hospitals
4. Clear search
5. Select "Verified" from status filter
6. Table shows only verified hospitals
7. Select "Pending" from filter
8. Table shows only pending hospitals

**Expected Result**: All search and filter operations work correctly

### Scenario 5: Chart Visualizations
1. Go to Dashboard
2. 3D visualization should render with rotating blood type bars
3. Emergency Level chart should show colored segments
4. Blood Type Demand chart should show bars with different colors
5. On Statistics page:
   - Urgency Level pie chart should render
   - Most Requested blood types chart should display

**Expected Result**: All charts and 3D visualizations render without errors

---

## Troubleshooting

### Admin Dashboard Won't Load
```
Error: Ensure token is properly set in localStorage
Solution: Clear browser storage, login again
```

### Charts Not Rendering
```
Error: Chart.js not loaded
Solution: Check browser console for errors, ensure script tags in admin-dashboard.ejs
```

### 3D Visualization Not Showing
```
Error: Three.js library not loaded
Solution: Check if Three.js CDN is accessible, verify admin-dashboard.js loads without errors
```

### Verification/Update Failing
```
Error: "Admin access required"
Solution: Ensure user is logged in as admin (userType='admin'), check JWT token validity
```

### Database Connection Issues
```
Error: "Cannot connect to MongoDB"
Solution: Ensure MongoDB is running, check MONGODB_URI in .env
```

---

## Performance Checks

- [ ] Dashboard loads in < 2 seconds
- [ ] Hospital Management table renders with < 100 hospitals in < 1 second
- [ ] User Management handles 1000+ users with pagination
- [ ] Statistics page loads all data within 2 seconds
- [ ] No console errors or warnings
- [ ] API responses are received (check Network tab in DevTools)

---

## Security Checks

- [ ] Non-admin users cannot access /admin/dashboard
- [ ] API requests include valid JWT token
- [ ] Sensitive data (passwords) not exposed in responses
- [ ] CORS headers properly configured
- [ ] No sensitive information logged in console
- [ ] Session expires after logout

---

## Completion Checklist

After testing, confirm:

- [ ] All dashboard metrics load and display correctly
- [ ] Hospital verification workflow completes successfully
- [ ] User management features (update status, delete) work
- [ ] Statistics pages show accurate data with working charts
- [ ] Search and filter functionality works on all pages
- [ ] Modals open/close smoothly
- [ ] No dummy data or placeholder buttons
- [ ] All features fully functional with real data
- [ ] Professional UI renders correctly
- [ ] 3D visualization runs smoothly
- [ ] Responsive design works on all screen sizes
- [ ] Error handling and notifications work properly

**Status**: Once all checks pass, Admin Dashboard is ready for production! ✅
