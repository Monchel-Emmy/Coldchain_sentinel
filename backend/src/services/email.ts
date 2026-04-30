import nodemailer from 'nodemailer';

// Configure transporter from environment variables
// Supports Gmail, Outlook, or any SMTP provider
function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendOTPEmail(to: string, name: string, otp: string): Promise<void> {
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
        .card { background: white; border-radius: 12px; max-width: 480px; margin: 0 auto; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .logo-icon { width: 40px; height: 40px; background: #3b82f6; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .brand { font-size: 16px; font-weight: bold; color: #1e293b; }
        .sub { font-size: 12px; color: #94a3b8; }
        h2 { color: #1e293b; font-size: 20px; margin: 0 0 8px; }
        p { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
        .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 10px; text-align: center; padding: 24px; margin: 24px 0; }
        .otp-code { font-size: 40px; font-weight: bold; letter-spacing: 10px; color: #1e40af; font-family: monospace; }
        .otp-note { font-size: 12px; color: #94a3b8; margin-top: 8px; }
        .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">
          <div class="logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
            </svg>
          </div>
          <div>
            <div class="brand">ColdChain Sentinel</div>
            <div class="sub">Vaccine Cold Chain Monitoring</div>
          </div>
        </div>

        <h2>Verify your email address</h2>
        <p>Hi <strong>${name}</strong>, welcome to ColdChain Sentinel! Use the code below to verify your email address and activate your account.</p>

        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <div class="otp-note">This code expires in <strong>10 minutes</strong></div>
        </div>

        <p>If you didn't create an account, you can safely ignore this email.</p>

        <div class="footer">
          ColdChain Sentinel · Vaccine Cold Chain IoT Monitoring<br>
          This is an automated message, please do not reply.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"ColdChain Sentinel" <${process.env.SMTP_USER}>`,
    to,
    subject: `${otp} — Your ColdChain Sentinel verification code`,
    html,
  });
}
