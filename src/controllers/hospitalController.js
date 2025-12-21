const Hospital = require('../models/Hospital');
const BloodRequest = require('../models/BloodRequest');
const Donor = require('../models/Donor');
const User = require('../models/User');
const Notification = require('../models/Notification');
const DonationHistory = require('../models/DonationHistory');
const { sendSuccess, sendError, calculateDistance } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/emailService');
const { DONOR_COOLDOWN_DAYS } = require('../../config/constants');

// Helper function to get or create hospital profile
const getOrCreateHospital = async (userId) => {
  let hospital = await Hospital.findOne({ userId }).populate('userId');
  
  if (!hospital) {
    // Hospital profile doesn't exist, create one from user data
    const user = await User.findById(userId);
    if (!user || user.userType !== 'hospital') {
      return null;
    }
    
    // Create hospital profile with default values
    hospital = new Hospital({
      userId: user._id,
      hospitalName: user.fullName || 'Hospital',
      licenseNumber: 'LIC-' + Date.now(),
      contactPerson: user.fullName || 'Contact Person',
      contactPhone: user.phone || '0000000000'
    });
    await hospital.save();
    
    // Populate the userId field
    hospital = await Hospital.findById(hospital._id).populate('userId');
    console.log('Auto-created hospital profile for user:', userId);
  }
  
  return hospital;
};

// @desc    Get hospital profile
// @route   GET /api/hospital/profile
const getHospitalProfile = async (req, res) => {
  try {
    const hospital = await getOrCreateHospital(req.user.userId);
    
    if (!hospital) {
      return sendError(res, 404, 'Hospital not found - user may not be a hospital account');
    }

    sendSuccess(res, 200, 'Hospital profile fetched', hospital);
  } catch (error) {
    console.error('Error fetching hospital profile:', error);
    sendError(res, 500, 'Error fetching hospital profile');
  }
};

// @desc    Update hospital profile
// @route   PUT /api/hospital/profile
const updateHospitalProfile = async (req, res) => {
  try {
    const { hospitalName, licenseNumber, contactPerson, contactPhone, website } = req.body;

    const hospital = await Hospital.findOneAndUpdate(
      { userId: req.user.userId },
      { hospitalName, licenseNumber, contactPerson, contactPhone, website },
      { new: true, runValidators: true }
    );

    sendSuccess(res, 200, 'Hospital profile updated', hospital);
  } catch (error) {
    console.error('Error updating hospital profile:', error);
    sendError(res, 500, 'Error updating hospital profile');
  }
};

// @desc    Create a blood request
// @route   POST /api/hospital/requests
const createBloodRequest = async (req, res) => {
  try {
    const {
      bloodGroup,
      unitsNeeded,
      patientName,
      patientAge,
      patientGender,
      reason,
      description,
      urgencyLevel,
      requiredBy,
      locationDetails,
      contactPerson,
      contactPhone,
      contactEmail,
      allowPublicContact
    } = req.body;

    // Validation
    if (!bloodGroup || !unitsNeeded || !patientName || !reason || !requiredBy) {
      return sendError(res, 400, 'All required fields must be filled');
    }

    // Get hospital data to get location (auto-create if doesn't exist)
    const hospital = await getOrCreateHospital(req.user.userId);
    if (!hospital) {
      return sendError(res, 404, 'Hospital not found - please ensure you are logged in as a hospital');
    }

    const user = hospital.userId;

    // Convert allowPublicContact from "on"/string to boolean
    const isPublicContact = allowPublicContact === 'on' || allowPublicContact === true || allowPublicContact === 'true';

    // Convert gender values - form sends 'Male'/'Female' but schema expects 'M'/'F'/'Other'
    let normalizedGender = patientGender;
    if (patientGender === 'Male') normalizedGender = 'M';
    else if (patientGender === 'Female') normalizedGender = 'F';
    else if (patientGender && !['M', 'F', 'Other'].includes(patientGender)) normalizedGender = 'Other';

    // Create blood request
    const bloodRequest = new BloodRequest({
      hospitalId: hospital._id,
      bloodGroup,
      unitsNeeded,
      patientName,
      patientAge,
      patientGender: normalizedGender,
      reason,
      description,
      urgencyLevel: urgencyLevel || 'Normal',
      requiredBy: new Date(requiredBy),
      locationDetails,
      contactPerson,
      contactPhone,
      contactEmail,
      allowPublicContact: isPublicContact,
      requestLocation: {
        type: 'Point',
        coordinates: user.location.coordinates
      },
      status: urgencyLevel === 'Critical' ? 'emergency' : 'open'
    });

    await bloodRequest.save();

    // Update hospital stats
    hospital.activeRequests += 1;
    hospital.totalRequestsPosted += 1;
    await hospital.save();

    // If urgent, notify nearby donors
    if (urgencyLevel === 'Critical' || urgencyLevel === 'Urgent') {
      notifyNearbyDonors(bloodRequest, hospital).catch(err => console.error('Notification error:', err));
    }

    sendSuccess(res, 201, 'Blood request created successfully', bloodRequest);
  } catch (error) {
    console.error('Error creating blood request:', error);
    sendError(res, 500, 'Error creating blood request');
  }
};

// @desc    Get all blood requests for a hospital
// @route   GET /api/hospital/requests
const getHospitalRequests = async (req, res) => {
  try {
    const hospital = await getOrCreateHospital(req.user.userId);
    if (!hospital) {
      return sendError(res, 404, 'Hospital not found');
    }

    const requests = await BloodRequest.find({ hospitalId: hospital._id })
      .sort({ createdAt: -1 })
      .limit(20);

    sendSuccess(res, 200, 'Requests fetched', requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    sendError(res, 500, 'Error fetching requests');
  }
};

// @desc    Get single blood request
// @route   GET /api/hospital/requests/:requestId
const getBloodRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.requestId)
      .populate('hospitalId')
      .populate('interestedDonors.donorUserId');

    if (!request) {
      return sendError(res, 404, 'Request not found');
    }

    sendSuccess(res, 200, 'Request fetched', request);
  } catch (error) {
    console.error('Error fetching request:', error);
    sendError(res, 500, 'Error fetching request');
  }
};

// @desc    Update blood request
// @route   PUT /api/hospital/requests/:requestId
const updateBloodRequest = async (req, res) => {
  try {
    const { bloodGroup, unitsNeeded, urgencyLevel, status, requiredBy } = req.body;

    const request = await BloodRequest.findByIdAndUpdate(
      req.params.requestId,
      {
        bloodGroup,
        unitsNeeded,
        urgencyLevel,
        status,
        requiredBy: requiredBy ? new Date(requiredBy) : undefined
      },
      { new: true, runValidators: true }
    );

    if (!request) {
      return sendError(res, 404, 'Request not found');
    }

    sendSuccess(res, 200, 'Request updated', request);
  } catch (error) {
    console.error('Error updating request:', error);
    sendError(res, 500, 'Error updating request');
  }
};

// @desc    Close/Complete blood request
// @route   PUT /api/hospital/requests/:requestId/close
const closeBloodRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findByIdAndUpdate(
      req.params.requestId,
      {
        status: 'closed',
        closedAt: new Date()
      },
      { new: true }
    );

    if (!request) {
      return sendError(res, 404, 'Request not found');
    }

    // Update hospital stats
    const hospital = await Hospital.findById(request.hospitalId);
    if (hospital) {
      hospital.activeRequests -= 1;
      if (request.status === 'fulfilled') {
        hospital.totalRequestsFulfilled += 1;
      }
      await hospital.save();
    }

    sendSuccess(res, 200, 'Request closed', request);
  } catch (error) {
    console.error('Error closing request:', error);
    sendError(res, 500, 'Error closing request');
  }
};

// @desc    Update blood stock
// @route   PUT /api/hospital/blood-stock
const updateBloodStock = async (req, res) => {
  try {
    const { bloodStock } = req.body;

    const hospital = await Hospital.findOneAndUpdate(
      { userId: req.user.userId },
      { bloodStock },
      { new: true, runValidators: true }
    );

    sendSuccess(res, 200, 'Blood stock updated', hospital);
  } catch (error) {
    console.error('Error updating blood stock:', error);
    sendError(res, 500, 'Error updating blood stock');
  }
};

// @desc    Search donors by blood group and distance
// @route   GET /api/hospital/search-donors
const searchDonors = async (req, res) => {
  try {
    const { bloodGroup, maxDistance = 50 } = req.query;

    if (!bloodGroup) {
      return sendError(res, 400, 'Blood group is required');
    }

    const hospital = await getOrCreateHospital(req.user.userId);
    if (!hospital) {
      return sendError(res, 404, 'Hospital not found');
    }

    // Find donors with matching blood group
    const donors = await Donor.find({
      bloodGroup,
      isAvailable: true,
      isEligible: true
    }).populate('userId');

    // Filter by distance
    const nearbyDonors = donors.filter(donor => {
      const distance = calculateDistance(
        hospital.userId.location.coordinates[1],
        hospital.userId.location.coordinates[0],
        donor.userId.location.coordinates[1],
        donor.userId.location.coordinates[0]
      );
      return distance <= maxDistance;
    });

    sendSuccess(res, 200, 'Donors found', nearbyDonors);
  } catch (error) {
    console.error('Error searching donors:', error);
    sendError(res, 500, 'Error searching donors');
  }
};

// Helper function to notify nearby donors
const notifyNearbyDonors = async (bloodRequest, hospital) => {
  try {
    const donors = await Donor.find({
      bloodGroup: bloodRequest.bloodGroup,
      isAvailable: true,
      isEligible: true,
      'notificationPreferences.urgentRequests': true
    }).populate('userId');

    for (let donor of donors) {
      const distance = calculateDistance(
        hospital.userId.location.coordinates[1],
        hospital.userId.location.coordinates[0],
        donor.userId.location.coordinates[1],
        donor.userId.location.coordinates[0]
      );

      // Notify if within 50 km
      if (distance <= 50) {
        // Create notification
        const notification = new Notification({
          userId: donor.userId._id,
          type: 'urgent_request',
          title: `🚨 Urgent Blood Request`,
          message: `${hospital.hospitalName} urgently needs ${bloodRequest.bloodGroup}`,
          relatedRequestId: bloodRequest._id,
          relatedHospitalId: hospital._id,
          relatedDonorId: donor._id
        });
        await notification.save();

        // Send email if enabled
        if (donor.notificationPreferences.email) {
          await sendEmail(
            donor.userId.email,
            'Urgent Blood Request',
            emailTemplates.urgentRequestNotification(
              hospital.hospitalName,
              bloodRequest.bloodGroup,
              bloodRequest.unitsNeeded,
              bloodRequest.requiredBy
            )
          );
        }
      }
    }
  } catch (error) {
    console.error('Error notifying donors:', error);
  }
};

// @desc    Update donor status for a blood request
// @route   PUT /api/hospital/requests/:requestId/donor-status
const updateDonorStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { donorUserId, status } = req.body;

    if (!donorUserId || !status) {
      return sendError(res, 400, 'Donor user ID and status are required');
    }

    if (!['interested', 'accepted', 'rejected', 'completed'].includes(status)) {
      return sendError(res, 400, 'Invalid status. Must be interested, accepted, rejected, or completed');
    }

    const bloodRequest = await BloodRequest.findById(requestId);
    if (!bloodRequest) {
      return sendError(res, 404, 'Blood request not found');
    }

    // Find the donor in the interested donors array
    const donorIndex = bloodRequest.interestedDonors.findIndex(
      d => d.donorUserId.toString() === donorUserId
    );

    if (donorIndex === -1) {
      return sendError(res, 404, 'Donor not found in interested donors');
    }

    // Update the status
    bloodRequest.interestedDonors[donorIndex].status = status;
    
    // If completed, record donation date
    if (status === 'completed') {
      bloodRequest.interestedDonors[donorIndex].donationDate = new Date();
    }
    
    await bloodRequest.save();

    // Get hospital info for notifications
    const hospital = await Hospital.findById(bloodRequest.hospitalId);

    // Create appropriate notification based on status
    if (status === 'accepted') {
      const notification = new Notification({
        userId: donorUserId,
        type: 'donation_accepted',
        title: '✅ Donation Request Accepted',
        message: `${hospital?.hospitalName || 'A hospital'} has accepted your donation offer for ${bloodRequest.bloodGroup} blood. Please visit the hospital.`,
        relatedRequestId: bloodRequest._id,
        relatedHospitalId: bloodRequest.hospitalId
      });
      await notification.save();
    } else if (status === 'rejected') {
      const notification = new Notification({
        userId: donorUserId,
        type: 'donation_rejected',
        title: '❌ Donation Request Declined',
        message: `${hospital?.hospitalName || 'A hospital'} has declined your donation offer for ${bloodRequest.bloodGroup} blood.`,
        relatedRequestId: bloodRequest._id,
        relatedHospitalId: bloodRequest.hospitalId
      });
      await notification.save();
    }

    sendSuccess(res, 200, `Donor ${status} successfully`, bloodRequest);
  } catch (error) {
    console.error('Error updating donor status:', error);
    sendError(res, 500, 'Error updating donor status');
  }
};

// @desc    Update request status (in_progress, fulfilled, closed)
// @route   PUT /api/hospital/requests/:requestId/status
const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 400, 'Status is required');
    }

    if (!['open', 'in_progress', 'fulfilled', 'closed', 'emergency'].includes(status)) {
      return sendError(res, 400, 'Invalid status');
    }

    const updateData = { status };
    
    if (status === 'closed') {
      updateData.closedAt = new Date();
    } else if (status === 'fulfilled') {
      updateData.fulfilledAt = new Date();
    }

    const request = await BloodRequest.findByIdAndUpdate(
      requestId,
      updateData,
      { new: true }
    );

    if (!request) {
      return sendError(res, 404, 'Request not found');
    }

    // Update hospital stats
    const hospital = await Hospital.findById(request.hospitalId);
    if (hospital) {
      if (status === 'closed' || status === 'fulfilled') {
        hospital.activeRequests = Math.max(0, hospital.activeRequests - 1);
      }
      if (status === 'fulfilled') {
        hospital.totalRequestsFulfilled += 1;
      }
      await hospital.save();
    }

    // Notify interested donors about status change
    if (request.interestedDonors && request.interestedDonors.length > 0) {
      for (const donor of request.interestedDonors) {
        let notifType, notifTitle, notifMessage;
        
        if (status === 'in_progress') {
          notifType = 'request_in_progress';
          notifTitle = '🔄 Request In Progress';
          notifMessage = `The blood request for ${request.bloodGroup} is now in progress.`;
        } else if (status === 'fulfilled') {
          notifType = 'request_fulfilled';
          notifTitle = '🎉 Request Fulfilled';
          notifMessage = `The blood request for ${request.bloodGroup} has been fulfilled. Thank you for your help!`;
        } else if (status === 'closed') {
          notifType = 'request_closed';
          notifTitle = '📋 Request Closed';
          notifMessage = `The blood request for ${request.bloodGroup} has been closed.`;
        }

        if (notifType) {
          const notification = new Notification({
            userId: donor.donorUserId,
            type: notifType,
            title: notifTitle,
            message: notifMessage,
            relatedRequestId: request._id,
            relatedHospitalId: request.hospitalId
          });
          await notification.save();
        }
      }
    }

    sendSuccess(res, 200, `Request status updated to ${status}`, request);
  } catch (error) {
    console.error('Error updating request status:', error);
    sendError(res, 500, 'Error updating request status');
  }
};

// @desc    Mark donation as completed and update donor eligibility
// @route   PUT /api/hospital/requests/:requestId/complete-donation
const completeDonation = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { donorUserId, unitsCollected = 1, notes } = req.body;

    if (!donorUserId) {
      return sendError(res, 400, 'Donor user ID is required');
    }

    const bloodRequest = await BloodRequest.findById(requestId);
    if (!bloodRequest) {
      return sendError(res, 404, 'Blood request not found');
    }

    // Find donor in the request
    const donorIndex = bloodRequest.interestedDonors.findIndex(
      d => d.donorUserId.toString() === donorUserId
    );

    if (donorIndex === -1) {
      return sendError(res, 404, 'Donor not found in this request');
    }

    // Get donor profile
    const donor = await Donor.findOne({ userId: donorUserId });
    if (!donor) {
      return sendError(res, 404, 'Donor profile not found');
    }

    const hospital = await Hospital.findById(bloodRequest.hospitalId);
    const user = await User.findById(donorUserId);

    // Create donation history record
    const donationRecord = new DonationHistory({
      donorId: donor._id,
      donorUserId: donorUserId,
      hospitalId: bloodRequest.hospitalId,
      bloodRequestId: bloodRequest._id,
      bloodGroup: bloodRequest.bloodGroup,
      unitsCollected: unitsCollected,
      donationDate: new Date(),
      donationCenter: hospital?.hospitalName || 'Hospital',
      location: {
        type: 'Point',
        coordinates: bloodRequest.requestLocation?.coordinates || [0, 0]
      },
      status: 'completed',
      notes: notes
    });

    await donationRecord.save();

    // Update donor statistics and eligibility
    donor.lastDonationDate = new Date();
    donor.totalDonations += 1;
    donor.isEligible = false; // Mark as not eligible (need to wait cooldown period)
    
    // Add to donation history
    if (!donor.donationHistory) {
      donor.donationHistory = [];
    }
    donor.donationHistory.push(donationRecord._id);
    
    // Increase trust score
    donor.trustScore = Math.min(100, (donor.trustScore || 0) + 5);
    
    await donor.save();

    // Update blood request
    bloodRequest.interestedDonors[donorIndex].status = 'completed';
    bloodRequest.interestedDonors[donorIndex].donationDate = new Date();
    bloodRequest.unitsFulfilled = (bloodRequest.unitsFulfilled || 0) + unitsCollected;
    
    // Check if request is fulfilled
    if (bloodRequest.unitsFulfilled >= bloodRequest.unitsNeeded) {
      bloodRequest.status = 'fulfilled';
      bloodRequest.fulfilledAt = new Date();
      
      // Update hospital stats
      if (hospital) {
        hospital.activeRequests = Math.max(0, hospital.activeRequests - 1);
        hospital.totalRequestsFulfilled += 1;
        await hospital.save();
      }
    }

    await bloodRequest.save();

    // Calculate next eligible date
    const nextEligibleDate = new Date();
    nextEligibleDate.setDate(nextEligibleDate.getDate() + (DONOR_COOLDOWN_DAYS || 56));

    // Notify donor
    const notification = new Notification({
      userId: donorUserId,
      type: 'donation_completed',
      title: '🩸 Donation Completed - Thank You!',
      message: `Your blood donation at ${hospital?.hospitalName || 'the hospital'} has been recorded. You've helped save lives! You'll be eligible to donate again on ${nextEligibleDate.toLocaleDateString()}.`,
      relatedRequestId: bloodRequest._id,
      relatedHospitalId: bloodRequest.hospitalId,
      relatedDonorId: donor._id
    });
    await notification.save();

    // Send email if available
    if (user?.email) {
      try {
        await sendEmail(
          user.email,
          'Thank You for Your Blood Donation!',
          `
          <h2>Thank You for Donating Blood!</h2>
          <p>Dear ${user.fullName || 'Donor'},</p>
          <p>Your blood donation has been successfully recorded. You've made a real difference in someone's life!</p>
          <p><strong>Donation Details:</strong></p>
          <ul>
            <li>Date: ${new Date().toLocaleDateString()}</li>
            <li>Hospital: ${hospital?.hospitalName || 'Hospital'}</li>
            <li>Blood Group: ${bloodRequest.bloodGroup}</li>
            <li>Units: ${unitsCollected}</li>
          </ul>
          <p><strong>Next Eligible Donation Date:</strong> ${nextEligibleDate.toLocaleDateString()}</p>
          <p>Thank you for being a hero!</p>
          `
        );
      } catch (emailError) {
        console.error('Error sending donation email:', emailError);
      }
    }

    sendSuccess(res, 200, 'Donation completed successfully', {
      donationRecord,
      nextEligibleDate,
      totalDonations: donor.totalDonations,
      bloodRequest
    });
  } catch (error) {
    console.error('Error completing donation:', error);
    sendError(res, 500, 'Error completing donation');
  }
};

module.exports = {
  getHospitalProfile,
  updateHospitalProfile,
  createBloodRequest,
  getHospitalRequests,
  getBloodRequest,
  updateBloodRequest,
  closeBloodRequest,
  updateBloodStock,
  searchDonors,
  updateDonorStatus,
  updateRequestStatus,
  completeDonation
};
