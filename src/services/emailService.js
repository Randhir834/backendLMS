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
    return { sent: false, reason: 'smtp_not_configured' };
  }

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

  return { sent: true };
}

module.exports = { sendEmail };
