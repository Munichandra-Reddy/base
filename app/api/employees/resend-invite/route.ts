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

    // Prepare links
    let baseUrl = 'https://base-six.vercel.app';
    try {
      const headerOrigin = request.headers.get('origin') || request.headers.get('referer');
      if (headerOrigin) {
        baseUrl = new URL(headerOrigin).origin;
      }
    } catch (e) {}

    const setupPasswordLink = `${baseUrl}/setup-password?token=${invitationToken}&email=${encodeURIComponent(email)}`;
    const loginLink = `${baseUrl}/`;

    // Email dispatch
    const smtpUser = process.env.SMTP_USER || 'cr7156816@gmail.com';
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'sruzwstsgetnydcf').replace(/\s+/g, '');
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

    const emailSubject = 'Welcome to Basecamp – Your Employee Account Invitation (Resent)';

    const plainTextContent = `Hello ${fullName},

Your Basecamp workspace invitation link has been refreshed by your administrator.

Account details:
- Full Name: ${fullName}
- Organization: Basecamp
- Work Email: ${email}
- Employee ID: ${employeeId}
- Department: ${department}
- Designation: ${designation}

Please set your permanent password using this secure link:
${setupPasswordLink}

This invitation link is valid for 48 hours.

— Basecamp Workspace Administration`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Basecamp Employee Account Invitation</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F6F8;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; margin: 0 auto;">
          <tr>
            <td style="padding: 24px 32px; background-color: #011826;">
              <span style="font-size: 20px; font-weight: 700; color: #FFFFFF;">Basecamp Workspace</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">
                Your Invitation Link Has Been Refreshed
              </h2>
              <p style="font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${fullName}</strong>, your workspace administrator has resent your employee invitation link for Basecamp.
              </p>
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
                <p style="margin: 4px 0;"><strong>Employee ID:</strong> ${employeeId}</p>
                <p style="margin: 4px 0;"><strong>Department:</strong> ${department}</p>
                <p style="margin: 4px 0;"><strong>Designation:</strong> ${designation}</p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${setupPasswordLink}" style="display: inline-block; background-color: #049FD9; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 36px; border-radius: 6px;">
                  Set Your Password &rarr;
                </a>
              </div>
              <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                This link is valid for 48 hours.
              </p>
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
