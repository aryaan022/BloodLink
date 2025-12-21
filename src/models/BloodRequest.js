const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
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
    patientGender: {
      type: String,
      enum: ['M', 'F', 'Other']
    },

    // Request Details
    reason: {
      type: String,
      enum: ['Emergency', 'Surgery', 'Routine', 'Treatment'],
      required: true
    },
    description: String,
    urgencyLevel: {
      type: String,
      enum: ['Normal', 'Urgent', 'Critical'],
      default: 'Normal'
    },

    // Status
    status: {
      type: String,
      enum: ['open', 'in_progress', 'fulfilled', 'closed', 'emergency'],
      default: 'open'
    },

    // Location
    requestLocation: {
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
    locationDetails: String,

    // Timeline
    requiredBy: {
      type: Date,
      required: true
    },
    closedAt: Date,
    fulfilledAt: Date,

    // Interested Donors
    interestedDonors: [
      {
        donorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donor'
        },
        donorUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        status: {
          type: String,
          enum: ['interested', 'accepted', 'rejected', 'completed'],
          default: 'interested'
        },
        interestedAt: Date,
        donationDate: Date
      }
    ],

    // Contact Information
    contactPerson: String,
    contactPhone: String,
    contactEmail: String,

    // Hospital Contact Preference
    allowPublicContact: {
      type: Boolean,
      default: false
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

bloodRequestSchema.index({ hospitalId: 1 });
bloodRequestSchema.index({ bloodGroup: 1 });
bloodRequestSchema.index({ status: 1 });
bloodRequestSchema.index({ 'requestLocation': '2dsphere' });
bloodRequestSchema.index({ urgencyLevel: 1 });
bloodRequestSchema.index({ requiredBy: 1 });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
