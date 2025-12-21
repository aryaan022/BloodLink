const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    // Link to User
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    // Hospital Details
    hospitalName: {
      type: String,
      required: true
    },
    registrationNumber: {
      type: String,
      default: function() {
        return 'REG' + Date.now();
      },
      unique: true
    },
    licenseNumber: {
      type: String,
      required: true
    },

    // Hospital Documents
    licenseDocument: {
      type: String, // File path/URL
      default: null
    },
    registrationDocument: {
      type: String,
      default: null
    },

    // Contact
    contactPerson: {
      type: String,
      required: true
    },
    contactPhone: {
      type: String,
      required: true
    },
    website: String,

    // Blood Bank Stock
    bloodStock: {
      'O+': { type: Number, default: 0 },
      'O-': { type: Number, default: 0 },
      'A+': { type: Number, default: 0 },
      'A-': { type: Number, default: 0 },
      'B+': { type: Number, default: 0 },
      'B-': { type: Number, default: 0 },
      'AB+': { type: Number, default: 0 },
      'AB-': { type: Number, default: 0 }
    },

    // Blood Requests Posted
    activeRequests: {
      type: Number,
      default: 0
    },
    totalRequestsPosted: {
      type: Number,
      default: 0
    },
    totalRequestsFulfilled: {
      type: Number,
      default: 0
    },

    // Verification
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,

    // Rating/Trust
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },

    // Status
    isActive: {
      type: Boolean,
      default: true
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

hospitalSchema.index({ userId: 1 });
hospitalSchema.index({ registrationNumber: 1 });
hospitalSchema.index({ isVerified: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
