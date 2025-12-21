const express = require('express');
const router = express.Router();
const { verifyAuth, verifyUserType } = require('../middleware/auth');
const badgeController = require('../controllers/badgeController');

// Public routes
router.get('/definitions', badgeController.getBadgeDefinitions);

// Protected routes
router.use(verifyAuth);

// Donor routes
router.get('/my-badges', verifyUserType(['donor']), badgeController.getMyBadges);
router.get('/stats', verifyUserType(['donor']), badgeController.getDonorStats);
router.post('/check', verifyUserType(['donor']), badgeController.checkBadges);

// Leaderboard (accessible to all authenticated users)
router.get('/leaderboard', badgeController.getLeaderboard);

module.exports = router;
