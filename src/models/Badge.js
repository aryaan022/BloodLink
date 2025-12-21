const mongoose = require('mongoose');

// Badge definitions - all possible badges
const badgeDefinitions = [
  {
    id: 'first_donation',
    name: 'First Drop',
    description: 'Completed your first blood donation',
    icon: '🩸',
    category: 'milestone',
    requirement: { type: 'donations', count: 1 },
    points: 100
  },
  {
    id: 'five_donations',
    name: 'Life Saver',
    description: 'Completed 5 blood donations',
    icon: '💖',
    category: 'milestone',
    requirement: { type: 'donations', count: 5 },
    points: 500
  },
  {
    id: 'ten_donations',
    name: 'Blood Champion',
    description: 'Completed 10 blood donations',
    icon: '🏆',
    category: 'milestone',
    requirement: { type: 'donations', count: 10 },
    points: 1000
  },
  {
    id: 'twenty_donations',
    name: 'Legendary Donor',
    description: 'Completed 20 blood donations',
    icon: '👑',
    category: 'milestone',
    requirement: { type: 'donations', count: 20 },
    points: 2500
  },
  {
    id: 'fifty_donations',
    name: 'Blood Hero',
    description: 'Completed 50 blood donations - A true hero!',
    icon: '🦸',
    category: 'milestone',
    requirement: { type: 'donations', count: 50 },
    points: 5000
  },
  {
    id: 'emergency_responder',
    name: 'Emergency Responder',
    description: 'Responded to an emergency blood request',
    icon: '🚨',
    category: 'special',
    requirement: { type: 'emergency', count: 1 },
    points: 300
  },
  {
    id: 'emergency_hero',
    name: 'Emergency Hero',
    description: 'Responded to 5 emergency blood requests',
    icon: '⚡',
    category: 'special',
    requirement: { type: 'emergency', count: 5 },
    points: 1500
  },
  {
    id: 'rare_blood',
    name: 'Rare Gem',
    description: 'Donated rare blood type (O-, AB-, B-, A-)',
    icon: '💎',
    category: 'special',
    requirement: { type: 'rare_blood', count: 1 },
    points: 200
  },
  {
    id: 'universal_donor',
    name: 'Universal Hero',
    description: 'O- blood type - The universal donor',
    icon: '🌟',
    category: 'special',
    requirement: { type: 'blood_type', value: 'O-' },
    points: 250
  },
  {
    id: 'consistent_donor',
    name: 'Consistent Donor',
    description: 'Donated in 3 consecutive eligible periods',
    icon: '📅',
    category: 'streak',
    requirement: { type: 'streak', count: 3 },
    points: 400
  },
  {
    id: 'yearly_champion',
    name: 'Yearly Champion',
    description: 'Donated 4 times in a calendar year (maximum possible)',
    icon: '🎯',
    category: 'streak',
    requirement: { type: 'yearly', count: 4 },
    points: 800
  },
  {
    id: 'quick_responder',
    name: 'Quick Responder',
    description: 'Responded to a request within 1 hour',
    icon: '⏱️',
    category: 'special',
    requirement: { type: 'response_time', hours: 1 },
    points: 150
  },
  {
    id: 'community_builder',
    name: 'Community Builder',
    description: 'Helped at 3 different hospitals',
    icon: '🏥',
    category: 'special',
    requirement: { type: 'hospitals', count: 3 },
    points: 350
  },
  {
    id: 'verified_donor',
    name: 'Verified Donor',
    description: 'Completed ID verification',
    icon: '✅',
    category: 'trust',
    requirement: { type: 'verification', value: true },
    points: 100
  }
];

// Donor Badge Schema - tracks which badges a donor has earned
const donorBadgeSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true
    },
    
    badgeId: {
      type: String,
      required: true
    },
    
    name: {
      type: String,
      required: true
    },
    
    description: String,
    
    icon: {
      type: String,
      default: '🏅'
    },
    
    category: {
      type: String,
      enum: ['milestone', 'special', 'streak', 'trust'],
      default: 'milestone'
    },
    
    points: {
      type: Number,
      default: 0
    },
    
    earnedAt: {
      type: Date,
      default: Date.now
    },
    
    // For special badges, track what triggered it
    earnedFor: {
      donationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DonationHistory'
      },
      requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BloodRequest'
      },
      description: String
    }
  },
  { timestamps: true }
);

// Indexes
donorBadgeSchema.index({ donorId: 1 });
donorBadgeSchema.index({ badgeId: 1 });
donorBadgeSchema.index({ donorId: 1, badgeId: 1 }, { unique: true });

// Static method to get all badge definitions
donorBadgeSchema.statics.getBadgeDefinitions = function() {
  return badgeDefinitions;
};

// Static method to get a specific badge definition
donorBadgeSchema.statics.getBadgeDefinition = function(badgeId) {
  return badgeDefinitions.find(b => b.id === badgeId);
};

// Static method to check and award badges for a donor
donorBadgeSchema.statics.checkAndAwardBadges = async function(donorId, context = {}) {
  const Donor = mongoose.model('Donor');
  const DonationHistory = mongoose.model('DonationHistory');
  
  const donor = await Donor.findById(donorId).populate('userId');
  if (!donor) return [];
  
  const existingBadges = await this.find({ donorId });
  const existingBadgeIds = existingBadges.map(b => b.badgeId);
  const newBadges = [];
  
  // Get donation stats
  const totalDonations = await DonationHistory.countDocuments({ 
    donorId, 
    status: 'completed' 
  });
  
  const emergencyDonations = await DonationHistory.countDocuments({
    donorId,
    status: 'completed',
    isEmergency: true
  });
  
  // Get unique hospitals donated to
  const uniqueHospitals = await DonationHistory.distinct('hospitalId', { 
    donorId, 
    status: 'completed' 
  });
  
  // Check each badge
  for (const badge of badgeDefinitions) {
    // Skip if already earned
    if (existingBadgeIds.includes(badge.id)) continue;
    
    let earned = false;
    
    switch (badge.requirement.type) {
      case 'donations':
        earned = totalDonations >= badge.requirement.count;
        break;
        
      case 'emergency':
        earned = emergencyDonations >= badge.requirement.count;
        break;
        
      case 'rare_blood':
        const rareTypes = ['O-', 'AB-', 'B-', 'A-'];
        earned = rareTypes.includes(donor.bloodGroup) && totalDonations >= badge.requirement.count;
        break;
        
      case 'blood_type':
        earned = donor.bloodGroup === badge.requirement.value;
        break;
        
      case 'hospitals':
        earned = uniqueHospitals.length >= badge.requirement.count;
        break;
        
      case 'verification':
        earned = donor.idProof !== null;
        break;
        
      // Streak and yearly badges need more complex logic
      case 'streak':
      case 'yearly':
        // These will be checked separately with more context
        break;
    }
    
    if (earned) {
      const newBadge = new this({
        donorId,
        badgeId: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        points: badge.points,
        earnedFor: {
          donationId: context.donationId,
          requestId: context.requestId,
          description: context.description
        }
      });
      
      await newBadge.save();
      newBadges.push(newBadge);
      
      // Update donor total points
      await Donor.findByIdAndUpdate(donorId, {
        $inc: { totalPoints: badge.points }
      });
    }
  }
  
  return newBadges;
};

module.exports = mongoose.model('DonorBadge', donorBadgeSchema);
module.exports.badgeDefinitions = badgeDefinitions;
