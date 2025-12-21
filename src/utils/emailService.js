const nodemailer = require('nodemailer');

// Create mail transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

// Email templates
const emailTemplates = {
  // Emergency blood request notification
  emergencyRequestNotification: (hospitalName, bloodGroup, units, condition, timeLimit, contactPhone) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 20px; color: white; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;"><i style="font-size: 30px;">🚨</i> EMERGENCY BLOOD REQUEST</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <p style="color: #333;"><strong>${hospitalName}</strong> urgently needs your help!</p>
          
          <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #e74c3c;">
            <p style="margin: 0; color: #333;"><strong>Blood Type Needed:</strong> <span style="font-size: 24px; color: #e74c3c;">${bloodGroup}</span></p>
            <p style="margin: 10px 0 0 0; color: #666;"><strong>Units Required:</strong> ${units} unit(s)</p>
          </div>

          <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px;">
            <p style="margin: 0; color: #333;"><strong>Patient Condition:</strong> ${condition}</p>
            <p style="margin: 10px 0 0 0; color: #e74c3c; font-weight: bold;">⏰ Required within ${timeLimit} minutes</p>
          </div>

          <div style="background: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #f39c12;">
            <p style="margin: 0; color: #856404;"><strong>📞 Hospital Contact:</strong> <a href="tel:${contactPhone}" style="color: #e74c3c; text-decoration: none; font-weight: bold;">${contactPhone}</a></p>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.CLIENT_URL}/donor/dashboard" style="display: inline-block; background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              🚑 RESPOND TO EMERGENCY
            </a>
          </div>

          <p style="color: #666; font-size: 14px; text-align: center;">Your quick action can save a life. Every minute counts!</p>
        </div>
      </div>
    `;
  },

  // Urgent blood request notification
  urgentRequestNotification: (hospitalName, bloodGroup, units, requiredBy) => {
    return `
      <h2>🚨 Urgent Blood Request</h2>
      <p><strong>${hospitalName}</strong> urgently needs <strong>${units} units</strong> of blood group <strong>${bloodGroup}</strong></p>
      <p>Required by: <strong>${requiredBy}</strong></p>
      <p><a href="${process.env.CLIENT_URL}/requests">View Request</a></p>
    `;
  },

  // Request matched notification
  requestMatchedNotification: (donorName, bloodGroup, hospitalName) => {
    return `
      <h2>✅ Your blood is needed!</h2>
      <p>Hi ${donorName},</p>
      <p><strong>${hospitalName}</strong> has requested blood group <strong>${bloodGroup}</strong> that matches yours.</p>
      <p><a href="${process.env.CLIENT_URL}/requests">Check Request</a></p>
    `;
  },

  // Donation reminder
  donationReminder: (donorName, nextEligibleDate) => {
    return `
      <h2>💉 You are now eligible to donate again!</h2>
      <p>Hi ${donorName},</p>
      <p>You are now eligible to donate blood again (90 days have passed since your last donation).</p>
      <p>Next eligible donation date: <strong>${nextEligibleDate}</strong></p>
      <p>Register to help save lives! <a href="${process.env.CLIENT_URL}">Visit BloodLink</a></p>
    `;
  }
};

module.exports = { sendEmail, emailTemplates };
