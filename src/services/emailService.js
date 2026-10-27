const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Initialize Resend if API key is available
let resendClient = null;
if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
}

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
  // Try Resend first (more reliable)
  if (resendClient && process.env.RESEND_FROM) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: process.env.RESEND_FROM,
        to: [to],
        subject,
        html,
        text,
      });
      
      if (error) {
        console.error('❌ Resend API Error:', error.message || error);
        // If it's a testing mode restriction, fall back
        if (error.message && error.message.includes('testing emails')) {
          console.log('⚠️  Resend is in testing mode - can only send to verified email');
          console.log('📧 For production, verify your domain at: https://resend.com/domains');
        }
      } else {
        console.log('✅ Email sent successfully via Resend');
        console.log('   Message ID:', data.id);
        console.log('   To:', to);
        return { sent: true, provider: 'resend', messageId: data.id };
      }
    } catch (error) {
      console.error('❌ Resend exception:', error.message);
    }
  }

  // Fallback to SMTP (Gmail, etc.)
  const transport = buildTransport();
  if (transport) {
    const from = process.env.EMAIL_FROM;
    if (!from) {
      console.error('❌ EMAIL_FROM must be set when SMTP is configured');
      return { sent: false, reason: 'missing_email_from' };
    }

    try {
      const info = await transport.sendMail({
        from,
        to,
        subject,
        html,
        text,
      });

      console.log('✅ Email sent successfully via SMTP');
      console.log('   Message ID:', info.messageId);
      console.log('   To:', to);
      return { sent: true, provider: 'smtp', messageId: info.messageId };
    } catch (error) {
      console.error('❌ SMTP failed:', error.message);
      return { sent: false, reason: error.message };
    }
  }

  // No email service available
  console.log('⚠️  No email service configured - OTP will be logged to console only');
  return { sent: false, reason: 'no_email_service_configured' };
}

/**
 * Send OTP email for password reset
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.otpCode - 4-digit OTP code
 * @param {string} params.userName - User's name
 * @param {string} params.userRole - User's role (student, instructor, admin)
 * @param {number} params.expiryMinutes - OTP expiry time in minutes
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function sendOTPEmail({ to, otpCode, userName, userRole, expiryMinutes }) {
  const subject = 'Your Playfit Password Reset Code';
  
  // Role-specific styling
  const roleColors = {
    student: { primary: '#06B6D4', secondary: '#0891B2', gradient: 'from-cyan-600 via-blue-600 to-cyan-600' },
    instructor: { primary: '#8B5CF6', secondary: '#7C3AED', gradient: 'from-purple-600 via-violet-600 to-purple-600' },
    admin: { primary: '#DC2626', secondary: '#B91C1C', gradient: 'from-red-600 via-rose-600 to-red-600' },
  };
  
  const colors = roleColors[userRole] || roleColors.student;
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fadeIn 0.5s ease-out;
        }
      </style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Password Reset</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Your verification code is ready</p>
      </div>
      
      <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <p style="font-size: 16px; margin-bottom: 8px; color: #374151;">Hello <strong style="color: #111827;">${userName}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 24px; color: #374151;">We received a request to reset the password for your <strong style="color: ${colors.primary};">Playfit ${roleLabel}</strong> account.</p>
        
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid ${colors.primary}; border-radius: 12px; padding: 24px; margin: 30px 0; text-align: center;">
          <p style="font-size: 14px; color: #64748b; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Verification Code</p>
          <div style="font-size: 48px; font-weight: 700; letter-spacing: 8px; color: ${colors.primary}; font-family: 'Courier New', monospace; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">
            ${otpCode}
          </div>
          <p style="font-size: 13px; color: #64748b; margin: 12px 0 0 0;">Enter this code to continue</p>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong style="color: #78350f;">⏱️ Important:</strong> This code will expire in <strong>${expiryMinutes} minutes</strong> for security reasons.
          </p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; font-weight: 600;">Security Tips:</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #64748b;">
            <li style="margin-bottom: 4px;">Never share this code with anyone</li>
            <li style="margin-bottom: 4px;">Playfit will never ask for this code</li>
            <li>If you didn't request this, please ignore this email</li>
          </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
          <strong style="color: #374151;">Didn't request this?</strong><br>
          If you didn't ask to reset your password, you can safely ignore this email. Your password will remain unchanged and secure.
        </p>
        
        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 13px; color: #9ca3af; margin: 0;">© ${new Date().getFullYear()} Playfit. All rights reserved.</p>
          <p style="font-size: 12px; color: #d1d5db; margin: 8px 0 0 0;">Empowering learners worldwide 🌟</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hello ${userName},

We received a request to reset the password for your Playfit ${roleLabel} account.

Your verification code is: ${otpCode}

This code will expire in ${expiryMinutes} minutes for security reasons.

Please enter this code on the password reset page to continue.

Security Tips:
- Never share this code with anyone
- Playfit will never ask for this code
- If you didn't request this, please ignore this email

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} Playfit
  `;
  
  try {
    return await sendEmail({ to, subject, html, text });
  } catch (error) {
    console.error('OTP Email sending error:', error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = { sendEmail, sendOTPEmail };
