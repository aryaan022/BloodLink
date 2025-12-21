const express = require('express');
const router = express.Router();
const { verifyAuth, verifyUserType } = require('../middleware/auth');
const certificateController = require('../controllers/certificateController');

// Protected routes
router.use(verifyAuth);

// Donor routes
router.get('/my-certificates', verifyUserType(['donor']), certificateController.getMyCertificates);
router.post('/generate/:donationId', verifyUserType(['donor']), certificateController.generateCertificate);
router.get('/download/:donationId', verifyUserType(['donor']), certificateController.downloadCertificate);

// Public verification route (still requires auth for now)
router.get('/verify/:certificateId', certificateController.verifyCertificate);

module.exports = router;
