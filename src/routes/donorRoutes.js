const express = require('express');
const router = express.Router();
const { verifyAuth, verifyUserType } = require('../middleware/auth');
const donorController = require('../controllers/donorController');

// Protected routes (donor only)
router.use(verifyAuth);
router.use(verifyUserType(['donor']));

// Donor profile routes
router.get('/profile', donorController.getDonorProfile);
router.put('/profile', donorController.updateDonorProfile);
router.post('/update-location', donorController.updateLocation);

// Blood request routes
router.get('/available-requests', donorController.getAvailableRequests);
router.get('/my-requests', donorController.getMyRequests);
router.get('/search-requests', donorController.searchRequests);
router.post('/requests/:requestId/interest', donorController.expressInterest);

// Eligibility routes
router.get('/eligibility', donorController.checkEligibility);

// Donation routes
router.post('/donation', donorController.recordDonation);
router.get('/donation-history', donorController.getDonationHistory);

// Notification routes
router.get('/notifications', donorController.getNotifications);

module.exports = router;
