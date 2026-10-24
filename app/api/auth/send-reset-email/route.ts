import { NextResponse } from 'next/server';
import { sendSmtpEmail } from '@/lib/smtpClient';

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

    // Determine base URL for clickable password reset link
    const origin =
      request.headers.get('origin') ||
      request.headers.get('referer') ||
      'https://base-workorbit.vercel.app';
    const baseUrl = origin.replace(/\/$/, '');

    // Generate random 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetLink = `${baseUrl}/?resetEmail=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}&resetCode=${resetCode}#reset-password`;

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

    // HTML Email Template
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your WorkOrbit Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f3f6; margin: 0; padding: 24px;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
    <div style="background-color: #0B192C; width: 44px; height: 44px; border-radius: 12px; display: inline-block; text-align: center; line-height: 44px; color: #ffffff; font-size: 20px; font-weight: 900; margin-bottom: 20px;">
      W
    </div>
    <h2 style="color: #0F172A; font-size: 22px; font-weight: 800; margin: 0 0 12px 0;">Reset Your Password</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
      Hello, we received a request to change the password for your WorkOrbit ${role === 'admin' ? 'Administrator' : 'Employee'} account (<strong>${email}</strong>).
    </p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetLink}" style="display: inline-block; background-color: #0B192C; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 28px; border-radius: 9999px;">
        Click Here to Reset Password &rarr;
      </a>
    </div>

    <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; margin-bottom: 6px;">Your 6-Digit Password Reset Code</div>
      <div style="font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #0F172A; font-family: monospace;">${resetCode}</div>
      <div style="font-size: 11px; color: #64748B; margin-top: 6px;">Valid for 15 minutes</div>
    </div>

    <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin: 20px 0 0 0;">
      If you did not request a password change, you can safely ignore this email. Your account remains protected.
    </p>

    <div style="border-top: 1px solid #E2E8F0; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #94A3B8; text-align: center;">
      &copy; 2026 WorkOrbit Workspace. All rights reserved.
    </div>
  </div>
</body>
</html>`;

    // Dispatch email via TLS SMTP
    await sendSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      to: email,
      subject: `WorkOrbit - Password Reset Code: ${resetCode}`,
      html,
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
