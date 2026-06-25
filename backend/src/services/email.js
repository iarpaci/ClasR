'use strict';

const { Resend } = require('resend');

const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
};

const FROM  = () => process.env.RESEND_FROM || 'Clasr <noreply@clasr.ai>';
const BASE  = () => process.env.WEB_URL     || 'https://clasr.ai';

function shell(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F4;padding:48px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:4px;border:1px solid #E0DAD0;overflow:hidden;max-width:100%">
        <tr>
          <td style="padding:28px 36px 24px;border-bottom:1px solid #E0DAD0">
            <p style="margin:0;font-size:16px;font-weight:700;letter-spacing:0.15em;color:#2c2620;text-transform:uppercase">CLASR</p>
            <p style="margin:4px 0 0;font-size:10px;color:#6B6560;letter-spacing:0.1em;text-transform:uppercase">Manuscript Signal Layer</p>
          </td>
        </tr>
        <tr><td style="padding:32px 36px">${content}</td></tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #E0DAD0;background:#F5F0E5">
            <p style="margin:0;font-size:11px;color:#6B6560;line-height:1.6">
              Clasr · Academic Manuscript Analysis<br>
              <a href="${BASE()}" style="color:#A32642;text-decoration:none">clasr.ai</a> ·
              <a href="${BASE()}/privacy/" style="color:#A32642;text-decoration:none">Privacy</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(url, text) {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px">
    <tr><td style="background:#2c2620;border-radius:999px">
      <a href="${url}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FAF8F4;text-decoration:none;letter-spacing:0.02em">${text}</a>
    </td></tr>
  </table>`;
}

async function send(to, subject, html) {
  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({ from: FROM(), to, subject, html });
  } catch (err) {
    console.error('[email]', subject, err.message);
  }
}

async function sendWelcomeEmail(email, firstName = '') {
  const name = firstName ? firstName : 'there';
  return send(email, 'Your Clasr workspace is ready', shell(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1A1A">Welcome to Clasr, ${name}.</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5A5548;line-height:1.7">
      Clasr reads your manuscript the way a careful reviewer does — signal by signal, section by section.
      Your workspace is ready. Upload a manuscript to begin.
    </p>
    ${btn(`${BASE()}/dashboard/`, 'Go to dashboard →')}
  `));
}

async function sendPasswordResetEmail(email, resetUrl) {
  return send(email, 'Reset your Clasr password', shell(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1A1A">Reset your password</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5A5548;line-height:1.7">
      Click the button below to choose a new password. This link expires in 1 hour.
    </p>
    ${btn(resetUrl, 'Reset password →')}
    <p style="margin:20px 0 0;font-size:12px;color:#8A8580">If you didn't request a password reset, you can safely ignore this email.</p>
  `));
}

async function sendReportReadyEmail(email, readingId, mode = 'author') {
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  return send(email, 'Your Clasr signal report is ready', shell(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1A1A">Your signal report is ready.</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5A5548;line-height:1.7">
      Clasr has finished reading your manuscript in <strong>${modeLabel} Mode</strong>.
      Your signal report is now available in your dashboard.
    </p>
    ${btn(`${BASE()}/dashboard/reading/?id=${readingId}`, 'Open report →')}
  `));
}

async function sendLimitReachedEmail(email, plan) {
  return send(email, "You've used all your Clasr readings", shell(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1A1A">Reading limit reached</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5A5548;line-height:1.7">
      You've used all your readings on the <strong>${plan}</strong> plan.
      Upgrade to continue analysing manuscripts.
    </p>
    ${btn(`${BASE()}/dashboard/pricing/`, 'View plans →')}
  `));
}

async function sendContactEmail({ firstName, lastName, email, message, topic }) {
  const adminEmail = process.env.ADMIN_EMAIL || 'hello@clasr.ai';
  return send(adminEmail, `[Clasr Contact] ${topic || 'Message'} from ${firstName || ''} ${lastName || ''}`.trim(), shell(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#1A1A1A">Contact form submission</h2>
    <p><strong>From:</strong> ${firstName || ''} ${lastName || ''} &lt;${email}&gt;</p>
    ${topic ? `<p><strong>Topic:</strong> ${topic}</p>` : ''}
    <p><strong>Message:</strong></p>
    <blockquote style="margin:8px 0;padding:12px 16px;background:#F5F0E5;border-left:3px solid #A32642;font-size:14px;line-height:1.7">${String(message).replace(/\n/g, '<br>')}</blockquote>
  `));
}

async function sendEnterpriseEmail({ institution, email, expectedVolume, message }) {
  const adminEmail = process.env.ADMIN_EMAIL || 'hello@clasr.ai';
  return send(adminEmail, `[Clasr Enterprise] Request from ${institution || email}`, shell(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#1A1A1A">Enterprise contact</h2>
    <p><strong>Institution:</strong> ${institution || '—'}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Expected volume:</strong> ${expectedVolume || '—'}</p>
    ${message ? `<p><strong>Message:</strong></p><blockquote style="margin:8px 0;padding:12px 16px;background:#F5F0E5;border-left:3px solid #A32642;font-size:14px;line-height:1.7">${String(message).replace(/\n/g, '<br>')}</blockquote>` : ''}
  `));
}

async function sendLegalRequestEmail({ document, email }) {
  const adminEmail = process.env.ADMIN_EMAIL || 'hello@clasr.ai';
  return send(adminEmail, `[Clasr Legal] Document access request: ${document || '—'}`, shell(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#1A1A1A">Legal document request</h2>
    <p><strong>Document:</strong> ${document || '—'}</p>
    <p><strong>Requested by:</strong> ${email || '—'}</p>
  `));
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendReportReadyEmail,
  sendLimitReachedEmail,
  sendContactEmail,
  sendEnterpriseEmail,
  sendLegalRequestEmail,
};
