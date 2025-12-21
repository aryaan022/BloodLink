const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema(
  {
    // Hospital Reference
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true
    },

    // Blood Request Details
    bloodGroup: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      required: true
    },
    unitsNeeded: {
      type: Number,
      required: true,
      min: 1
    },
    unitsFulfilled: {
      type: Number,
      default: 0
    },

    // Patient Information
    patientName: {
      type: String,
      required: true
    },
    patientAge: Number,
    patientCondition: {
      type: String,
      enum: ['Accident', 'Surgery', 'Childbirth', 'Trauma', 'Cancer', 'Other'],
      required: true
    },
    conditionDetails: String,

    // Emergency Level
    emergencyLevel: {
      type: String,
      enum: ['Critical', 'LifeThreatening', 'Urgent'],
      default: 'Critical',
      required: true
    },

    // Time Constraints
    requiredWithin: {
      type: Number, // Minutes
      required: true,
      default: 60
    },
    expiresAt: {
      type: Date,
      required: true
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'responded', 'fulfilled', 'expired', 'cancelled'],
      default: 'active'
    },

    // Location
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    locationAddress: String,

    // Contact Information (for emergency)
    emergencyContact: {
      name: String,
      phone: {
        type: String,
        required: true
      },
      alternatePhone: String
    },

    // Responding Donors
    notifiedDonors: [{
      donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor'
      },
      donorUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      notifiedAt: {
        type: Date,
        default: Date.now
      },
      responseStatus: {
        type: String,
        enum: ['notified', 'viewed', 'responding', 'arrived', 'donated', 'declined', 'no_response'],
        default: 'notified'
      },
      respondedAt: Date,
      estimatedArrival: Number, // minutes
      actualArrivalTime: Date,
      donationCompleted: {
        type: Boolean,
        default: false
      }
    }],

    // Stats
    totalNotified: {
      type: Number,
      default: 0
    },
    totalResponded: {
      type: Number,
      default: 0
    },
    totalArrived: {
      type: Number,
      default: 0
    },

    // Resolution
    resolvedAt: Date,
    resolutionNotes: String,

    // Related Blood Request (if converted from normal request)
    relatedRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest'
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Indexes
emergencyRequestSchema.index({ hospitalId: 1 });
emergencyRequestSchema.index({ bloodGroup: 1 });
emergencyRequestSchema.index({ status: 1 });
emergencyRequestSchema.index({ location: '2dsphere' });
emergencyRequestSchema.index({ expiresAt: 1 });
emergencyRequestSchema.index({ emergencyLevel: 1 });

// Auto-expire emergency requests
emergencyRequestSchema.methods.checkExpiry = function() {
  if (this.status === 'active' && new Date() > this.expiresAt) {
    this.status = 'expired';
    return true;
  }
  return false;
};

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
