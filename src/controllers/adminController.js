const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');

// Utility functions
const sendSuccess = (res, code, message, data = null) => {
  res.status(code).json({ success: true, message, data });
};

const sendError = (res, code, message) => {
  res.status(code).json({ success: false, message });
};

// @desc    Get admin dashboard overview/health metrics
// @route   GET /api/admin/dashboard
exports.getDashboardMetrics = async (req, res) => {
  try {
    console.log('[DASHBOARD] getDashboardMetrics called for admin user:', req.user?.userId);
    
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const totalDonors = await Donor.countDocuments();
    const totalHospitals = await Hospital.countDocuments();
    const totalEmergencies = await BloodRequest.countDocuments({ status: 'active' });

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const donationsToday = await BloodRequest.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $in: ['completed', 'active'] }
    });

    const emergenciesToday = await BloodRequest.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
      emergencyLevel: 'LifeThreatening'
    });

    // Get active emergencies
    const activeEmergencies = await BloodRequest.find({
      status: 'active'
    })
      .populate('hospitalId', 'hospitalName')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get platform health
    const avgResponseTime = 5; // minutes (can be calculated from real data)
    const donorsOnline = Math.floor(totalDonors * 0.15); // Estimate 15% online
    const systemHealth = 98.5; // Percentage

    // Blood type distribution
    const bloodTypeStats = await Donor.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Emergency response rate (completed vs total)
    const completedEmergencies = await BloodRequest.countDocuments({
      status: 'completed',
      emergencyLevel: { $in: ['Critical', 'LifeThreatening'] }
    });
    const totalEmergencyRequests = await BloodRequest.countDocuments({
      emergencyLevel: { $in: ['Critical', 'LifeThreatening'] }
    });
    const responseRate = totalEmergencyRequests > 0 ? Math.round((completedEmergencies / totalEmergencyRequests) * 100) : 0;

    const responseData = {
      overview: {
        totalUsers,
        totalDonors,
        totalHospitals,
        totalEmergencies,
        donationsToday,
        emergenciesToday,
        donorsOnline,
        avgResponseTime
      },
      health: {
        systemHealth,
        responseRate,
        activateEmergencies: activeEmergencies.length
      },
      bloodTypeDistribution: bloodTypeStats,
      recentEmergencies: activeEmergencies,
      lastUpdated: new Date()
    };
    
    console.log('[DASHBOARD] Sending metrics - Overview:', responseData.overview);
    sendSuccess(res, 200, 'Dashboard metrics retrieved', responseData);
  } catch (error) {
    console.error('[DASHBOARD] Error fetching dashboard metrics:', error.message);
    console.error('[DASHBOARD] Stack:', error.stack);
    sendError(res, 500, 'Error fetching dashboard metrics');
  }
};

// @desc    Get all hospitals (for verification)
// @route   GET /api/admin/hospitals
exports.getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find()
      .populate('userId', 'email phone fullName createdAt')
      .sort({ createdAt: -1 });

    sendSuccess(res, 200, 'Hospitals retrieved', hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    sendError(res, 500, 'Error fetching hospitals');
  }
};

// @desc    Verify a hospital
// @route   PUT /api/admin/hospitals/:hospitalId/verify
exports.verifyHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { verified, notes } = req.body;

    const hospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      {
        verified: verified,
        verificationNotes: notes || '',
        verifiedAt: verified ? new Date() : null
      },
      { new: true }
    );

    if (!hospital) {
      return sendError(res, 404, 'Hospital not found');
    }

    // Create notification for hospital
    if (verified) {
      await Notification.create({
        userId: hospital.userId,
        type: 'hospitalVerified',
        message: 'Your hospital has been verified by admin',
        relatedId: hospital._id
      });
    }

    sendSuccess(res, 200, `Hospital ${verified ? 'verified' : 'rejected'}`, hospital);
  } catch (error) {
    console.error('Error verifying hospital:', error);
    sendError(res, 500, 'Error verifying hospital');
  }
};

// @desc    Reject a hospital
// @route   PUT /api/admin/hospitals/:hospitalId/reject
exports.rejectHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { reason } = req.body;

    const hospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      {
        verified: false,
        verificationNotes: reason || 'Rejected by admin',
        rejectedAt: new Date()
      },
      { new: true }
    );

    if (!hospital) {
      return sendError(res, 404, 'Hospital not found');
    }

    // Create notification
    await Notification.create({
      userId: hospital.userId,
      type: 'hospitalRejected',
      message: `Your hospital registration was rejected. Reason: ${reason}`,
      relatedId: hospital._id
    });

    sendSuccess(res, 200, 'Hospital rejected', hospital);
  } catch (error) {
    console.error('Error rejecting hospital:', error);
    sendError(res, 500, 'Error rejecting hospital');
  }
};

// @desc    Get all users with filters
// @route   GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const { userType, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (userType) {
      filter.userType = userType;
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    sendSuccess(res, 200, 'Users retrieved', {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    sendError(res, 500, 'Error fetching users');
  }
};

// @desc    Suspend/Ban a user
// @route   PUT /api/admin/users/:userId/status
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body; // status: 'active', 'suspended', 'banned'

    const user = await User.findByIdAndUpdate(
      userId,
      {
        accountStatus: status,
        suspensionReason: reason || '',
        suspendedAt: status !== 'active' ? new Date() : null
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Create notification
    await Notification.create({
      userId: user._id,
      type: 'accountStatus',
      message: `Your account has been ${status}. Reason: ${reason || 'No reason provided'}`,
      relatedId: user._id
    });

    sendSuccess(res, 200, `User ${status}`, user);
  } catch (error) {
    console.error('Error updating user status:', error);
    sendError(res, 500, 'Error updating user status');
  }
};

// @desc    Get emergency statistics
// @route   GET /api/admin/statistics/emergencies
exports.getEmergencyStatistics = async (req, res) => {
  try {
    // Total emergencies
    const totalEmergencies = await BloodRequest.countDocuments();
    const activeEmergencies = await BloodRequest.countDocuments({ status: 'active' });
    const completedEmergencies = await BloodRequest.countDocuments({ status: 'completed' });
    const failedEmergencies = await BloodRequest.countDocuments({ status: 'cancelled' });

    // By urgency level
    const byLevel = await BloodRequest.aggregate([
      {
        $group: {
          _id: '$emergencyLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    // By blood group
    const byBloodGroup = await BloodRequest.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Average response time
    const responseTimes = await BloodRequest.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $addFields: {
          responseTime: { $subtract: ['$completedAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$responseTime' }
        }
      }
    ]);

    const avgResponseTimeMs = responseTimes[0]?.avgTime || 0;
    const avgResponseTimeMinutes = Math.round(avgResponseTimeMs / (1000 * 60));

    // Success rate
    const successRate = totalEmergencies > 0 ? Math.round((completedEmergencies / totalEmergencies) * 100) : 0;

    // Most requested blood types
    const mostRequested = await BloodRequest.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          requests: { $sum: 1 }
        }
      },
      { $sort: { requests: -1 } },
      { $limit: 5 }
    ]);

    sendSuccess(res, 200, 'Emergency statistics retrieved', {
      summary: {
        totalEmergencies,
        activeEmergencies,
        completedEmergencies,
        failedEmergencies,
        successRate,
        avgResponseTimeMinutes
      },
      byLevel,
      byBloodGroup,
      mostRequested
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    sendError(res, 500, 'Error fetching statistics');
  }
};

// @desc    Get donor statistics
// @route   GET /api/admin/statistics/donors
exports.getDonorStatistics = async (req, res) => {
  try {
    const totalDonors = await Donor.countDocuments();
    const activeDonors = await Donor.countDocuments({ status: 'active' });
    const inactiveDonors = await Donor.countDocuments({ status: 'inactive' });

    // By blood group
    const byBloodGroup = await Donor.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Donation frequency
    const byDonationCount = await Donor.aggregate([
      {
        $group: {
          _id: '$totalDonations',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Top donors (by donation count)
    const topDonors = await Donor.find()
      .populate('userId', 'fullName email phone')
      .sort({ totalDonations: -1 })
      .limit(10)
      .select('totalDonations userId bloodGroup');

    // Average donations per donor
    const avgStats = await Donor.aggregate([
      {
        $group: {
          _id: null,
          avgDonations: { $avg: '$totalDonations' },
          totalDonations: { $sum: '$totalDonations' }
        }
      }
    ]);

    sendSuccess(res, 200, 'Donor statistics retrieved', {
      summary: {
        totalDonors,
        activeDonors,
        inactiveDonors,
        averageDonationsPerDonor: Math.round(avgStats[0]?.avgDonations || 0),
        totalDonationsAcrossPlatform: avgStats[0]?.totalDonations || 0
      },
      byBloodGroup,
      byDonationCount,
      topDonors
    });
  } catch (error) {
    console.error('Error fetching donor statistics:', error);
    sendError(res, 500, 'Error fetching donor statistics');
  }
};

// @desc    Get hospital statistics
// @route   GET /api/admin/statistics/hospitals
exports.getHospitalStatistics = async (req, res) => {
  try {
    const totalHospitals = await Hospital.countDocuments();
    const verifiedHospitals = await Hospital.countDocuments({ verified: true });
    const unverifiedHospitals = await Hospital.countDocuments({ verified: false });

    // Emergency requests per hospital
    const hospitalRequests = await BloodRequest.aggregate([
      {
        $group: {
          _id: '$hospitalId',
          requestCount: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { requestCount: -1 } },
      { $limit: 10 }
    ]);

    // Populate hospital details
    const hospitalStats = await Promise.all(
      hospitalRequests.map(async (stat) => {
        const hospital = await Hospital.findById(stat._id).select('hospitalName city');
        return {
          hospital: hospital?.hospitalName || 'Unknown',
          city: hospital?.city || 'Unknown',
          totalRequests: stat.requestCount,
          completedRequests: stat.completedCount,
          successRate: stat.requestCount > 0 ? Math.round((stat.completedCount / stat.requestCount) * 100) : 0
        };
      })
    );

    sendSuccess(res, 200, 'Hospital statistics retrieved', {
      summary: {
        totalHospitals,
        verifiedHospitals,
        unverifiedHospitals,
        verificationRate: totalHospitals > 0 ? Math.round((verifiedHospitals / totalHospitals) * 100) : 0
      },
      topHospitals: hospitalStats
    });
  } catch (error) {
    console.error('Error fetching hospital statistics:', error);
    sendError(res, 500, 'Error fetching hospital statistics');
  }
};

// @desc    Delete a user (hard delete)
// @route   DELETE /api/admin/users/:userId
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Also delete related data
    if (user.userType === 'donor') {
      await Donor.deleteOne({ userId });
    } else if (user.userType === 'hospital') {
      await Hospital.deleteOne({ userId });
    }

    sendSuccess(res, 200, 'User deleted successfully', { deletedUserId: userId });
  } catch (error) {
    console.error('Error deleting user:', error);
    sendError(res, 500, 'Error deleting user');
  }
};

// @desc    Get system notifications/logs
// @route   GET /api/admin/logs
exports.getSystemLogs = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const logs = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'fullName email');

    sendSuccess(res, 200, 'System logs retrieved', logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    sendError(res, 500, 'Error fetching logs');
  }
};
