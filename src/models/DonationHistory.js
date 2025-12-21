const mongoose = require('mongoose');

const donationHistorySchema = new mongoose.Schema(
  {
    // Donor
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true
    },
    donorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Hospital
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital'
    },

    // Blood Request
    bloodRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest'
    },

    // Donation Details
    bloodGroup: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      required: true
    },
    unitsCollected: {
      type: Number,
      default: 1,
      min: 0.5
    },
    donationDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    // Donation Location
    donationCenter: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },

    // Health Check-up Results
    hemoglobinLevel: Number,
    bloodPressure: String,
    weight: Number,
    temperature: Number,

    // Status
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled', 'deferred'],
      default: 'completed'
    },
    cancellationReason: String,
    deferralReason: String,

    // Emergency Donation Flag
    isEmergency: {
      type: Boolean,
      default: false
    },
    emergencyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyRequest'
    },
    responseTime: {
      type: Number, // Minutes from notification to arrival
      default: null
    },

    // Certificate
    certificateGenerated: {
      type: Boolean,
      default: false
    },
    certificateId: {
      type: String,
      default: null
    },

    // Points awarded for this donation
    pointsAwarded: {
      type: Number,
      default: 0
    },
    badgesAwarded: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonorBadge'
    }],

    // Notes
    notes: String,
    medicalNotes: String,

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

donationHistorySchema.index({ donorId: 1 });
donationHistorySchema.index({ donationDate: -1 });
donationHistorySchema.index({ status: 1 });
donationHistorySchema.index({ bloodGroup: 1 });
donationHistorySchema.index({ isEmergency: 1 });

module.exports = mongoose.model('DonationHistory', donationHistorySchema);
