const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { sendSuccess, sendError, calculateDistance } = require('../utils/helpers');

// @desc    Get all active blood requests (public)
// @route   GET /api/public/requests
const getAllRequests = async (req, res) => {
  try {
    const { bloodGroup, city, urgencyLevel, maxDistance } = req.query;
    let query = { status: { $in: ['open', 'in_progress', 'emergency'] } };

    // Filter by blood group
    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }

    // Filter by urgency
    if (urgencyLevel) {
      query.urgencyLevel = urgencyLevel;
    }

    const requests = await BloodRequest.find(query)
      .populate('hospitalId')
      .sort({ urgencyLevel: -1, createdAt: -1 })
      .limit(20);

    sendSuccess(res, 200, 'All requests fetched', requests);
  } catch (error) {
    console.error('Error fetching all requests:', error);
    sendError(res, 500, 'Error fetching requests');
  }
};

// @desc    Get single blood request details (public)
// @route   GET /api/public/requests/:requestId
const getRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.requestId)
      .populate('hospitalId')
      .populate('interestedDonors.donorUserId');

    if (!request) {
      return sendError(res, 404, 'Request not found');
    }

    sendSuccess(res, 200, 'Request details fetched', request);
  } catch (error) {
    console.error('Error fetching request:', error);
    sendError(res, 500, 'Error fetching request');
  }
};

// @desc    Search blood requests with filters (public)
// @route   GET /api/public/search-requests
const searchRequests = async (req, res) => {
  try {
    const { bloodGroup, urgencyLevel, hospital, city } = req.query;
    const query = { status: { $in: ['open', 'emergency'] } };

    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (urgencyLevel) query.urgencyLevel = urgencyLevel;
    if (hospital) {
      const hospitalDoc = await Hospital.findOne({ hospitalName: { $regex: hospital, $options: 'i' } });
      if (hospitalDoc) query.hospitalId = hospitalDoc._id;
    }

    const requests = await BloodRequest.find(query)
      .populate('hospitalId')
      .sort({ urgencyLevel: -1, createdAt: -1 });

    sendSuccess(res, 200, 'Search results', requests);
  } catch (error) {
    console.error('Error searching requests:', error);
    sendError(res, 500, 'Error searching requests');
  }
};

// @desc    Get blood availability in hospitals (public)
// @route   GET /api/public/blood-availability
const getBloodAvailability = async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;
    let query = {};

    if (bloodGroup) {
      query[`bloodStock.${bloodGroup}`] = { $gt: 0 };
    }

    if (city) {
      query.city = city;
    }

    const hospitals = await Hospital.find(query)
      .select('hospitalName bloodStock address city contactPhone')
      .limit(20);

    const availability = hospitals.map(h => ({
      hospital: h.hospitalName,
      address: h.address,
      city: h.city,
      contact: h.contactPhone,
      bloodStock: { [bloodGroup]: h.bloodStock[bloodGroup] }
    }));

    sendSuccess(res, 200, 'Blood availability fetched', availability);
  } catch (error) {
    console.error('Error fetching blood availability:', error);
    sendError(res, 500, 'Error fetching blood availability');
  }
};

module.exports = {
  getAllRequests,
  getRequest,
  searchRequests,
  getBloodAvailability
};
