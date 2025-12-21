const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema(
  {
    // Link to User
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    // Blood Type
    bloodGroup: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      required: true
    },

    // Donation History
    lastDonationDate: {
      type: Date,
      default: null
    },
    totalDonations: {
      type: Number,
      default: 0
    },
    donationHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DonationHistory'
      }
    ],

    // Donor Status
    isAvailable: {
      type: Boolean,
      default: true
    },

    // Eligibility
    isEligible: {
      type: Boolean,
      default: true
    },

    // Documents/Verification
    idProof: {
      type: String, // File path/URL
      default: null
    },
    bloodTypeProof: {
      type: String, // File path/URL
      default: null
    },
    medicalCertificate: {
      type: String,
      default: null
    },

    // Rating/Trust Score
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    // Gamification - Points & Badges
    totalPoints: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    badges: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonorBadge'
    }],
    
    // Emergency Response Stats
    emergencyResponses: {
      type: Number,
      default: 0
    },
    
    // Streak tracking
    donationStreak: {
      type: Number,
      default: 0
    },
    lastStreakUpdate: {
      type: Date,
      default: null
    },

    // Preferences
    preferredDonationCenters: [String],
    allergies: [String],
    medicalConditions: [String],

    // Notification Preferences
    notificationPreferences: {
      urgentRequests: { type: Boolean, default: true },
      nearbyRequests: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true }
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

donorSchema.index({ userId: 1 });
donorSchema.index({ bloodGroup: 1 });
donorSchema.index({ isAvailable: 1 });
donorSchema.index({ trustScore: -1 });

module.exports = mongoose.model('Donor', donorSchema);
