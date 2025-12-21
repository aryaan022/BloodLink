const DonorBadge = require('../models/Badge');
const Donor = require('../models/Donor');
const DonationHistory = require('../models/DonationHistory');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/helpers');

// @desc    Get all badge definitions
// @route   GET /api/badges/definitions
const getBadgeDefinitions = async (req, res) => {
  try {
    const definitions = DonorBadge.getBadgeDefinitions();
    sendSuccess(res, 200, 'Badge definitions fetched', definitions);
  } catch (error) {
    console.error('Error fetching badge definitions:', error);
    sendError(res, 500, 'Error fetching badge definitions');
  }
};

// @desc    Get donor's earned badges
// @route   GET /api/badges/my-badges
const getMyBadges = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId });
    
    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    const badges = await DonorBadge.find({ donorId: donor._id })
      .sort({ earnedAt: -1 });

    // Get all badge definitions to show progress
    const allDefinitions = DonorBadge.getBadgeDefinitions();
    const earnedBadgeIds = badges.map(b => b.badgeId);

    // Calculate progress for unearned badges
    const totalDonations = await DonationHistory.countDocuments({
      donorId: donor._id,
      status: 'completed'
    });

    const emergencyDonations = await DonationHistory.countDocuments({
      donorId: donor._id,
      status: 'completed',
      isEmergency: true
    });

    const uniqueHospitals = await DonationHistory.distinct('hospitalId', {
      donorId: donor._id,
      status: 'completed'
    });

    const badgeProgress = allDefinitions.map(def => {
      const isEarned = earnedBadgeIds.includes(def.id);
      let progress = 0;
      let current = 0;
      let target = def.requirement.count || 1;

      if (!isEarned) {
        switch (def.requirement.type) {
          case 'donations':
            current = totalDonations;
            target = def.requirement.count;
            progress = Math.min(100, (current / target) * 100);
            break;
          case 'emergency':
            current = emergencyDonations;
            target = def.requirement.count;
            progress = Math.min(100, (current / target) * 100);
            break;
          case 'hospitals':
            current = uniqueHospitals.length;
            target = def.requirement.count;
            progress = Math.min(100, (current / target) * 100);
            break;
          case 'blood_type':
            progress = donor.bloodGroup === def.requirement.value ? 100 : 0;
            current = donor.bloodGroup === def.requirement.value ? 1 : 0;
            target = 1;
            break;
          case 'rare_blood':
            const rareTypes = ['O-', 'AB-', 'B-', 'A-'];
            if (rareTypes.includes(donor.bloodGroup)) {
              current = totalDonations;
              target = def.requirement.count;
              progress = Math.min(100, (current / target) * 100);
            }
            break;
          case 'verification':
            progress = donor.idProof ? 100 : 0;
            current = donor.idProof ? 1 : 0;
            target = 1;
            break;
        }
      } else {
        progress = 100;
        current = target;
      }

      return {
        ...def,
        isEarned,
        earnedAt: isEarned ? badges.find(b => b.badgeId === def.id)?.earnedAt : null,
        progress: Math.round(progress),
        current,
        target
      };
    });

    sendSuccess(res, 200, 'Badges fetched', {
      earned: badges,
      all: badgeProgress,
      stats: {
        totalBadges: allDefinitions.length,
        earnedCount: badges.length,
        totalPoints: donor.totalPoints || 0,
        level: donor.level || 1
      }
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    sendError(res, 500, 'Error fetching badges');
  }
};

// @desc    Get donor leaderboard
// @route   GET /api/badges/leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get top donors by points
    const topDonors = await Donor.find({})
      .sort({ totalPoints: -1, totalDonations: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'fullName');

    const leaderboard = await Promise.all(topDonors.map(async (donor, index) => {
      const badgeCount = await DonorBadge.countDocuments({ donorId: donor._id });
      
      return {
        rank: index + 1,
        donorId: donor._id,
        name: donor.userId?.fullName || 'Anonymous Donor',
        bloodGroup: donor.bloodGroup,
        totalPoints: donor.totalPoints || 0,
        totalDonations: donor.totalDonations || 0,
        badgeCount,
        level: donor.level || 1,
        emergencyResponses: donor.emergencyResponses || 0
      };
    }));

    // Get current user's rank if logged in as donor
    let userRank = null;
    const currentDonor = await Donor.findOne({ userId: req.user.userId });
    
    if (currentDonor) {
      const higherRanked = await Donor.countDocuments({
        totalPoints: { $gt: currentDonor.totalPoints || 0 }
      });
      userRank = {
        rank: higherRanked + 1,
        totalPoints: currentDonor.totalPoints || 0,
        totalDonations: currentDonor.totalDonations || 0
      };
    }

    sendSuccess(res, 200, 'Leaderboard fetched', {
      leaderboard,
      userRank
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    sendError(res, 500, 'Error fetching leaderboard');
  }
};

// @desc    Get donor stats for gamification
// @route   GET /api/badges/stats
const getDonorStats = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId });
    
    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    // Calculate level based on points
    const points = donor.totalPoints || 0;
    let level = 1;
    let levelTitle = 'Newcomer';
    let nextLevelPoints = 100;

    const levels = [
      { level: 1, title: 'Newcomer', minPoints: 0 },
      { level: 2, title: 'Helper', minPoints: 100 },
      { level: 3, title: 'Contributor', minPoints: 300 },
      { level: 4, title: 'Supporter', minPoints: 600 },
      { level: 5, title: 'Champion', minPoints: 1000 },
      { level: 6, title: 'Hero', minPoints: 1500 },
      { level: 7, title: 'Legend', minPoints: 2500 },
      { level: 8, title: 'Guardian', minPoints: 4000 },
      { level: 9, title: 'Savior', minPoints: 6000 },
      { level: 10, title: 'Blood Angel', minPoints: 10000 }
    ];

    for (let i = levels.length - 1; i >= 0; i--) {
      if (points >= levels[i].minPoints) {
        level = levels[i].level;
        levelTitle = levels[i].title;
        nextLevelPoints = levels[i + 1]?.minPoints || levels[i].minPoints;
        break;
      }
    }

    // Update donor level if changed
    if (donor.level !== level) {
      donor.level = level;
      await donor.save();
    }

    const badgeCount = await DonorBadge.countDocuments({ donorId: donor._id });

    // Get recent badges
    const recentBadges = await DonorBadge.find({ donorId: donor._id })
      .sort({ earnedAt: -1 })
      .limit(3);

    // Calculate donations this year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const donationsThisYear = await DonationHistory.countDocuments({
      donorId: donor._id,
      status: 'completed',
      donationDate: { $gte: startOfYear }
    });

    const stats = {
      totalPoints: points,
      level,
      levelTitle,
      nextLevelPoints,
      pointsToNextLevel: nextLevelPoints - points,
      levelProgress: Math.round(((points - levels[level - 1].minPoints) / (nextLevelPoints - levels[level - 1].minPoints)) * 100),
      totalDonations: donor.totalDonations || 0,
      donationsThisYear,
      emergencyResponses: donor.emergencyResponses || 0,
      badgeCount,
      recentBadges,
      streak: donor.donationStreak || 0,
      trustScore: donor.trustScore || 0
    };

    sendSuccess(res, 200, 'Stats fetched', stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    sendError(res, 500, 'Error fetching stats');
  }
};

// @desc    Manually check and award badges (utility endpoint)
// @route   POST /api/badges/check
const checkBadges = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId });
    
    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    const newBadges = await DonorBadge.checkAndAwardBadges(donor._id);

    sendSuccess(res, 200, 'Badges checked', {
      newBadgesEarned: newBadges.length,
      badges: newBadges
    });
  } catch (error) {
    console.error('Error checking badges:', error);
    sendError(res, 500, 'Error checking badges');
  }
};

module.exports = {
  getBadgeDefinitions,
  getMyBadges,
  getLeaderboard,
  getDonorStats,
  checkBadges
};
