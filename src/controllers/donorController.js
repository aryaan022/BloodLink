const Donor = require('../models/Donor');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const BloodRequest = require('../models/BloodRequest');
const DonationHistory = require('../models/DonationHistory');
const Notification = require('../models/Notification');
const { sendSuccess, sendError, calculateDistance } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/emailService');
const { DONOR_COOLDOWN_DAYS } = require('../../config/constants');

// @desc    Get donor profile
// @route   GET /api/donor/profile
const getDonorProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId })
      .populate('userId')
      .populate('donationHistory');

    if (!donor) {
      return sendError(res, 404, 'Donor profile not found');
    }

    sendSuccess(res, 200, 'Donor profile fetched', donor);
  } catch (error) {
    console.error('Error fetching donor profile:', error);
    sendError(res, 500, 'Error fetching donor profile');
  }
};

// @desc    Update donor profile
// @route   PUT /api/donor/profile
const updateDonorProfile = async (req, res) => {
  try {
    const {
      bloodGroup,
      preferredDonationCenters,
      allergies,
      medicalConditions,
      notificationPreferences
    } = req.body;

    const donor = await Donor.findOneAndUpdate(
      { userId: req.user.userId },
      {
        bloodGroup,
        preferredDonationCenters,
        allergies,
        medicalConditions,
        notificationPreferences
      },
      { new: true, runValidators: true }
    );

    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    sendSuccess(res, 200, 'Donor profile updated', donor);
  } catch (error) {
    console.error('Error updating donor profile:', error);
    sendError(res, 500, 'Error updating donor profile');
  }
};

// @desc    Get donation history
// @route   GET /api/donor/history
const getDonationHistory = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId });

    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    const history = await DonationHistory.find({ donorId: donor._id })
      .populate('hospitalId')
      .sort({ donationDate: -1 });

    sendSuccess(res, 200, 'Donation history fetched', history);
  } catch (error) {
    console.error('Error fetching donation history:', error);
    sendError(res, 500, 'Error fetching donation history');
  }
};

// @desc    Get my active requests (requests donor has expressed interest in)
// @route   GET /api/donor/my-requests
const getMyRequests = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId });

    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    // Find all requests where this donor has expressed interest
    const requests = await BloodRequest.find({
      'interestedDonors.donorUserId': req.user.userId
    })
      .populate('hospitalId')
      .sort({ updatedAt: -1 });

    // Add donor's status to each request
    const requestsWithStatus = requests.map(request => {
      const donorEntry = request.interestedDonors.find(
        d => d.donorUserId.toString() === req.user.userId
      );
      return {
        ...request.toObject(),
        myStatus: donorEntry ? donorEntry.status : 'unknown',
        myDonationDate: donorEntry ? donorEntry.donationDate : null
      };
    });

    sendSuccess(res, 200, 'My requests fetched', requestsWithStatus);
  } catch (error) {
    console.error('Error fetching my requests:', error);
    sendError(res, 500, 'Error fetching my requests');
  }
};

// @desc    Get available blood requests
// @route   GET /api/donor/available-requests
const getAvailableRequests = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId }).populate('userId');

    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    if (!donor.isEligible || !donor.isAvailable) {
      return sendSuccess(res, 200, 'No requests available - not eligible', []);
    }

    // Get blood requests matching donor's blood group
    const requests = await BloodRequest.find({
      bloodGroup: donor.bloodGroup,
      status: { $in: ['open', 'emergency'] }
    })
      .populate('hospitalId')
      .sort({ urgencyLevel: -1, createdAt: -1 });

    // Calculate distance and filter
    const nearbyRequests = requests.filter(req => {
      if (!req.requestLocation || !req.requestLocation.coordinates) return false;
      
      const distance = calculateDistance(
        donor.userId.location.coordinates[1],
        donor.userId.location.coordinates[0],
        req.requestLocation.coordinates[1],
        req.requestLocation.coordinates[0]
      );
      return distance <= 50; // Within 50 km
    });

    sendSuccess(res, 200, 'Available requests fetched', nearbyRequests);
  } catch (error) {
    console.error('Error fetching available requests:', error);
    sendError(res, 500, 'Error fetching available requests');
  }
};

// @desc    Express interest in a blood request
// @route   POST /api/donor/requests/:requestId/interest
const expressInterest = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId });

    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    // Check if donor is eligible
    if (!donor.isEligible) {
      return sendError(res, 400, 'You are not currently eligible to donate. Please wait for your cooldown period to end.');
    }

    const bloodRequest = await BloodRequest.findById(req.params.requestId);

    if (!bloodRequest) {
      return sendError(res, 404, 'Blood request not found');
    }

    // Check if request is still open
    if (!['open', 'emergency', 'in_progress'].includes(bloodRequest.status)) {
      return sendError(res, 400, 'This request is no longer accepting donors');
    }

    // Check if already interested
    if (bloodRequest.interestedDonors.some(d => d.donorUserId.toString() === req.user.userId)) {
      return sendError(res, 400, 'You have already expressed interest');
    }

    // Add interest with both donor IDs
    bloodRequest.interestedDonors.push({
      donorId: donor._id,
      donorUserId: req.user.userId,
      status: 'interested',
      interestedAt: new Date()
    });

    await bloodRequest.save();

    // Create notification for hospital
    const hospital = await Hospital.findById(bloodRequest.hospitalId);
    if (hospital) {
      const user = await User.findById(req.user.userId);
      const notification = new Notification({
        userId: hospital.userId,
        type: 'new_donor_interest',
        title: '🩸 New Donor Interest',
        message: `${user?.fullName || 'A donor'} has expressed interest in your blood request for ${bloodRequest.bloodGroup}.`,
        relatedRequestId: bloodRequest._id,
        relatedDonorId: donor._id
      });
      await notification.save();
    }

    sendSuccess(res, 200, 'Interest expressed successfully', bloodRequest);
  } catch (error) {
    console.error('Error expressing interest:', error);
    sendError(res, 500, 'Error expressing interest');
  }
};

// @desc    Check donation eligibility
// @route   GET /api/donor/eligibility
const checkEligibility = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId });

    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    const lastDonation = await DonationHistory.findOne({ donorId: donor._id })
      .sort({ donationDate: -1 });

    let daysSinceLastDonation = null;
    let nextEligibleDate = null;
    let isCurrentlyEligible = true;
    let daysUntilEligible = 0;

    if (lastDonation) {
      const lastDonationDate = new Date(lastDonation.donationDate);
      const now = new Date();
      
      daysSinceLastDonation = Math.floor(
        (now - lastDonationDate) / (1000 * 60 * 60 * 24)
      );
      
      // Calculate next eligible date (lastDonation + cooldown days)
      nextEligibleDate = new Date(lastDonationDate.getTime() + DONOR_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      
      // Check if cooldown period has passed
      isCurrentlyEligible = daysSinceLastDonation >= DONOR_COOLDOWN_DAYS;
      
      // Calculate days until eligible
      if (!isCurrentlyEligible) {
        daysUntilEligible = DONOR_COOLDOWN_DAYS - daysSinceLastDonation;
      }
      
      // Auto-update donor eligibility if cooldown has passed
      if (isCurrentlyEligible && !donor.isEligible) {
        donor.isEligible = true;
        await donor.save();
      } else if (!isCurrentlyEligible && donor.isEligible) {
        donor.isEligible = false;
        await donor.save();
      }
    } else {
      // No previous donations - donor is eligible now
      isCurrentlyEligible = true;
      nextEligibleDate = null; // Already eligible
    }

    const eligibilityData = {
      isEligible: isCurrentlyEligible && donor.isAvailable,
      lastDonationDate: lastDonation ? lastDonation.donationDate : null,
      daysSinceLastDonation: daysSinceLastDonation,
      daysUntilEligible: daysUntilEligible,
      nextEligibleDate: nextEligibleDate,
      cooldownDays: DONOR_COOLDOWN_DAYS,
      restrictions: donor.medicalConditions,
      totalDonations: donor.totalDonations || 0,
      hasDonatedBefore: lastDonation !== null
    };

    sendSuccess(res, 200, 'Eligibility check completed', eligibilityData);
  } catch (error) {
    console.error('Error checking eligibility:', error);
    sendError(res, 500, 'Error checking eligibility');
  }
};

// @desc    Record a donation
// @route   POST /api/donor/donation-record
const recordDonation = async (req, res) => {
  try {
    const { organizationId, bloodUnits, donationDate, notes } = req.body;

    if (!organizationId || !bloodUnits) {
      return sendError(res, 400, 'Organization ID and blood units are required');
    }

    const donor = await Donor.findOne({ userId: req.user.userId });

    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    // Create donation history record
    const donation = new DonationHistory({
      donorId: donor._id,
      organizationId,
      bloodUnits,
      donationDate: donationDate || new Date(),
      notes
    });

    await donation.save();

    // Update donor statistics
    donor.totalDonations += 1;
    donor.totalUnitsContributed += bloodUnits;
    await donor.save();

    sendSuccess(res, 201, 'Donation recorded successfully', donation);
  } catch (error) {
    console.error('Error recording donation:', error);
    sendError(res, 500, 'Error recording donation');
  }
};

// @desc    Search blood requests by filters
// @route   GET /api/donor/search-requests
const searchRequests = async (req, res) => {
  try {
    const { bloodGroup, urgencyLevel, maxDistance = 50, status = 'open' } = req.query;

    const donor = await Donor.findOne({ userId: req.user.userId }).populate('userId');

    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    const query = {
      status: { $in: [status, ...(status === 'open' ? ['emergency'] : [])] }
    };

    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (urgencyLevel) query.urgencyLevel = urgencyLevel;

    const requests = await BloodRequest.find(query)
      .populate('hospitalId')
      .sort({ urgencyLevel: -1, createdAt: -1 });

    // Filter by distance
    const filteredRequests = requests.filter(req => {
      const distance = calculateDistance(
        donor.userId.location.coordinates[1],
        donor.userId.location.coordinates[0],
        req.requestLocation.coordinates[1],
        req.requestLocation.coordinates[0]
      );
      return distance <= maxDistance;
    });

    sendSuccess(res, 200, 'Requests found', filteredRequests);
  } catch (error) {
    console.error('Error searching requests:', error);
    sendError(res, 500, 'Error searching requests');
  }
};

// @desc    Get notifications for donor
// @route   GET /api/donor/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    sendSuccess(res, 200, 'Notifications fetched', notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    sendError(res, 500, 'Error fetching notifications');
  }
};

// @desc    Update user location
// @route   POST /api/donor/update-location
const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return sendError(res, 400, 'Latitude and longitude are required');
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      },
      { new: true }
    );

    sendSuccess(res, 200, 'Location updated successfully', {
      latitude: user.location.coordinates[1],
      longitude: user.location.coordinates[0]
    });
  } catch (error) {
    console.error('Error updating location:', error);
    sendError(res, 500, 'Error updating location');
  }
};

module.exports = {
  getDonorProfile,
  updateDonorProfile,
  updateLocation,
  getDonationHistory,
  getMyRequests,
  getAvailableRequests,
  expressInterest,
  checkEligibility,
  recordDonation,
  searchRequests,
  getNotifications
};
