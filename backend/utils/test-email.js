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

async function testEmail() {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: 'Test Email from WIPE AND SHINE',
    text: 'This is a test email to verify SMTP settings.',
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent:', info.response);
  } catch (error) {
    console.error('Test email failed:', error.message);
  }
}

testEmail();