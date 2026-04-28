const { Resend } = require('resend');

const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
};

const FROM = () => process.env.RESEND_FROM || 'CLASR <noreply@clasr.com>';

async function sendWelcomeEmail(email) {
  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM(),
      to: email,
      subject: 'Welcome to CLASR — Your manuscript reader is ready',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:16px;border:1px solid #1e1e2e;overflow:hidden">
        <tr>
          <td style="padding:36px 40px 28px;border-bottom:1px solid #1e1e2e">
            <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:0.18em;color:#ffffff">CLASR</p>
            <p style="margin:4px 0 0;font-size:11px;color:#6b7280;letter-spacing:0.1em;text-transform:uppercase">Academic Manuscript Signal Reader</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px">
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3">
              Your manuscript reader is ready.
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.7">
              CLASR reads your manuscript the way an international peer reviewer does — signal by signal, section by section.
              You're on the <strong style="color:#d1d5db">Free plan</strong> with 3 analyses included.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;width:100%">
              <tr>
                <td style="background:#1a1a2e;border-radius:10px;padding:20px 24px">
                  <p style="margin:0 0 12px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em">What CLASR analyzes</p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    ${[
                      'SECTION 0–8 behavioral signal report',
                      'AUTO-Q journal tier detection',
                      'Methodological integrity signals',
                      'Citation behavior & contribution framing',
                      'Discussion scope drift detection',
                    ].map(item => `
                    <tr>
                      <td width="16" style="vertical-align:top;padding-top:2px"><span style="color:#10b981;font-size:13px">✓</span></td>
                      <td style="padding:3px 0;font-size:14px;color:#d1d5db">${item}</td>
                    </tr>`).join('')}
                  </table>
                </td>
              </tr>
            </table>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#2563eb;border-radius:10px">
                  <a href="${process.env.WEB_URL || 'https://clasr.vercel.app'}/analyze"
                     style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em">
                    Start your first analysis →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #1e1e2e">
            <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6">
              You're receiving this because you created a CLASR account with ${email}.<br>
              Questions? Reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    console.error('[email] sendWelcomeEmail failed:', err.message);
  }
}

async function sendLimitReachedEmail(email, plan) {
  const resend = getResend();
  if (!resend) return;
  const upgradeUrl = `${process.env.WEB_URL || 'https://clasr.vercel.app'}/pricing`;
  try {
    await resend.emails.send({
      from: FROM(),
      to: email,
      subject: "You've used all your CLASR analyses this month",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:16px;border:1px solid #1e1e2e;overflow:hidden">
        <tr>
          <td style="padding:36px 40px 28px;border-bottom:1px solid #1e1e2e">
            <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:0.18em;color:#ffffff">CLASR</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff">Analysis limit reached</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.7">
              You've used all your analyses on the <strong style="color:#d1d5db">${plan}</strong> plan.
              Upgrade to keep working on your manuscripts.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#2563eb;border-radius:10px">
                  <a href="${upgradeUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">
                    Upgrade your plan →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    console.error('[email] sendLimitReachedEmail failed:', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendLimitReachedEmail };
