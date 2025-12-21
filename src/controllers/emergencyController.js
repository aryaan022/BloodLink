const EmergencyRequest = require('../models/EmergencyRequest');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const User = require('../models/User');
const Notification = require('../models/Notification');
const DonationHistory = require('../models/DonationHistory');
const DonorBadge = require('../models/Badge');
const { sendSuccess, sendError, calculateDistance } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/emailService');

// Helper function to get or create hospital profile
const getOrCreateHospital = async (userId) => {
  let hospital = await Hospital.findOne({ userId }).populate('userId');
  
  if (!hospital) {
    const user = await User.findById(userId);
    if (!user || user.userType !== 'hospital') {
      return null;
    }
    
    hospital = new Hospital({
      userId: user._id,
      hospitalName: user.fullName || 'Hospital',
      licenseNumber: 'LIC-' + Date.now(),
      contactPerson: user.fullName || 'Contact Person',
      contactPhone: user.phone || '0000000000'
    });
    await hospital.save();
    hospital = await Hospital.findById(hospital._id).populate('userId');
  }
  
  return hospital;
};

// @desc    Create emergency blood request
// @route   POST /api/emergency/create
const createEmergencyRequest = async (req, res) => {
  try {
    const {
      bloodGroup,
      unitsNeeded,
      patientName,
      patientAge,
      patientCondition,
      conditionDetails,
      emergencyLevel,
      requiredWithin, // in minutes
      contactName,
      contactPhone,
      alternatePhone,
      locationAddress
    } = req.body;

    // Validation
    if (!bloodGroup || !unitsNeeded || !patientName || !patientCondition || !contactPhone) {
      return sendError(res, 400, 'Blood group, units needed, patient name, condition, and contact phone are required');
    }

    const hospital = await getOrCreateHospital(req.user.userId);
    if (!hospital) {
      return sendError(res, 404, 'Hospital not found');
    }

    const user = hospital.userId;
    const timeLimit = requiredWithin || 60; // Default 60 minutes
    const expiresAt = new Date(Date.now() + timeLimit * 60 * 1000);

    // Create emergency request
    const emergencyRequest = new EmergencyRequest({
      hospitalId: hospital._id,
      bloodGroup,
      unitsNeeded,
      patientName,
      patientAge,
      patientCondition,
      conditionDetails,
      emergencyLevel: emergencyLevel || 'Critical',
      requiredWithin: timeLimit,
      expiresAt,
      location: {
        type: 'Point',
        coordinates: user.location?.coordinates || [0, 0] // Default to [0,0] if no location
      },
      locationAddress: locationAddress || user.address || 'Hospital Address',
      emergencyContact: {
        name: contactName || hospital.contactPerson,
        phone: contactPhone || hospital.contactPhone,
        alternatePhone
      },
      status: 'active'
    });

    await emergencyRequest.save();

    // Immediately notify all eligible donors
    const notificationResult = await notifyAllEligibleDonors(emergencyRequest, hospital);

    emergencyRequest.totalNotified = notificationResult.notifiedCount;
    await emergencyRequest.save();

    sendSuccess(res, 201, 'Emergency request created and donors notified', {
      emergencyRequest,
      donorsNotified: notificationResult.notifiedCount
    });
  } catch (error) {
    console.error('Error creating emergency request:', error);
    sendError(res, 500, 'Error creating emergency request');
  }
};

// Helper function to notify all eligible donors
const notifyAllEligibleDonors = async (emergencyRequest, hospital) => {
  try {
    // Find all eligible donors with matching blood group
    const compatibleBloodTypes = getCompatibleDonors(emergencyRequest.bloodGroup);
    
    const donors = await Donor.find({
      bloodGroup: { $in: compatibleBloodTypes },
      isAvailable: true,
      isEligible: true,
      'notificationPreferences.urgentRequests': true
    }).populate('userId');

    let notifiedCount = 0;
    const notifiedDonors = [];

    for (const donor of donors) {
      if (!donor.userId || !donor.userId.location) continue;

      // Calculate distance
      const distance = calculateDistance(
        hospital.userId.location.coordinates[1],
        hospital.userId.location.coordinates[0],
        donor.userId.location.coordinates[1],
        donor.userId.location.coordinates[0]
      );

      // Notify donors within 30 km for emergencies
      if (distance <= 30) {
        // Create urgent notification
        const notification = new Notification({
          userId: donor.userId._id,
          type: 'urgent_request',
          title: `🚨 EMERGENCY: ${emergencyRequest.bloodGroup} Blood Needed NOW!`,
          message: `${hospital.hospitalName} urgently needs ${emergencyRequest.unitsNeeded} units of ${emergencyRequest.bloodGroup} blood. Patient condition: ${emergencyRequest.patientCondition}. Required within ${emergencyRequest.requiredWithin} minutes!`,
          description: `Distance: ${distance.toFixed(1)} km away. Contact: ${emergencyRequest.emergencyContact.phone}`,
          relatedRequestId: emergencyRequest._id,
          relatedHospitalId: hospital._id,
          relatedDonorId: donor._id,
          channels: {
            inApp: true,
            email: donor.notificationPreferences.email,
            sms: donor.notificationPreferences.sms
          }
        });
        await notification.save();

        // Add to notified donors list
        notifiedDonors.push({
          donorId: donor._id,
          donorUserId: donor.userId._id,
          notifiedAt: new Date(),
          responseStatus: 'notified'
        });

        notifiedCount++;

        // Send email if enabled
        if (donor.notificationPreferences.email) {
          try {
            await sendEmail(
              donor.userId.email,
              `🚨 EMERGENCY Blood Request - ${emergencyRequest.bloodGroup}`,
              emailTemplates.emergencyRequestNotification 
                ? emailTemplates.emergencyRequestNotification(
                    hospital.hospitalName,
                    emergencyRequest.bloodGroup,
                    emergencyRequest.unitsNeeded,
                    emergencyRequest.patientCondition,
                    emergencyRequest.requiredWithin,
                    emergencyRequest.emergencyContact.phone
                  )
                : `<h2>Emergency Blood Request</h2>
                   <p><strong>${hospital.hospitalName}</strong> urgently needs <strong>${emergencyRequest.unitsNeeded} units</strong> of <strong>${emergencyRequest.bloodGroup}</strong> blood.</p>
                   <p><strong>Patient Condition:</strong> ${emergencyRequest.patientCondition}</p>
                   <p><strong>Required Within:</strong> ${emergencyRequest.requiredWithin} minutes</p>
                   <p><strong>Contact:</strong> ${emergencyRequest.emergencyContact.phone}</p>
                   <p>Please respond immediately if you can help!</p>`
            );
          } catch (emailError) {
            console.error('Email notification failed:', emailError);
          }
        }
      }
    }

    // Update emergency request with notified donors
    emergencyRequest.notifiedDonors = notifiedDonors;
    await emergencyRequest.save();

    // Emit socket.io emergency alert to all notified donors
    if (global.io) {
      for (const donorEntry of notifiedDonors) {
        global.io.to(donorEntry.donorUserId.toString()).emit('emergencyAlert', {
          emergencyId: emergencyRequest._id,
          hospitalName: hospital.hospitalName,
          bloodGroup: emergencyRequest.bloodGroup,
          unitsNeeded: emergencyRequest.unitsNeeded,
          patientCondition: emergencyRequest.patientCondition,
          emergencyLevel: emergencyRequest.emergencyLevel,
          requiredWithin: emergencyRequest.requiredWithin,
          contact: emergencyRequest.emergencyContact.phone,
          timestamp: new Date()
        });
      }
    }

    return { notifiedCount, notifiedDonors };
  } catch (error) {
    console.error('Error notifying donors:', error);
    return { notifiedCount: 0, notifiedDonors: [] };
  }
};

// Helper to get compatible blood donors
const getCompatibleDonors = (bloodGroup) => {
  const compatibility = {
    'O+': ['O+', 'O-'],
    'O-': ['O-'],
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-']
  };
  return compatibility[bloodGroup] || [bloodGroup];
};

// @desc    Get all active emergency requests for donors
// @route   GET /api/emergency/active
const getActiveEmergencies = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId }).populate('userId');
    
    if (!donor) {
      // For hospitals or other users, return all active emergencies
      const emergencies = await EmergencyRequest.find({ 
        status: 'active',
        expiresAt: { $gt: new Date() }
      })
        .populate('hospitalId')
        .sort({ emergencyLevel: -1, createdAt: -1 });

      return sendSuccess(res, 200, 'Active emergencies fetched', emergencies);
    }

    // For donors, filter by blood compatibility and distance
    const compatibleBloodTypes = getCompatibleDonors(donor.bloodGroup);
    
    const emergencies = await EmergencyRequest.find({
      bloodGroup: { $in: getReceivingBloodTypes(donor.bloodGroup) },
      status: 'active',
      expiresAt: { $gt: new Date() }
    })
      .populate('hospitalId')
      .sort({ emergencyLevel: -1, createdAt: -1 });

    sendSuccess(res, 200, 'Active emergencies fetched', emergencies);
  } catch (error) {
    console.error('Error fetching emergencies:', error);
    sendError(res, 500, 'Error fetching emergencies');
  }
};

// Helper to get blood types that can receive from a donor
const getReceivingBloodTypes = (donorBloodType) => {
  const canDonateTo = {
    'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A+', 'A-', 'AB+', 'AB-'],
    'A+': ['A+', 'AB+'],
    'B-': ['B+', 'B-', 'AB+', 'AB-'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB+', 'AB-'],
    'AB+': ['AB+']
  };
  return canDonateTo[donorBloodType] || [donorBloodType];
};

// @desc    Donor responds to emergency
// @route   POST /api/emergency/:id/respond
const respondToEmergency = async (req, res) => {
  try {
    const { estimatedArrival } = req.body;
    const emergencyId = req.params.id;

    const donor = await Donor.findOne({ userId: req.user.userId });
    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    const emergency = await EmergencyRequest.findById(emergencyId);
    if (!emergency) {
      return sendError(res, 404, 'Emergency request not found');
    }

    if (emergency.status !== 'active') {
      return sendError(res, 400, 'This emergency request is no longer active');
    }

    // Check if donor already responded
    const existingResponse = emergency.notifiedDonors.find(
      d => d.donorUserId && d.donorUserId.toString() === req.user.userId
    );

    if (existingResponse && existingResponse.responseStatus === 'responding') {
      return sendError(res, 400, 'You have already responded to this emergency');
    }

    // Update or add donor response
    if (existingResponse) {
      existingResponse.responseStatus = 'responding';
      existingResponse.respondedAt = new Date();
      existingResponse.estimatedArrival = estimatedArrival || 30;
    } else {
      emergency.notifiedDonors.push({
        donorId: donor._id,
        donorUserId: req.user.userId,
        notifiedAt: new Date(),
        responseStatus: 'responding',
        respondedAt: new Date(),
        estimatedArrival: estimatedArrival || 30
      });
    }

    emergency.totalResponded += 1;
    if (emergency.status === 'active') {
      emergency.status = 'responded';
    }
    await emergency.save();

    // Notify hospital
    const hospital = await Hospital.findById(emergency.hospitalId);
    const user = await User.findById(req.user.userId);
    
    if (hospital) {
      const notification = new Notification({
        userId: hospital.userId,
        type: 'donor_interest',
        title: '🩸 Donor Responding to Emergency!',
        message: `${user?.fullName || 'A donor'} is responding to your emergency request for ${emergency.bloodGroup} blood. ETA: ${estimatedArrival || 30} minutes.`,
        relatedRequestId: emergency._id,
        relatedDonorId: donor._id
      });
      await notification.save();
    }

    sendSuccess(res, 200, 'Response recorded successfully', emergency);
  } catch (error) {
    console.error('Error responding to emergency:', error);
    sendError(res, 500, 'Error responding to emergency');
  }
};

// @desc    Mark donor as arrived
// @route   PUT /api/emergency/:id/arrived
const markDonorArrived = async (req, res) => {
  try {
    const { donorUserId } = req.body;
    const emergencyId = req.params.id;

    const emergency = await EmergencyRequest.findById(emergencyId);
    if (!emergency) {
      return sendError(res, 404, 'Emergency request not found');
    }

    const donorEntry = emergency.notifiedDonors.find(
      d => d.donorUserId && d.donorUserId.toString() === donorUserId
    );

    if (!donorEntry) {
      return sendError(res, 404, 'Donor not found in this emergency request');
    }

    donorEntry.responseStatus = 'arrived';
    donorEntry.actualArrivalTime = new Date();
    emergency.totalArrived += 1;
    await emergency.save();

    sendSuccess(res, 200, 'Donor marked as arrived', emergency);
  } catch (error) {
    console.error('Error marking donor arrived:', error);
    sendError(res, 500, 'Error marking donor arrived');
  }
};

// @desc    Complete emergency donation
// @route   PUT /api/emergency/:id/complete-donation
const completeEmergencyDonation = async (req, res) => {
  try {
    const { donorUserId, unitsCollected, notes } = req.body;
    const emergencyId = req.params.id;

    const emergency = await EmergencyRequest.findById(emergencyId).populate('hospitalId');
    if (!emergency) {
      return sendError(res, 404, 'Emergency request not found');
    }

    const donor = await Donor.findOne({ userId: donorUserId });
    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    const donorEntry = emergency.notifiedDonors.find(
      d => d.donorUserId && d.donorUserId.toString() === donorUserId
    );

    if (!donorEntry) {
      return sendError(res, 404, 'Donor not found in this emergency request');
    }

    // Calculate response time in minutes
    const responseTime = donorEntry.respondedAt 
      ? Math.floor((donorEntry.actualArrivalTime - donorEntry.respondedAt) / (1000 * 60))
      : null;

    // Create donation history record
    const donation = new DonationHistory({
      donorId: donor._id,
      donorUserId: donorUserId,
      hospitalId: emergency.hospitalId._id,
      bloodRequestId: emergency.relatedRequestId,
      bloodGroup: donor.bloodGroup,
      unitsCollected: unitsCollected || 1,
      donationDate: new Date(),
      donationCenter: emergency.hospitalId.hospitalName,
      status: 'completed',
      isEmergency: true,
      emergencyRequestId: emergency._id,
      responseTime,
      notes
    });

    // Award points for emergency donation
    const basePoints = 100;
    const emergencyBonus = 200;
    let totalPoints = basePoints + emergencyBonus;
    
    // Quick response bonus (within 30 minutes)
    if (responseTime && responseTime <= 30) {
      totalPoints += 100;
    }

    donation.pointsAwarded = totalPoints;
    await donation.save();

    // Update donor stats
    donor.totalDonations += 1;
    donor.lastDonationDate = new Date();
    donor.emergencyResponses += 1;
    donor.totalPoints += totalPoints;
    donor.isEligible = false; // Set cooldown
    donor.donationHistory.push(donation._id);
    await donor.save();

    // Update donor entry in emergency
    donorEntry.responseStatus = 'donated';
    donorEntry.donationCompleted = true;
    
    // Update emergency stats
    emergency.unitsFulfilled += (unitsCollected || 1);
    if (emergency.unitsFulfilled >= emergency.unitsNeeded) {
      emergency.status = 'fulfilled';
      emergency.resolvedAt = new Date();
    }
    await emergency.save();

    // Award badges
    const newBadges = await DonorBadge.checkAndAwardBadges(donor._id, {
      donationId: donation._id,
      requestId: emergency._id,
      description: 'Emergency blood donation'
    });

    // Create notification for donor
    const donorUser = await User.findById(donorUserId);
    const donorNotification = new Notification({
      userId: donorUserId,
      type: 'donation_completed',
      title: '🎉 Emergency Donation Completed!',
      message: `Thank you for your emergency donation! You earned ${totalPoints} points.${newBadges.length > 0 ? ` New badges earned: ${newBadges.map(b => b.name).join(', ')}` : ''}`,
      relatedRequestId: emergency._id,
      relatedDonorId: donor._id
    });
    await donorNotification.save();

    sendSuccess(res, 200, 'Emergency donation completed', {
      donation,
      pointsAwarded: totalPoints,
      badgesEarned: newBadges,
      emergency
    });
  } catch (error) {
    console.error('Error completing emergency donation:', error);
    sendError(res, 500, 'Error completing emergency donation');
  }
};

// @desc    Get hospital's emergency requests
// @route   GET /api/emergency/hospital
const getHospitalEmergencies = async (req, res) => {
  try {
    const hospital = await getOrCreateHospital(req.user.userId);
    if (!hospital) {
      return sendError(res, 404, 'Hospital not found');
    }

    const emergencies = await EmergencyRequest.find({ hospitalId: hospital._id })
      .sort({ createdAt: -1 })
      .limit(20);

    sendSuccess(res, 200, 'Hospital emergencies fetched', emergencies);
  } catch (error) {
    console.error('Error fetching hospital emergencies:', error);
    sendError(res, 500, 'Error fetching hospital emergencies');
  }
};

// @desc    Cancel emergency request
// @route   PUT /api/emergency/:id/cancel
const cancelEmergency = async (req, res) => {
  try {
    const { reason } = req.body;
    const emergencyId = req.params.id;

    const emergency = await EmergencyRequest.findById(emergencyId);
    if (!emergency) {
      return sendError(res, 404, 'Emergency request not found');
    }

    emergency.status = 'cancelled';
    emergency.resolutionNotes = reason || 'Cancelled by hospital';
    emergency.resolvedAt = new Date();
    await emergency.save();

    // Notify responding donors
    for (const donorEntry of emergency.notifiedDonors) {
      if (donorEntry.responseStatus === 'responding') {
        const notification = new Notification({
          userId: donorEntry.donorUserId,
          type: 'request_closed',
          title: 'Emergency Request Cancelled',
          message: `The emergency request for ${emergency.bloodGroup} blood has been cancelled. Thank you for your willingness to help.`,
          relatedRequestId: emergency._id
        });
        await notification.save();
      }
    }

    sendSuccess(res, 200, 'Emergency cancelled', emergency);
  } catch (error) {
    console.error('Error cancelling emergency:', error);
    sendError(res, 500, 'Error cancelling emergency');
  }
};

// @desc    Get emergency request details
// @route   GET /api/emergency/:id
const getEmergencyDetails = async (req, res) => {
  try {
    const emergency = await EmergencyRequest.findById(req.params.id)
      .populate('hospitalId')
      .populate('notifiedDonors.donorId')
      .populate('notifiedDonors.donorUserId', 'fullName phone email');

    if (!emergency) {
      return sendError(res, 404, 'Emergency request not found');
    }

    sendSuccess(res, 200, 'Emergency details fetched', emergency);
  } catch (error) {
    console.error('Error fetching emergency details:', error);
    sendError(res, 500, 'Error fetching emergency details');
  }
};

module.exports = {
  createEmergencyRequest,
  getActiveEmergencies,
  respondToEmergency,
  markDonorArrived,
  completeEmergencyDonation,
  getHospitalEmergencies,
  cancelEmergency,
  getEmergencyDetails
};
