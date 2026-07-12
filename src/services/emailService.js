const nodemailer = require('nodemailer');

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, html, text }) {
  const transport = buildTransport();
  
  if (!transport) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [EMAIL] Failed to send email - SMTP NOT CONFIGURED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   To: ${to}`);
    console.error(`   Subject: ${subject}`);
    console.error('   Required environment variables:');
    console.error(`     - SMTP_HOST: ${process.env.SMTP_HOST ? '✓' : '✗ MISSING'}`);
    console.error(`     - SMTP_PORT: ${process.env.SMTP_PORT ? '✓' : '✗ MISSING (default: 587)'}`);
    console.error(`     - SMTP_USER: ${process.env.SMTP_USER ? '✓' : '✗ MISSING'}`);
    console.error(`     - SMTP_PASS: ${process.env.SMTP_PASS ? '✓' : '✗ MISSING'}`);
    console.error(`     - EMAIL_FROM: ${process.env.EMAIL_FROM ? '✓' : '✗ MISSING'}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    const from = process.env.EMAIL_FROM;
    if (!from) {
      throw new Error('EMAIL_FROM must be set when SMTP is configured');
    }

    await transport.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });

    console.log(`✅ [EMAIL] Successfully sent email`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    return { sent: true };
    
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [EMAIL] Failed to send email');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   To: ${to}`);
    console.error(`   Subject: ${subject}`);
    console.error(`   Error: ${error.message}`);
    
    // Provide helpful hints for common errors
    if (error.message.includes('Invalid login')) {
      console.error('\n   💡 HINT: For Gmail, you must use an App Password, not your regular password!');
      console.error('      1. Go to: https://myaccount.google.com/apppasswords');
      console.error('      2. Create new app password');
      console.error('      3. Use the 16-character password in SMTP_PASS (remove spaces)');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n   💡 HINT: Cannot connect to SMTP server. Check:');
      console.error('      - SMTP_HOST and SMTP_PORT are correct');
      console.error('      - Server has internet access');
      console.error('      - No firewall blocking port 587/465');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.error('\n   💡 HINT: Connection timeout. Check:');
      console.error('      - Internet connection is working');
      console.error('      - SMTP server is accessible from your environment');
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return { sent: false, reason: error.message };
  }
}

module.exports = { sendEmail };
