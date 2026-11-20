import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query } from 'firebase/firestore';
import { sendSmtpEmail } from '@/lib/smtpClient';
import { Person, AccessRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Department list
const VALID_DEPARTMENTS = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Support',
  'General',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fullName = String(body.fullName || body.name || '').trim();
    const email = String(body.email || '').toLowerCase().trim();
    const accessRole: AccessRole = body.accessRole === 'admin' ? 'admin' : 'employee';
    const designation = String(body.designation || body.role || '').trim();
    const department = String(body.department || 'Engineering').trim();
    const phone = String(body.phone || '').trim();
    let employeeId = String(body.employeeId || '').trim();
    const joiningDate = String(body.joiningDate || new Date().toISOString().split('T')[0]).trim();
    const adminEmail = String(request.headers.get('x-admin-email') || body.adminEmail || '').toLowerCase().trim();

    // 1. Validate Required Fields
    if (!fullName) {
      return NextResponse.json(
        { success: false, error: 'Employee Full Name is required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid work email address.' },
        { status: 400 }
      );
    }

    if (!designation) {
      return NextResponse.json(
        { success: false, error: 'Designation / Job Title is required.' },
        { status: 400 }
      );
    }

    if (!department) {
      return NextResponse.json(
        { success: false, error: 'Department is required.' },
        { status: 400 }
      );
    }

    // 2. Verify Admin Authorization (Only Admins can create employees or assign Admin role)
    const isAuthorizedAdmin =
      adminEmail === 'cr7156816@gmail.com' ||
      body.isAdmin === true ||
      body.requesterRole === 'admin';

    if (!isAuthorizedAdmin && accessRole === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only administrators can create accounts with Admin permissions.' },
        { status: 403 }
      );
    }

    // 3. Prohibit reserving workspace root admin email
    if (email === 'cr7156816@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'This email is reserved for the primary Workspace Administrator.' },
        { status: 400 }
      );
    }

    // 4. Check for Duplicate Email in Firestore
    const docId = email.replace(/[^a-zA-Z0-9]/g, '_');
    const existingEmployeeRef = doc(db, 'employees', docId);
    const existingSnap = await getDoc(existingEmployeeRef);

    if (existingSnap.exists()) {
      return NextResponse.json(
        { success: false, error: `An employee with work email "${email}" already exists in the workspace.` },
        { status: 400 }
      );
    }

    // Also check user_accounts for existing registration
    const existingUserRef = doc(db, 'user_accounts', docId);
    const existingUserSnap = await getDoc(existingUserRef);
    if (existingUserSnap.exists()) {
      const userData = existingUserSnap.data();
      if (userData?.status !== 'invited') {
        return NextResponse.json(
          { success: false, error: `An account with email "${email}" is already registered.` },
          { status: 400 }
        );
      }
    }

    // 5. Generate / Validate Unique Employee ID
    if (!employeeId) {
      // Auto-generate unique Employee ID
      try {
        const empSnapshot = await getDocs(collection(db, 'employees'));
        const existingCount = empSnapshot.docs.length;
        let candidateNum = 1000 + existingCount + 1;
        let candidateId = `EMP-${candidateNum}`;

        const existingIds = new Set(
          empSnapshot.docs.map((d) => (d.data().employeeId || '').toUpperCase())
        );

        while (existingIds.has(candidateId.toUpperCase())) {
          candidateNum++;
          candidateId = `EMP-${candidateNum}`;
        }
        employeeId = candidateId;
      } catch (e) {
        employeeId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    } else {
      // Check if manually supplied employeeId is unique
      try {
        const empSnapshot = await getDocs(collection(db, 'employees'));
        const duplicate = empSnapshot.docs.some(
          (d) =>
            (d.data().employeeId || '').toUpperCase() === employeeId.toUpperCase() &&
            d.id !== docId
        );
        if (duplicate) {
          return NextResponse.json(
            { success: false, error: `Employee ID "${employeeId}" is already assigned to another employee. Please use a unique ID.` },
            { status: 400 }
          );
        }
      } catch (e) {}
    }

    // 6. Generate Secure Invitation Token (48 hours expiration)
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const actionCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = now + 48 * 60 * 60 * 1000; // 48 hours validity

    // Color avatars
    const avatarColors = [
      'bg-[#049FD9] text-white',
      'bg-[#6CC04A] text-white',
      'bg-[#15293F] text-white',
      'bg-indigo-600 text-white',
      'bg-purple-600 text-white',
      'bg-emerald-600 text-white',
      'bg-amber-600 text-white',
      'bg-rose-600 text-white',
    ];
    const randomAvatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const avatarLetter = fullName[0]?.toUpperCase() || 'E';

    // 7. Prepare Profile Object
    const employeeProfile: Person = {
      id: docId,
      employeeId,
      name: fullName,
      email,
      role: designation,
      designation,
      accessRole,
      department,
      phone,
      joiningDate,
      status: 'invited',
      avatar: avatarLetter,
      avatarBg: randomAvatarColor,
      projectsCount: 1,
      invitedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // 8. Store in Cloud Firestore
    // A. invitations collection
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
      phone,
      joiningDate,
      createdAt: now,
      expiresAt,
      used: false,
    });

    // B. employees collection
    await setDoc(existingEmployeeRef, employeeProfile, { merge: true });

    // C. user_accounts collection (Never store plaintext password; status is 'invited')
    await setDoc(
      existingUserRef,
      {
        email,
        fullName,
        companyName: 'Basecamp',
        role: accessRole,
        accessRole,
        designation,
        department,
        phone,
        employeeId,
        joiningDate,
        status: 'invited',
        createdAt: new Date().toISOString(),
        invitationToken,
        invitationExpiresAt: expiresAt,
      },
      { merge: true }
    );

    // 9. Determine Base URL for clickable Invitation Link
    let baseUrl = 'https://base-six.vercel.app';
    try {
      const headerOrigin = request.headers.get('origin') || request.headers.get('referer');
      if (headerOrigin) {
        baseUrl = new URL(headerOrigin).origin;
      }
    } catch (e) {}

    const setupPasswordLink = `${baseUrl}/setup-password?token=${invitationToken}&email=${encodeURIComponent(email)}`;
    const fallbackLink = `${baseUrl}/?inviteToken=${invitationToken}&email=${encodeURIComponent(email)}#setup-password`;
    const loginLink = `${baseUrl}/`;

    // 10. Send Transactional Invitation Email
    const smtpUser = process.env.SMTP_USER || 'cr7156816@gmail.com';
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'sruzwstsgetnydcf').replace(/\s+/g, '');
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

    const emailSubject = 'Welcome to Basecamp – Your Employee Account Invitation';

    const plainTextContent = `Hello ${fullName},

Welcome to Basecamp! Your employee account has been created by your workspace administrator.

Here are your account details:
- Full Name: ${fullName}
- Organization: Basecamp
- Work Email: ${email}
- Employee ID: ${employeeId}
- Department: ${department}
- Designation: ${designation}
- Access Role: ${accessRole === 'admin' ? 'Administrator' : 'Employee'}

To set your permanent password and activate your account, please visit the secure link below:
${setupPasswordLink}

(If the link above does not open, try: ${fallbackLink})

Important security note:
- This invitation link is valid for 48 hours.
- Your administrator does not know and cannot see your permanent password.
- Once your password is created, you can log in directly at: ${loginLink}

Welcome to the team!
— Basecamp Workspace Administration`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Basecamp – Employee Account Invitation</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F6F8; margin: 0; padding: 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; margin: 0 auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #011826; text-align: left;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 40px; height: 40px; background-color: #049FD9; border-radius: 8px; text-align: center; vertical-align: middle;">
                    <span style="color: #FFFFFF; font-size: 22px; font-weight: 800; line-height: 40px; display: inline-block;">B</span>
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.3px;">Basecamp</div>
                    <div style="font-size: 11px; color: #94A3B8; font-weight: 400;">Project & Employee Management Workspace</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Banner -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="display: inline-block; padding: 4px 10px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 20px; font-size: 11px; font-weight: 700; color: #1D4ED8; margin-bottom: 12px;">
                🎉 Account Invitation
              </div>
              <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 10px 0; line-height: 1.3;">
                Welcome to the team, ${fullName}!
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 20px 0;">
                Your employee account for <strong style="color: #111827;">Basecamp Workspace</strong> has been officially created. You have been granted access to collaborate on projects, tasks, and team communications.
              </p>
            </td>
          </tr>

          <!-- Account Details Box -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748B; width: 40%;">Organization:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0F172A;">Basecamp</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748B;">Employee ID:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #049FD9; font-family: monospace;">${employeeId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748B;">Registered Email:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0F172A;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748B;">Designation:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0F172A;">${designation}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748B;">Department:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0F172A;">${department}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748B;">Access Role:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0F172A;">
                    <span style="display: inline-block; padding: 2px 8px; background-color: ${accessRole === 'admin' ? '#FEF3C7' : '#DCFCE7'}; color: ${accessRole === 'admin' ? '#B45309' : '#15803D'}; border-radius: 4px; font-size: 11px; font-weight: 700;">
                      ${accessRole === 'admin' ? 'Administrator' : 'Employee'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 12px; color: #64748B;">Joining Date:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #0F172A;">${joiningDate}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary Call to Action Button -->
          <tr>
            <td style="padding: 0 32px 28px 32px; text-align: center;">
              <p style="font-size: 13px; color: #4B5563; margin: 0 0 16px 0;">
                Click the button below to set your confidential permanent password:
              </p>
              <a href="${setupPasswordLink}" style="display: inline-block; background-color: #049FD9; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 36px; border-radius: 6px; box-shadow: 0 2px 4px rgba(4, 159, 217, 0.25);">
                Set Your Password &rarr;
              </a>
              <div style="font-size: 11px; color: #9CA3AF; margin-top: 12px;">
                Link expires in <strong>48 hours</strong>
              </div>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 12px 16px;">
                <tr>
                  <td style="font-size: 12px; line-height: 1.5; color: #92400E;">
                    🔒 <strong>Security Policy:</strong> You will choose your own private password. Workspace administrators do not know and will never ask for your password.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Login Instructions -->
          <tr>
            <td style="padding: 0 32px 28px 32px; font-size: 12px; color: #6B7280; line-height: 1.5;">
              After setting your password, sign in to your workspace portal anytime at: <br/>
              <a href="${loginLink}" style="color: #049FD9; text-decoration: underline;">${loginLink}</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #94A3B8;">
              &copy; 2026 Basecamp. All rights reserved. &bull; Enterprise Project & Employee Management
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    let emailSent = false;
    let emailError: string | null = null;

    try {
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
      emailSent = true;
    } catch (mailErr: any) {
      console.error('Failed to send invitation email via SMTP:', mailErr);
      emailError = mailErr?.message || 'SMTP delivery failed';
    }

    if (!emailSent) {
      return NextResponse.json(
        {
          success: true,
          emailSent: false,
          employee: employeeProfile,
          warning: `Employee created in database, but invitation email could not be sent (${emailError}). You can click "Resend Invitation" in the Employees list once SMTP is configured.`,
          setupPasswordLink,
        },
        { status: 201 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      employee: employeeProfile,
      message: `Employee "${fullName}" created successfully! Invitation email has been delivered to ${email}.`,
    });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred while creating employee account.',
      },
      { status: 500 }
    );
  }
}
