const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendPaymentNotification(transaction) {
  const mailOptions = {
    from: `"WIPE AND SHINE CLEANING AGENCY"${process.env.EMAIL_USER}`,
    to: process.env.ADMIN_EMAIL,
    subject: `New Payment: ${transaction.type} - Ref ${transaction.reference}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
        <h2 style="color: #28a745;">WIPE AND SHINE Payment Notification</h2>
        <p>A new ${transaction.type} payment has been made.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #e9ecef;">
            <td style="padding: 10px; border: 1px solid #dee2e6;">Reference</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.reference}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6;">Amount</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">₦${transaction.amount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6;">Status</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.status}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6;">Type</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.type}</td>
          </tr>
          ${transaction.interval ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">Interval</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.interval}</td>
            </tr>
          ` : ''}
          ${transaction.address ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">Address</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.address}</td>
            </tr>
          ` : ''}
          ${transaction.phone ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">Phone</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.phone}</td>
            </tr>
          ` : ''}
          ${transaction.company ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">Company</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.company}</td>
            </tr>
          ` : ''}
          ${transaction.houseAddress ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">House Address</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.houseAddress}</td>
            </tr>
          ` : ''}
          ${transaction.houseType ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">House Type</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.houseType}</td>
            </tr>
          ` : ''}
          ${transaction.cleaningOptions ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">Cleaning Options</td>
              <td style="padding: 10px; border: 1px solid #dee2e6;">${transaction.cleaningOptions}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6;">Date</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${new Date(transaction.createdAt).toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">Best regards,<br>WIPE AND SHINE Team</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}

module.exports = { sendPaymentNotification };