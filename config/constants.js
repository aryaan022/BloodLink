// Application Constants

// Donor eligibility constants
const DONOR_COOLDOWN_DAYS = 90; // Days between donations

// Blood group compatibility
const BLOOD_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+']
};

// Request urgency levels
const URGENCY_LEVELS = {
  NORMAL: 'Normal',
  URGENT: 'Urgent',
  CRITICAL: 'Critical'
};

// Request statuses
const REQUEST_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  FULFILLED: 'fulfilled',
  CLOSED: 'closed',
  EMERGENCY: 'emergency'
};

module.exports = {
  DONOR_COOLDOWN_DAYS,
  BLOOD_COMPATIBILITY,
  URGENCY_LEVELS,
  REQUEST_STATUS
};