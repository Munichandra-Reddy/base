import tls from 'tls';

export interface SmtpOptions {
  host?: string;
  port?: number;
  user: string;
  pass: string;
  from?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Native Node.js TLS SMTP Client (Zero npm dependencies)
 * Connects directly to secure SMTP ports (e.g. smtp.gmail.com:465) over TLS
 */
export function sendSmtpEmail(options: SmtpOptions): Promise<{ success: boolean; messageId?: string }> {
  return new Promise((resolve, reject) => {
    const {
      host = 'smtp.gmail.com',
      port = 465,
      user,
      pass,
      to,
      subject,
      html,
    } = options;

    if (!user || !pass) {
      return reject(new Error('Missing SMTP_USER or SMTP_PASS'));
    }

    const cleanUser = user.trim().toLowerCase();
    const cleanTo = to.trim().toLowerCase();

    // Clean password (remove spaces if user copied "abcd efgh ijkl mnop")
    const cleanPass = pass.replace(/\s+/g, '');

    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
      },
      () => {
        // Connected securely
      }
    );

    socket.setEncoding('utf8');

    let step = 0;
    let buffer = '';

    const send = (cmd: string) => {
      socket.write(cmd + '\r\n');
    };

    socket.on('data', (data: string) => {
      buffer += data;

      const lines = buffer.split('\r\n').filter(Boolean);
      const lastLine = lines[lines.length - 1] || '';

      // Check if server is still sending a multiline response (e.g. "250-...")
      if (/^\d{3}-/.test(lastLine)) {
        return;
      }

      const code = parseInt(lastLine.substring(0, 3), 10);
      if (isNaN(code)) return;

      buffer = ''; // reset buffer for next command

      // If server returned error code (4xx or 5xx)
      if (code >= 400) {
        socket.end();
        return reject(new Error(`SMTP Error [${code}]: ${lastLine}`));
      }

      // State machine for standard SMTP dialogue
      switch (step) {
        case 0: // 220 Initial server greeting
          if (code === 220) {
            step = 1;
            send('EHLO workorbit.app');
          }
          break;

        case 1: // 250 response to EHLO
          if (code === 250) {
            step = 2;
            send('AUTH LOGIN');
          }
          break;

        case 2: // 334 response to AUTH LOGIN (Username prompt)
          if (code === 334) {
            step = 3;
            send(Buffer.from(cleanUser).toString('base64'));
          }
          break;

        case 3: // 334 response to Username (Password prompt)
          if (code === 334) {
            step = 4;
            send(Buffer.from(cleanPass).toString('base64'));
          }
          break;

        case 4: // 235 Authentication successful
          if (code === 235) {
            step = 5;
            send(`MAIL FROM:<${cleanUser}>`);
          }
          break;

        case 5: // 250 Sender OK
          if (code === 250) {
            step = 6;
            send(`RCPT TO:<${cleanTo}>`);
          }
          break;

        case 6: // 250 Recipient OK
          if (code === 250) {
            step = 7;
            send('DATA');
          }
          break;

        case 7: // 354 Start mail input
          if (code === 354) {
            step = 8;
            const senderDomain = cleanUser.includes('@') ? cleanUser.split('@')[1] : 'gmail.com';
            const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${senderDomain}>`;
            const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            const plainText = options.text || 'WorkOrbit Password Reset: Please view this email in an HTML-compatible client.';

            const emailContent = [
              `From: "WorkOrbit" <${cleanUser}>`,
              `To: <${cleanTo}>`,
              `Reply-To: <${cleanUser}>`,
              `Subject: ${subject}`,
              `Message-ID: ${messageId}`,
              `Date: ${new Date().toUTCString()}`,
              'MIME-Version: 1.0',
              `Content-Type: multipart/alternative; boundary="${boundary}"`,
              'X-Mailer: WorkOrbit-Mailer/1.0',
              'Auto-Submitted: auto-generated',
              '',
              `--${boundary}`,
              'Content-Type: text/plain; charset=UTF-8',
              'Content-Transfer-Encoding: 7bit',
              '',
              plainText,
              '',
              `--${boundary}`,
              'Content-Type: text/html; charset=UTF-8',
              'Content-Transfer-Encoding: 7bit',
              '',
              html,
              '',
              `--${boundary}--`,
              '.',
            ].join('\r\n');

            send(emailContent);
          }
          break;

        case 8: // 250 Message queued/sent
          if (code === 250) {
            step = 9;
            send('QUIT');
            socket.end();
            resolve({ success: true, messageId: lastLine });
          }
          break;

        default:
          socket.end();
          break;
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(15000, () => {
      socket.destroy();
      reject(new Error('SMTP connection timed out after 15 seconds'));
    });
  });
}
