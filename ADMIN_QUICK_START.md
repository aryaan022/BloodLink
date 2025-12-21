# Admin Dashboard - Quick Start Guide

## ⚡ 30-Second Setup

### 1. Create Admin User
```bash
npm run create-admin
```

### 2. Start Server
```bash
npm start
```

### 3. Login
- URL: `http://localhost:5000/admin/dashboard`
- Email: `admin@bloodlink.com`
- Password: `Admin@123`

---

## 📋 What's New

### New Files
- `src/controllers/adminController.js` - Backend logic
- `src/routes/adminRoutes.js` - API endpoints
- `views/admin-dashboard.ejs` - Dashboard UI
- `public/css/admin-dashboard.css` - Styling
- `public/js/admin-dashboard.js` - Frontend logic
- `scripts/createAdminUser.js` - Admin creation script

### Modified Files
- `src/server.js` - Added admin routes
- `src/middleware/auth.js` - Added admin verification
- `src/models/User.js` - Added admin userType
- `package.json` - Added create-admin script

---

## 🎯 Dashboard Pages

| Page | Features |
|------|----------|
| **Dashboard** | Platform health, metrics, charts, 3D visualization |
| **Hospitals** | Verify/reject hospitals, search, filter by status |
| **Users** | Manage users, suspend/ban, delete, multi-filter |
| **Statistics** | Emergency, Donor, Hospital analytics with charts |
| **Logs** | System activity audit trail |
| **Settings** | Platform configuration (placeholder) |

---

## 🔥 Core Actions

### Verify Hospital
1. Go to **Hospitals** page
2. Find pending hospital
3. Click **Verify** button
4. Hospital status changes to "Verified"

### Suspend/Ban User
1. Go to **Users** page
2. Click **Manage** button
3. Select status from dropdown
4. Enter reason
5. Click **Update Status**

### View Statistics
1. Go to **Statistics** page
2. Click tabs: Emergency / Donor / Hospital
3. View charts and top lists

### Check Logs
1. Go to **Logs** page
2. Search or filter activities
3. View complete audit trail

---

## 🔐 Security

- ✅ JWT Authentication
- ✅ Admin role verification
- ✅ Password hashing
- ✅ Session management
- ⚠️ **Change default password immediately!**

---

## 📊 Key Metrics on Dashboard

| Metric | Shows |
|--------|-------|
| System Health | Platform operational status (%) |
| Active Emergencies | Current ongoing emergency requests |
| Response Rate | % of emergencies successfully fulfilled |
| Donors Online | Currently active donors |
| Total Users | Total donors + hospitals |
| Today's Activity | Donations and emergencies count |
| Avg Response Time | Minutes from request to response |

---

## 🐛 Troubleshooting

### Can't Login
- Check email: `admin@bloodlink.com`
- Check password: `Admin@123`
- Ensure MongoDB is running
- Check .env MONGODB_URI

### Dashboard Not Loading
- Clear browser cache
- Check browser console for errors
- Ensure server is running on port 5000
- Verify token in localStorage

### Charts Not Showing
- Check browser DevTools Network tab
- Verify API endpoints returning data
- Ensure Chart.js CDN is accessible

### 3D Visualization Not Working
- Check if Three.js loads (DevTools Network)
- Verify WebGL support in browser
- Try different browser

---

## 📞 Quick Reference

### Ports & URLs
- Server: `http://localhost:5000`
- Admin Dashboard: `http://localhost:5000/admin/dashboard`
- API Base: `http://localhost:5000/api/admin`

### Default Admin Credentials
- Email: `admin@bloodlink.com`
- Password: `Admin@123` ⚠️ Change this!

### Commands
```bash
npm start              # Start server
npm run dev          # Start with nodemon (dev mode)
npm run create-admin  # Create admin user
```

### Database Collections Used
- `users` - Admin and other users
- `hospitals` - Hospital profiles
- `donors` - Donor profiles
- `bloodrequests` - Emergency requests
- `donationhistories` - Donation records
- `notifications` - User notifications

---

## 🎨 Color Scheme

| Element | Color | Hex |
|---------|-------|-----|
| Primary | Blue | #2c3e50 |
| Active | Green | #27ae60 |
| Danger | Red | #e74c3c |
| Warning | Yellow | #f39c12 |
| Success | Green | #27ae60 |

---

## 📱 Responsive Design

- **Desktop**: Full layout (1024px+)
- **Tablet**: Optimized grid (768px-1024px)
- **Mobile**: Stacked layout (<768px)

---

## ✅ Testing Checklist

After setup, test these features:
- [ ] Dashboard loads with data
- [ ] Hospital verification works
- [ ] User status update works
- [ ] Statistics pages load
- [ ] Charts render correctly
- [ ] 3D visualization works
- [ ] Filters and search work
- [ ] Logout works
- [ ] No console errors
- [ ] Responsive on mobile

---

## 📚 Documentation

- **ADMIN_FEATURES.md** - Complete feature documentation
- **ADMIN_TESTING_GUIDE.md** - Detailed testing procedures
- **ADMIN_IMPLEMENTATION_SUMMARY.md** - Implementation details
- **README.md** - Project overview

---

## 🚀 Going Live

Before production:
1. [ ] Change admin password
2. [ ] Update .env with production values
3. [ ] Set NODE_ENV=production
4. [ ] Enable HTTPS
5. [ ] Configure database backups
6. [ ] Set up error logging
7. [ ] Configure CORS for production domain
8. [ ] Test all features in production environment

---

## ⚡ Performance Tips

- Dashboard metrics cached for 60 seconds
- User lists paginated (20 per page)
- Charts lazy-loaded
- 3D visualization optimized
- API requests include token validation

---

## 🎯 Next Steps

1. ✅ Setup admin user - `npm run create-admin`
2. ✅ Start server - `npm start`
3. ✅ Login to dashboard
4. ✅ Test each feature
5. ✅ Change default password
6. ✅ Deploy to production

---

**Admin Dashboard v1.0 - Ready to Go!** 🚀

For detailed info, see comprehensive documentation files.
