const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('\n🔍 Testing Email Configuration...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || '❌ Not set');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || '❌ Not set');
  console.log('SMTP_USER:', process.env.SMTP_USER || '❌ Not set');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set (hidden)' : '❌ Not set');
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '❌ Not set');
  console.log('');

  // Validate required fields
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_FROM) {
    console.error('❌ Missing required email configuration. Please check your .env file.\n');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true, // Enable debug output
    logger: true, // Log information
  });

  console.log('📧 Verifying SMTP connection...\n');

  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Send test email
    console.log('📨 Sending test email...\n');
    const testEmail = process.env.SMTP_USER; // Send to self for testing

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: testEmail,
      subject: 'Test Email from Playfit LMS',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1E88E5;">✅ Email Configuration Test Successful!</h2>
          <p>This is a test email from your Playfit LMS backend.</p>
          <p><strong>SMTP Configuration:</strong></p>
          <ul>
            <li>Host: ${process.env.SMTP_HOST}</li>
            <li>Port: ${process.env.SMTP_PORT}</li>
            <li>User: ${process.env.SMTP_USER}</li>
          </ul>
          <p>If you received this email, your email service is configured correctly! ✨</p>
          <hr>
          <p style="font-size: 12px; color: #666;">Sent at: ${new Date().toLocaleString()}</p>
        </body>
        </html>
      `,
      text: `
Email Configuration Test Successful!

This is a test email from your Playfit LMS backend.

SMTP Configuration:
- Host: ${process.env.SMTP_HOST}
- Port: ${process.env.SMTP_PORT}
- User: ${process.env.SMTP_USER}

If you received this email, your email service is configured correctly!

Sent at: ${new Date().toLocaleString()}
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n📬 Check your inbox at:', testEmail);
    console.log('   (Don\'t forget to check spam/junk folder)\n');

  } catch (error) {
    console.error('❌ Email test failed:\n');
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Common causes:');
      console.error('   1. Incorrect username or password');
      console.error('   2. For Gmail: You need an "App Password", not your regular password');
      console.error('   3. 2-Factor Authentication might be required');
      console.error('   4. "Less secure app access" might need to be enabled (not recommended)');
      console.error('\n📖 To create a Gmail App Password:');
      console.error('   1. Go to: https://myaccount.google.com/apppasswords');
      console.error('   2. Generate a new app password');
      console.error('   3. Use that password in your SMTP_PASS environment variable');
    } else if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
      console.error('\n💡 Connection failed. Common causes:');
      console.error('   1. Incorrect SMTP host or port');
      console.error('   2. Firewall blocking the connection');
      console.error('   3. Internet connectivity issues');
    }
    
    console.error('');
    process.exit(1);
  }
}

testEmail();
