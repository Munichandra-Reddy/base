import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sendSmtpEmail } from '@/lib/smtpClient';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Employee email is required to resend invitation.' },
        { status: 400 }
      );
    }

    const docId = email.replace(/[^a-zA-Z0-9]/g, '_');
    const empRef = doc(db, 'employees', docId);
    const empSnap = await getDoc(empRef);

    if (!empSnap.exists()) {
      return NextResponse.json(
        { success: false, error: `Employee with email "${email}" not found.` },
        { status: 404 }
      );
    }

    const employeeData = empSnap.data();
    const fullName = employeeData.name || employeeData.fullName || 'Employee';
    const employeeId = employeeData.employeeId || docId;
    const designation = employeeData.designation || employeeData.role || 'Team Member';
    const department = employeeData.department || 'General';
    const accessRole = employeeData.accessRole || 'employee';

    // Generate fresh token (48 hours expiration)
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const actionCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = now + 48 * 60 * 60 * 1000;

    // Update invitations collection
    const inviteDocRef = doc(db, 'invitations', invitationToken);
    await setDoc(inviteDocRef, {
      token: invitationToken,
      actionCode,
      email,
      employeeId,
      fullName,
      accessRole,
      designation,
      department,
      phone: employeeData.phone || '',
      joiningDate: employeeData.joiningDate || '',
      createdAt: now,
      expiresAt,
      used: false,
    });

    // Update employees collection status to 'invited'
    await setDoc(
      empRef,
      {
        status: 'invited',
        invitedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Update user_accounts collection
    const userRef = doc(db, 'user_accounts', docId);
    await setDoc(
      userRef,
      {
        invitationToken,
        invitationExpiresAt: expiresAt,
        status: 'invited',
      },
      { merge: true }
    );

    // Prepare links (always use clean HTTPS URL to prevent spam classification)
    let baseUrl = 'https://base-six.vercel.app';
    try {
      const headerOrigin = request.headers.get('origin') || request.headers.get('referer');
      if (headerOrigin && !headerOrigin.includes('localhost') && !headerOrigin.includes('127.0.0.1')) {
        baseUrl = new URL(headerOrigin).origin;
      }
    } catch (e) {}

    const setupPasswordLink = `${baseUrl}/setup-password?token=${invitationToken}&email=${encodeURIComponent(email)}`;
    const fallbackLink = `${baseUrl}/?inviteToken=${invitationToken}&email=${encodeURIComponent(email)}#setup-password`;
    const loginLink = `${baseUrl}/`;

    // Email dispatch
    const smtpUser = process.env.SMTP_USER || 'cr7156816@gmail.com';
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'sruzwstsgetnydcf').replace(/\s+/g, '');
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

    // Clean ASCII subject with verification code for 100% Primary / Normal Inbox deliverability
    const emailSubject = `${actionCode} is your Basecamp verification code: Welcome to Basecamp - Your Employee Account Invitation (Resent)`;

    const plainTextContent = `Hello ${fullName},

Your Basecamp employee verification code is: ${actionCode}

Your workspace administrator has resent your employee invitation link for Basecamp.

Account details:
- Full Name: ${fullName}
- Organization: Basecamp
- Work Email: ${email}
- Employee ID: ${employeeId}
- Department: ${department}
- Designation: ${designation}

Please set your permanent password using this secure link:
${setupPasswordLink}

(Alternative link: ${fallbackLink})

This invitation is valid for 48 hours.

Welcome to the team!
- Basecamp Workspace`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Basecamp Employee Account Verification</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F6F8; margin: 0; padding: 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; margin: 0 auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px 18px 32px; border-bottom: 1px solid #F3F4F6; text-align: left;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 38px; height: 38px; background-color: #049FD9; border-radius: 8px; text-align: center; vertical-align: middle;">
                    <span style="color: #FFFFFF; font-size: 20px; font-weight: 700; line-height: 38px; display: inline-block;">B</span>
                  </td>
                  <td style="padding-left: 12px; font-size: 18px; font-weight: 700; color: #111827;">
                    Basecamp Workspace
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Banner -->
          <tr>
            <td style="padding: 28px 32px 16px 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 10px 0;">
                Employee Account Invitation (Resent)
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 20px 0;">
                Hello <strong>${fullName}</strong>, your workspace administrator has resent your employee invitation link for Basecamp. Use the verification code or the button below to set your confidential password.
              </p>

              <!-- Verification Code Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin: 0 0 20px 0; text-align: center;">
                <tr>
                  <td style="padding: 18px 16px;">
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 6px;">
                      Your Verification Code
                    </div>
                    <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0F172A; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                      ${actionCode}
                    </div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 6px;">
                      Valid for 48 hours
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Account Details Box -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAFAFA; border: 1px solid #EEEEEE; border-radius: 8px; padding: 14px 18px;">
                <tr>
                  <td style="padding: 5px 0; font-size: 12px; color: #666666; width: 38%;">Employee ID:</td>
                  <td style="padding: 5px 0; font-size: 13px; font-weight: 700; color: #049FD9; font-family: monospace;">${employeeId}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-size: 12px; color: #666666;">Work Email:</td>
                  <td style="padding: 5px 0; font-size: 13px; font-weight: 600; color: #111827;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-size: 12px; color: #666666;">Designation:</td>
                  <td style="padding: 5px 0; font-size: 13px; font-weight: 600; color: #111827;">${designation}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-size: 12px; color: #666666;">Department:</td>
                  <td style="padding: 5px 0; font-size: 13px; font-weight: 600; color: #111827;">${department}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding: 0 32px 24px 32px; text-align: center;">
              <a href="${setupPasswordLink}" style="display: inline-block; background-color: #049FD9; color: #FFFFFF; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
                Set Your Password
              </a>
              <div style="font-size: 11px; color: #9CA3AF; margin-top: 10px;">
                Link valid for 48 hours
              </div>
            </td>
          </tr>

          <!-- Security Policy -->
          <tr>
            <td style="padding: 0 32px 24px 32px; font-size: 12px; line-height: 1.5; color: #6B7280;">
              Your permanent password is chosen by you and will remain private. Workspace administrators do not have access to your personal password.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px 20px 32px; background-color: #F9FAFB; border-top: 1px solid #F3F4F6; text-align: center; font-size: 11px; color: #9CA3AF;">
              &copy; 2026 Basecamp. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await sendSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      from: `"Basecamp" <${smtpUser}>`,
      to: email,
      subject: emailSubject,
      html: htmlContent,
      text: plainTextContent,
    });

    return NextResponse.json({
      success: true,
      message: `Fresh invitation email has been delivered to ${email}.`,
    });
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resend invitation email.' },
      { status: 500 }
    );
  }
}
