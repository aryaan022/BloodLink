const express = require('express');
const router = express.Router();
const { verifyAuth, verifyUserType } = require('../middleware/auth');
const emergencyController = require('../controllers/emergencyController');

// All routes require authentication
router.use(verifyAuth);

// Hospital routes - create and manage emergencies
router.post('/create', verifyUserType(['hospital']), emergencyController.createEmergencyRequest);
router.get('/hospital', verifyUserType(['hospital']), emergencyController.getHospitalEmergencies);
router.put('/:id/cancel', verifyUserType(['hospital']), emergencyController.cancelEmergency);
router.put('/:id/arrived', verifyUserType(['hospital']), emergencyController.markDonorArrived);
router.put('/:id/complete-donation', verifyUserType(['hospital']), emergencyController.completeEmergencyDonation);

// Donor routes - view and respond to emergencies
router.get('/active', emergencyController.getActiveEmergencies);
router.post('/:id/respond', verifyUserType(['donor']), emergencyController.respondToEmergency);

// Common routes
router.get('/:id', emergencyController.getEmergencyDetails);

module.exports = router;
