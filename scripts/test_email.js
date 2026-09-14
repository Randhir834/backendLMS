require('dotenv').config();
const { sendEmail } = require('../src/services/emailService');

async function testEmail() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Testing Email Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('SMTP Settings:');
  console.log(`  Host:        ${process.env.SMTP_HOST || 'NOT SET ❌'}`);
  console.log(`  Port:        ${process.env.SMTP_PORT || 'NOT SET ❌'}`);
  console.log(`  User:        ${process.env.SMTP_USER || 'NOT SET ❌'}`);
  console.log(`  Password:    ${process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) + ' ✅' : 'NOT SET ❌'}`);
  console.log(`  From:        ${process.env.EMAIL_FROM || 'NOT SET ❌'}\n`);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ ERROR: SMTP configuration is incomplete!');
    console.log('\nPlease set these environment variables in your .env file:');
    console.log('  - SMTP_HOST');
    console.log('  - SMTP_PORT');
    console.log('  - SMTP_USER');
    console.log('  - SMTP_PASS (Gmail App Password)');
    console.log('  - EMAIL_FROM\n');
    console.log('📖 See FORGOT_PASSWORD_COMPLETE_GUIDE.md for detailed instructions.\n');
    process.exit(1);
  }

  console.log('📧 Sending test email...\n');

  try {
    const result = await sendEmail({
      to: process.env.SMTP_USER, // Send to yourself
      subject: '✅ Test Email from PlayFit LMS',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Email Test Successful!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">This is a test email from your <strong>PlayFit LMS</strong> application.</p>
            <p style="font-size: 16px; margin-bottom: 25px;">If you're seeing this, your email configuration is working correctly! 🎉</p>
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #166534;"><strong>✓ SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #166534;"><strong>✓ SMTP Port:</strong> ${process.env.SMTP_PORT}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #166534;"><strong>✓ SMTP User:</strong> ${process.env.SMTP_USER}</p>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 25px;">You can now use the forgot password feature on all three portals:</p>
            <ul style="font-size: 14px; color: #666;">
              <li>Student Portal: http://localhost:3000/forgot-password</li>
              <li>Instructor Portal: http://localhost:3001/forgot-password</li>
              <li>Admin Portal: http://localhost:3002/forgot-password</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="font-size: 13px; color: #999; margin-top: 30px; text-align: center;">© ${new Date().getFullYear()} Playfit LMS. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hello,

This is a test email from your PlayFit LMS application.

If you're seeing this, your email configuration is working correctly!

✓ SMTP Host: ${process.env.SMTP_HOST}
✓ SMTP Port: ${process.env.SMTP_PORT}
✓ SMTP User: ${process.env.SMTP_USER}

You can now use the forgot password feature on all three portals:
- Student Portal: http://localhost:3000/forgot-password
- Instructor Portal: http://localhost:3001/forgot-password
- Admin Portal: http://localhost:3002/forgot-password

© ${new Date().getFullYear()} Playfit LMS
      `
    });

    if (result.sent) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SUCCESS! Email sent successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`📬 Check your inbox at: ${process.env.SMTP_USER}`);
      console.log('💡 Don\'t forget to check your spam folder if you don\'t see it.\n');
      console.log('🎉 Your forgot password feature is now fully functional!\n');
      console.log('Next steps:');
      console.log('  1. Test forgot password on: http://localhost:3000/forgot-password');
      console.log('  2. Test forgot password on: http://localhost:3001/forgot-password');
      console.log('  3. Test forgot password on: http://localhost:3002/forgot-password\n');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ Email not sent');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`Reason: ${result.reason}\n`);
      
      if (result.reason === 'smtp_not_configured') {
        console.log('⚠️  SMTP is not fully configured. Please check:');
        console.log('   1. SMTP_HOST is set in .env');
        console.log('   2. SMTP_USER is set in .env');
        console.log('   3. SMTP_PASS is set in .env (should be Gmail App Password)');
        console.log('   4. EMAIL_FROM is set in .env\n');
        console.log('📖 See FORGOT_PASSWORD_COMPLETE_GUIDE.md for detailed instructions.\n');
      }
    }
  } catch (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ ERROR: Failed to send email');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code || 'N/A\n');
    
    if (error.code === 'EAUTH') {
      console.log('\n⚠️  Authentication Failed!\n');
      console.log('This usually means:');
      console.log('  1. You\'re using your Gmail password instead of an App Password');
      console.log('  2. The App Password is incorrect or has spaces\n');
      console.log('🔧 To fix this:');
      console.log('  1. Enable 2-Factor Authentication on Gmail');
      console.log('  2. Go to: https://myaccount.google.com/apppasswords');
      console.log('  3. Generate a new App Password for "Mail"');
      console.log('  4. Copy the 16-character password (without spaces)');
      console.log('  5. Update SMTP_PASS in your .env file');
      console.log('  6. Restart your backend server\n');
      console.log('📖 See FORGOT_PASSWORD_COMPLETE_GUIDE.md for detailed instructions.\n');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('\n⚠️  Connection Failed!\n');
      console.log('This usually means:');
      console.log('  1. SMTP_HOST or SMTP_PORT is incorrect');
      console.log('  2. Your firewall is blocking the connection');
      console.log('  3. Your network doesn\'t allow SMTP connections\n');
      console.log('Current settings:');
      console.log(`  Host: ${process.env.SMTP_HOST}`);
      console.log(`  Port: ${process.env.SMTP_PORT}\n`);
      console.log('For Gmail, use:');
      console.log('  SMTP_HOST=smtp.gmail.com');
      console.log('  SMTP_PORT=587\n');
    } else {
      console.log('\n📖 See FORGOT_PASSWORD_COMPLETE_GUIDE.md for troubleshooting.\n');
    }
  }
}

testEmail();
