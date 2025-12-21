const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Recipient
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Notification Content
    type: {
      type: String,
      enum: [
        // Request-related notifications
        'urgent_request',
        'request_matched',
        'request_in_progress',
        'request_fulfilled',
        'request_closed',
        
        // Donor-related notifications
        'donor_interest',
        'new_donor_interest',
        'donation_accepted',
        'donation_rejected',
        'donation_completed',
        'donation_reminder',
        
        // General notifications
        'message',
        'system',
        'welcome'
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    description: String,

    // Related Entities
    relatedRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest'
    },
    relatedDonorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor'
    },
    relatedHospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital'
    },

    // Status
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,

    // Notification Channels
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false }
    },

    // Delivery Status
    deliveryStatus: {
      inApp: { type: String, default: 'pending' }, // pending, sent, delivered
      email: { type: String, default: 'pending' },
      sms: { type: String, default: 'pending' },
      whatsapp: { type: String, default: 'pending' }
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

notificationSchema.index({ userId: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
