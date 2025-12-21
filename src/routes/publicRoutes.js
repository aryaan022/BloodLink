const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public routes (no authentication required)
router.get('/requests', publicController.getAllRequests);
router.get('/requests/:requestId', publicController.getRequest);
router.get('/search', publicController.searchRequests);
router.get('/blood-availability', publicController.getBloodAvailability);

module.exports = router;
