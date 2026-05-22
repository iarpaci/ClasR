const { Resend } = require('resend');

const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
};

const FROM = () => process.env.RESEND_FROM || 'CLASR <noreply@clasr.ai>';

const BASE_URL = () => process.env.WEB_URL || 'https://clasr.ai';

// Shared email shell
function emailShell(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CLASR</title></head>
<body style="margin:0;padding:0;background:#F5F0E5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E5;padding:48px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FAF7F0;border-radius:4px;border:1px solid #CFC9B8;overflow:hidden;max-width:100%">

        <!-- Header -->
        <tr>
          <td style="padding:28px 36px 24px;border-bottom:1px solid #CFC9B8">
            <p style="margin:0;font-size:18px;font-weight:900;letter-spacing:0.2em;color:#2B555B;text-transform:uppercase">CLASR</p>
            <p style="margin:4px 0 0;font-size:10px;color:#5A5548;letter-spacing:0.12em;text-transform:uppercase">Academic Manuscript Signal Reader</p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:32px 36px">${content}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #CFC9B8;background:#F5F0E5">
            <p style="margin:0;font-size:11px;color:#5A5548;line-height:1.6">
              CLASR · Academic Manuscript Analysis<br>
              <a href="${BASE_URL()}" style="color:#3A7077;text-decoration:none">clasr.ai</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function tealButton(url, text) {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:28px">
    <tr>
      <td style="background:#2B555B;border-radius:999px">
        <a href="${url}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#F5F0E5;text-decoration:none;letter-spacing:0.02em">${text}</a>
      </td>
    </tr>
  </table>`;
}

async function sendWelcomeEmail(email) {
  const resend = getResend();
  if (!resend) return;
  const content = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.3">Your manuscript reader is ready.</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#5A5548;line-height:1.7">
      CLASR reads your manuscript the way an international peer reviewer does — signal by signal, section by section.
      You're on the <strong style="color:#1A1A1A">Free plan</strong> with 5 analyses included.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:8px">
      <tr>
        <td style="background:#EDF0E8;border-radius:4px;border:1px solid #C5D0BB;padding:18px 22px">
          <p style="margin:0 0 10px;font-size:10px;color:#5A5548;text-transform:uppercase;letter-spacing:0.1em">What CLASR detects</p>
          ${[
            'Structural Review — section-level completeness',
            'Methodological Visibility — claim–evidence alignment',
            'Reference Check — citation behavior signals',
            'Inconsistency Detection — cross-section conflicts',
            'Red Flags — desk-reject risk profile',
          ].map(item => `
          <table cellpadding="0" cellspacing="0" style="margin-bottom:6px"><tr>
            <td width="18" style="vertical-align:top;padding-top:1px"><span style="color:#2B555B;font-size:13px">✓</span></td>
            <td style="font-size:13px;color:#1A1A1A;line-height:1.5">${item}</td>
          </tr></table>`).join('')}
        </td>
      </tr>
    </table>
    ${tealButton(`${BASE_URL()}/analyze`, 'Start your first analysis →')}`;

  try {
    await resend.emails.send({
      from: FROM(),
      to: email,
      subject: 'Welcome to CLASR — Your manuscript reader is ready',
      html: emailShell(content),
    });
  } catch (err) {
    console.error('[email] sendWelcomeEmail failed:', err.message);
  }
}

async function sendLimitReachedEmail(email, plan) {
  const resend = getResend();
  if (!resend) return;
  const content = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1A1A">Analysis limit reached</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#5A5548;line-height:1.7">
      You've used all your analyses on the <strong style="color:#1A1A1A">${plan}</strong> plan this month.
    </p>
    <p style="margin:0;font-size:14px;color:#5A5548;line-height:1.7">
      Upgrade to continue working on your manuscripts. Your analysis history is preserved.
    </p>
    ${tealButton(`${BASE_URL()}/pricing`, 'View upgrade options →')}`;

  try {
    await resend.emails.send({
      from: FROM(),
      to: email,
      subject: "You've used all your CLASR analyses this month",
      html: emailShell(content),
    });
  } catch (err) {
    console.error('[email] sendLimitReachedEmail failed:', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendLimitReachedEmail };
