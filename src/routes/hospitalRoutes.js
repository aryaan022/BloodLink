const express = require('express');
const router = express.Router();
const { verifyAuth, verifyUserType } = require('../middleware/auth');
const hospitalController = require('../controllers/hospitalController');

// Protected routes (hospital only)
router.use(verifyAuth);
router.use(verifyUserType(['hospital']));

// Hospital profile routes
router.get('/profile', hospitalController.getHospitalProfile);
router.put('/profile', hospitalController.updateHospitalProfile);

// Blood request routes
router.post('/requests', hospitalController.createBloodRequest);
router.get('/requests', hospitalController.getHospitalRequests);
router.get('/requests/:requestId', hospitalController.getBloodRequest);
router.put('/requests/:requestId', hospitalController.updateBloodRequest);
router.put('/requests/:requestId/close', hospitalController.closeBloodRequest);
router.put('/requests/:requestId/donor-status', hospitalController.updateDonorStatus);
router.put('/requests/:requestId/status', hospitalController.updateRequestStatus);
router.put('/requests/:requestId/complete-donation', hospitalController.completeDonation);

// Blood stock routes
router.put('/blood-stock', hospitalController.updateBloodStock);

// Donor search routes
router.get('/search-donors', hospitalController.searchDonors);

module.exports = router;
