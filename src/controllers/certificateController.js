const DonationHistory = require('../models/DonationHistory');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/helpers');
const crypto = require('crypto');

// Generate unique certificate ID
const generateCertificateId = () => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `BL-CERT-${timestamp}-${random}`.toUpperCase();
};

// @desc    Generate certificate for a donation
// @route   POST /api/certificate/generate/:donationId
const generateCertificate = async (req, res) => {
  try {
    const { donationId } = req.params;

    const donation = await DonationHistory.findById(donationId)
      .populate('hospitalId')
      .populate('donorUserId');

    if (!donation) {
      return sendError(res, 404, 'Donation record not found');
    }

    // Verify the donation belongs to the requesting user
    if (donation.donorUserId._id.toString() !== req.user.userId) {
      return sendError(res, 403, 'Unauthorized to generate certificate for this donation');
    }

    if (donation.status !== 'completed') {
      return sendError(res, 400, 'Certificate can only be generated for completed donations');
    }

    // Generate certificate ID if not already generated
    if (!donation.certificateId) {
      donation.certificateId = generateCertificateId();
      donation.certificateGenerated = true;
      await donation.save();
    }

    // Get donor details
    const donor = await Donor.findOne({ userId: req.user.userId });
    const user = donation.donorUserId;
    const hospital = donation.hospitalId;

    // Create certificate data
    const certificateData = {
      certificateId: donation.certificateId,
      donorName: user.fullName,
      bloodGroup: donation.bloodGroup,
      unitsCollected: donation.unitsCollected,
      donationDate: donation.donationDate,
      hospitalName: hospital ? hospital.hospitalName : donation.donationCenter || 'Blood Bank',
      hospitalAddress: hospital?.userId?.address || '',
      isEmergency: donation.isEmergency,
      totalDonations: donor ? donor.totalDonations : 1,
      pointsAwarded: donation.pointsAwarded || 0,
      generatedAt: new Date()
    };

    sendSuccess(res, 200, 'Certificate data generated', certificateData);
  } catch (error) {
    console.error('Error generating certificate:', error);
    sendError(res, 500, 'Error generating certificate');
  }
};

// @desc    Get certificate by ID (for verification)
// @route   GET /api/certificate/verify/:certificateId
const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const donation = await DonationHistory.findOne({ certificateId })
      .populate('hospitalId')
      .populate('donorUserId', 'fullName');

    if (!donation) {
      return sendError(res, 404, 'Certificate not found or invalid');
    }

    const certificateData = {
      isValid: true,
      certificateId: donation.certificateId,
      donorName: donation.donorUserId?.fullName || 'Anonymous Donor',
      bloodGroup: donation.bloodGroup,
      donationDate: donation.donationDate,
      hospitalName: donation.hospitalId?.hospitalName || donation.donationCenter,
      verifiedAt: new Date()
    };

    sendSuccess(res, 200, 'Certificate verified', certificateData);
  } catch (error) {
    console.error('Error verifying certificate:', error);
    sendError(res, 500, 'Error verifying certificate');
  }
};

// @desc    Get all certificates for a donor
// @route   GET /api/certificate/my-certificates
const getMyCertificates = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.userId });

    if (!donor) {
      return sendError(res, 404, 'Donor not found');
    }

    const donations = await DonationHistory.find({
      donorId: donor._id,
      status: 'completed'
    })
      .populate('hospitalId')
      .sort({ donationDate: -1 });

    const certificates = donations.map(donation => ({
      donationId: donation._id,
      certificateId: donation.certificateId,
      certificateGenerated: donation.certificateGenerated,
      bloodGroup: donation.bloodGroup,
      unitsCollected: donation.unitsCollected,
      donationDate: donation.donationDate,
      hospitalName: donation.hospitalId?.hospitalName || donation.donationCenter || 'Blood Bank',
      isEmergency: donation.isEmergency,
      pointsAwarded: donation.pointsAwarded || 0
    }));

    sendSuccess(res, 200, 'Certificates fetched', certificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    sendError(res, 500, 'Error fetching certificates');
  }
};

// @desc    Download certificate as PDF (returns HTML for client-side PDF generation)
// @route   GET /api/certificate/download/:donationId
const downloadCertificate = async (req, res) => {
  try {
    const { donationId } = req.params;

    const donation = await DonationHistory.findById(donationId)
      .populate('hospitalId')
      .populate('donorUserId');

    if (!donation) {
      return sendError(res, 404, 'Donation record not found');
    }

    // Verify the donation belongs to the requesting user
    if (donation.donorUserId._id.toString() !== req.user.userId) {
      return sendError(res, 403, 'Unauthorized');
    }

    // Generate certificate ID if not exists
    if (!donation.certificateId) {
      donation.certificateId = generateCertificateId();
      donation.certificateGenerated = true;
      await donation.save();
    }

    const donor = await Donor.findOne({ userId: req.user.userId });
    const user = donation.donorUserId;
    const hospital = donation.hospitalId;

    // Generate HTML template for certificate
    const certificateHTML = generateCertificateHTML({
      certificateId: donation.certificateId,
      donorName: user.fullName,
      bloodGroup: donation.bloodGroup,
      unitsCollected: donation.unitsCollected,
      donationDate: donation.donationDate,
      hospitalName: hospital ? hospital.hospitalName : donation.donationCenter || 'Blood Bank',
      isEmergency: donation.isEmergency,
      totalDonations: donor ? donor.totalDonations : 1
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(certificateHTML);
  } catch (error) {
    console.error('Error downloading certificate:', error);
    sendError(res, 500, 'Error downloading certificate');
  }
};

// Generate certificate HTML template
const generateCertificateHTML = (data) => {
  const formattedDate = new Date(data.donationDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blood Donation Certificate - ${data.certificateId}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .certificate {
            width: 800px;
            background: linear-gradient(145deg, #fefefe 0%, #f5f5f5 100%);
            border-radius: 20px;
            padding: 40px;
            position: relative;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
            overflow: hidden;
        }
        
        .certificate::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 8px;
            background: linear-gradient(90deg, #e74c3c, #c0392b, #e74c3c);
        }
        
        .border-design {
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 2px solid rgba(231, 76, 60, 0.3);
            border-radius: 15px;
            pointer-events: none;
        }
        
        .corner-design {
            position: absolute;
            width: 60px;
            height: 60px;
            border: 3px solid #e74c3c;
        }
        
        .corner-design.top-left {
            top: 30px;
            left: 30px;
            border-right: none;
            border-bottom: none;
            border-radius: 15px 0 0 0;
        }
        
        .corner-design.top-right {
            top: 30px;
            right: 30px;
            border-left: none;
            border-bottom: none;
            border-radius: 0 15px 0 0;
        }
        
        .corner-design.bottom-left {
            bottom: 30px;
            left: 30px;
            border-right: none;
            border-top: none;
            border-radius: 0 0 0 15px;
        }
        
        .corner-design.bottom-right {
            bottom: 30px;
            right: 30px;
            border-left: none;
            border-top: none;
            border-radius: 0 0 15px 0;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
            z-index: 1;
        }
        
        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .logo-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
        }
        
        .logo-text {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            font-weight: 700;
            color: #1a1a2e;
        }
        
        .title {
            font-family: 'Playfair Display', serif;
            font-size: 36px;
            color: #1a1a2e;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 4px;
        }
        
        .subtitle {
            color: #666;
            font-size: 14px;
            letter-spacing: 2px;
        }
        
        .content {
            text-align: center;
            padding: 20px 40px;
            position: relative;
            z-index: 1;
        }
        
        .presented-to {
            font-size: 14px;
            color: #888;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .donor-name {
            font-family: 'Playfair Display', serif;
            font-size: 42px;
            color: #e74c3c;
            margin-bottom: 20px;
            font-weight: 700;
        }
        
        .message {
            font-size: 16px;
            color: #444;
            line-height: 1.8;
            max-width: 600px;
            margin: 0 auto 30px;
        }
        
        .details {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 30px 0;
        }
        
        .detail-item {
            background: linear-gradient(135deg, rgba(231, 76, 60, 0.1), rgba(192, 57, 43, 0.05));
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(231, 76, 60, 0.2);
        }
        
        .detail-label {
            font-size: 12px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
        }
        
        .detail-value {
            font-size: 18px;
            color: #1a1a2e;
            font-weight: 600;
        }
        
        .blood-group {
            font-size: 24px;
            color: #e74c3c;
        }
        
        ${data.isEmergency ? `
        .emergency-badge {
            display: inline-block;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 20px;
        }
        ` : ''}
        
        .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 1;
        }
        
        .signature {
            text-align: center;
        }
        
        .signature-line {
            width: 180px;
            height: 1px;
            background: #333;
            margin-bottom: 8px;
        }
        
        .signature-text {
            font-size: 12px;
            color: #666;
        }
        
        .certificate-id {
            text-align: right;
        }
        
        .cert-id-label {
            font-size: 10px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .cert-id-value {
            font-size: 12px;
            color: #333;
            font-family: monospace;
            margin-top: 5px;
        }
        
        .qr-placeholder {
            width: 80px;
            height: 80px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #999;
        }
        
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 120px;
            color: rgba(231, 76, 60, 0.03);
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            pointer-events: none;
            white-space: nowrap;
        }
        
        .print-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 30px;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .print-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 30px rgba(231, 76, 60, 0.5);
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .certificate {
                box-shadow: none;
                border: 1px solid #ddd;
            }
            
            .print-btn {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="border-design"></div>
        <div class="corner-design top-left"></div>
        <div class="corner-design top-right"></div>
        <div class="corner-design bottom-left"></div>
        <div class="corner-design bottom-right"></div>
        <div class="watermark">BloodLink</div>
        
        <div class="header">
            <div class="logo">
                <div class="logo-icon">🩸</div>
                <span class="logo-text">BloodLink</span>
            </div>
            <h1 class="title">Certificate of Appreciation</h1>
            <p class="subtitle">Blood Donation Recognition</p>
        </div>
        
        <div class="content">
            ${data.isEmergency ? '<div class="emergency-badge">⚡ Emergency Responder</div>' : ''}
            
            <p class="presented-to">This certificate is proudly presented to</p>
            <h2 class="donor-name">${data.donorName}</h2>
            
            <p class="message">
                In recognition of your selfless act of donating blood, you have helped save lives 
                and made a meaningful difference in our community. Your generosity and compassion 
                inspire us all. Thank you for being a hero!
            </p>
            
            <div class="details">
                <div class="detail-item">
                    <p class="detail-label">Blood Group</p>
                    <p class="detail-value blood-group">${data.bloodGroup}</p>
                </div>
                <div class="detail-item">
                    <p class="detail-label">Units Donated</p>
                    <p class="detail-value">${data.unitsCollected} Unit(s)</p>
                </div>
                <div class="detail-item">
                    <p class="detail-label">Donation Date</p>
                    <p class="detail-value">${formattedDate}</p>
                </div>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Donated at <strong>${data.hospitalName}</strong>
                ${data.totalDonations > 1 ? `<br><span style="color: #e74c3c;">Total Lifetime Donations: ${data.totalDonations}</span>` : ''}
            </p>
        </div>
        
        <div class="footer">
            <div class="signature">
                <div class="signature-line"></div>
                <p class="signature-text">Authorized Signature</p>
            </div>
            
            <div class="qr-placeholder">
                QR Code
            </div>
            
            <div class="certificate-id">
                <p class="cert-id-label">Certificate ID</p>
                <p class="cert-id-value">${data.certificateId}</p>
                <p style="font-size: 10px; color: #999; margin-top: 5px;">Verify at bloodlink.com/verify</p>
            </div>
        </div>
    </div>
    
    <button class="print-btn" onclick="window.print()">🖨️ Print Certificate</button>
</body>
</html>
  `;
};

module.exports = {
  generateCertificate,
  verifyCertificate,
  getMyCertificates,
  downloadCertificate
};
