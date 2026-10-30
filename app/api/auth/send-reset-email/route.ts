import { NextResponse } from 'next/server';
import { sendSmtpEmail } from '@/lib/smtpClient';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();
    const role = String(body.role || 'employee').toLowerCase().trim();
    const customSmtpPass = body.smtpPass ? String(body.smtpPass).trim() : null;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    // Determine clean base URL for clickable password reset link
    let baseUrl = 'https://base-six.vercel.app';
    try {
      const headerOrigin = request.headers.get('origin') || request.headers.get('referer');
      if (headerOrigin) {
        baseUrl = new URL(headerOrigin).origin;
      }
    } catch (e) {}

    // Generate random 6-digit verification code and exact 15-minute expiration timestamp
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes validity
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create safe base64url token to avoid exposing raw email query params (prevents phishing filter triggers)
    const token = Buffer.from(
      JSON.stringify({
        email,
        role,
        code: resetCode,
        exp: expiresAt,
      }),
      'utf8'
    ).toString('base64url');

    const resetLink = `${baseUrl}/?token=${token}#reset-password`;

    // Record reset request in Firestore with 15-minute expiration
    try {
      const resetDoc = doc(db, 'password_resets', email.replace(/[^a-zA-Z0-9]/g, '_'));
      await setDoc(resetDoc, {
        email,
        code: resetCode,
        createdAt: now,
        expiresAt,
        used: false,
      });
    } catch (dbErr) {
      console.warn('Firestore password_resets write warning:', dbErr);
    }

    // High deliverability plain text version (recognized by Gmail/Outlook primary inbox)
    const text = `Hello,

Your WorkOrbit verification code is: ${resetCode}

To reset your password, visit the link below:
${resetLink}

This code is valid for 15 minutes.

If you did not request this, you can safely ignore this email.

— WorkOrbit Workspace`;

    // Read SMTP credentials from Environment Variables, request body, or verified app password
    const smtpUser = process.env.SMTP_USER || 'cr7156816@gmail.com';
    const smtpPass = (customSmtpPass || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'sruzwstsgetnydcf').replace(/\s+/g, '');
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

    // If SMTP_PASS is missing, notify client with manual instructions
    if (!smtpPass) {
      return NextResponse.json({
        success: false,
        smtpConfigured: false,
        resetCode,
        message: 'Gmail SMTP App Password is not yet set in Vercel environment variables.',
        instructions:
          'To send real emails from cr7156816@gmail.com, generate a 16-character App Password at myaccount.google.com/security and add SMTP_PASS to Vercel.',
      });
    }

    // High-Deliverability HTML Email Template formatted for Primary / Main Inbox delivery
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkOrbit Verification Code</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; margin: 0; padding: 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; margin: 0 auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #F3F4F6; text-align: left;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 38px; height: 38px; background-color: #6CC04A; border-radius: 8px; text-align: center; vertical-align: middle;">
                    <span style="color: #FFFFFF; font-size: 20px; font-weight: 700; line-height: 38px; display: inline-block;">W</span>
                  </td>
                  <td style="padding-left: 12px; font-size: 18px; font-weight: 700; color: #111827;">
                    WorkOrbit
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 32px 32px 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 14px 0;">
                Password Reset Verification
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 24px 0;">
                Hello, we received a request to reset the password for your WorkOrbit ${role === 'admin' ? 'Administrator' : 'Employee'} account.
              </p>

              <!-- Verification Code Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; margin: 0 0 24px 0; text-align: center;">
                <tr>
                  <td style="padding: 20px 16px;">
                    <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; margin-bottom: 8px;">
                      Your Verification Code
                    </div>
                    <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                      ${resetCode}
                    </div>
                    <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">
                      Valid for 15 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Button -->
              <div style="text-align: center; margin: 0 0 24px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #6CC04A; color: #FFFFFF; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
                  Reset Password
                </a>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #6B7280; margin: 0;">
                If you did not request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px 24px 32px; background-color: #F9FAFB; border-top: 1px solid #F3F4F6; text-align: center; font-size: 11px; color: #9CA3AF;">
              &copy; 2026 WorkOrbit. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Dispatch email via TLS SMTP using standard OTP subject format recognized by Primary / Main tab
    await sendSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      to: email,
      subject: `${resetCode} is your WorkOrbit verification code`,
      html,
      text,
    });

    return NextResponse.json({
      success: true,
      smtpConfigured: true,
      resetCode,
      message: `Password reset email successfully delivered via SMTP to ${email}!`,
    });
  } catch (error: any) {
    console.error('SMTP sending error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send email via SMTP',
      },
      { status: 500 }
    );
  }
}
