const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAuth, verifyAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(verifyAuth);
router.use(verifyAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardMetrics);

// Hospital Management
router.get('/hospitals', adminController.getAllHospitals);
router.put('/hospitals/:hospitalId/verify', adminController.verifyHospital);
router.put('/hospitals/:hospitalId/reject', adminController.rejectHospital);

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

// Statistics
router.get('/statistics/emergencies', adminController.getEmergencyStatistics);
router.get('/statistics/donors', adminController.getDonorStatistics);
router.get('/statistics/hospitals', adminController.getHospitalStatistics);

// System Logs
router.get('/logs', adminController.getSystemLogs);

module.exports = router;
