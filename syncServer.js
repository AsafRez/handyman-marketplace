// HandyHub Cross-Emulator Real-Time SSE & State Sync Server
import http from 'http';
import 'dotenv/config';


const PORT = process.env.PORT || 3001;
const clients = new Set();

// Shared Database State in memory across all emulators
let sharedJobs = [];

const ROLES = [
  { role_id: 'electrician', role_name: 'Electrician' },
  { role_id: 'plumber', role_name: 'Plumber' },
  { role_id: 'locksmith', role_name: 'Locksmith' },
  { role_id: 'hvac', role_name: 'HVAC & AC Repair' },
  { role_id: 'carpenter', role_name: 'Carpenter' },
  { role_id: 'painter', role_name: 'Painter' }
];

const rateLimits = new Map(); // ip -> { count, startTime }
const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const RATE_LIMIT_MAX_REQUESTS = 100; // max 100 requests per 10 seconds

function checkRateLimit(ip) {
  const now = Date.now();
  const limit = rateLimits.get(ip);
  if (!limit) {
    rateLimits.set(ip, { count: 1, startTime: now });
    return true;
  }
  if (now - limit.startTime > RATE_LIMIT_WINDOW_MS) {
    limit.count = 1;
    limit.startTime = now;
    return true;
  }
  limit.count++;
  return limit.count <= RATE_LIMIT_MAX_REQUESTS;
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rate Limiting
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too many requests. Please slow down.' }));
    return;
  }

  // 1. GET /api/jobs - State Sync Polling
  if (req.method === 'GET' && req.url === '/api/jobs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sharedJobs));
    return;
  }

  // GET /api/roles - Return available handyman roles
  if (req.method === 'GET' && req.url === '/api/roles') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ROLES));
    return;
  }

  // 2. GET /api/events - SSE Stream Endpoint
  if (req.method === 'GET' && req.url === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    clients.add(res);
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clients: clients.size })}\n\n`);

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  // 3. POST /api/broadcast - Broadcast Event & State Mutation
  if (req.method === 'POST' && req.url === '/api/broadcast') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);

        // Update in-memory state based on event
        if (event.type === 'NEW_JOB_BROADCAST' && event.payload) {
          const newJob = event.payload;
          if (!sharedJobs.some(j => j.job_id === newJob.job_id)) {
            sharedJobs.unshift(newJob);
          }
        } else if (event.type === 'JOB_CLAIMED' && event.payload) {
          const { jobId, providerId, acceptedAt } = event.payload;
          sharedJobs = sharedJobs.map(j =>
            j.job_id === jobId ? { ...j, status: 'claimed', provider_id: providerId, accepted_at: acceptedAt } : j
          );
        } else if (event.type === 'PROVIDER_CANCELLED_JOB' && event.payload) {
          const { jobId, reason } = event.payload;
          sharedJobs = sharedJobs.map(j =>
            j.job_id === jobId ? { ...j, status: 'open', provider_id: null, cancel_reason: reason || null, cancelled_by: 'provider' } : j
          );
        } else if (event.type === 'CUSTOMER_CANCELLED_JOB' && event.payload) {
          const { jobId, reason } = event.payload;
          sharedJobs = sharedJobs.map(j =>
            j.job_id === jobId ? { ...j, status: 'cancelled', cancel_reason: reason || 'Cancelled by customer', cancelled_by: 'customer' } : j
          );
        } else if (event.type === 'CUSTOMER_REMOVED_PROVIDER' && event.payload) {
          const { jobId } = event.payload;
          sharedJobs = sharedJobs.map(j =>
            j.job_id === jobId ? { ...j, status: 'open', provider_id: null, cancel_reason: 'Customer requested provider replacement', cancelled_by: 'customer' } : j
          );
        } else if (event.type === 'JOB_COMPLETED' && event.payload) {
          const { jobId, completedAt } = event.payload;
          sharedJobs = sharedJobs.map(j =>
            j.job_id === jobId ? { ...j, status: 'completed', completed_at: completedAt } : j
          );
        } else if (event.type === 'JOB_REVIEWED' && event.payload) {
          const { jobId, reviewData } = event.payload;
          sharedJobs = sharedJobs.map(j =>
            j.job_id === jobId ? { ...j, status: 'reviewed', review: reviewData } : j
          );
        } else if (event.type === 'RESET_DEMO') {
          sharedJobs = [];
        }

        // Broadcast event to all SSE stream subscribers
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        clients.forEach(client => client.write(payload));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, totalJobs: sharedJobs.length }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 4. POST /api/notify-admin - Send email notification when a new provider registers
  if (req.method === 'POST' && req.url === '/api/notify-admin') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { adminEmail, provider } = payload;

        if (!adminEmail || !provider) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing adminEmail or provider details' }));
          return;
        }

        const emailSubject = `🛠️ New Provider Registration Pending: ${provider.name}`;
        const emailText = `Hello Admin,\n\nA new provider has registered on HandyHub and is waiting for your approval:\n\n` +
          `- Name: ${provider.name}\n` +
          `- Email: ${provider.email || 'N/A'}\n` +
          `- Phone: ${provider.phone || 'N/A'}\n` +
          `- Trade: ${provider.trade}\n\n` +
          `You can review and approve this provider directly from the HandyHub web dashboard.\n\n` +
          `Regards,\nHandyHub Dispatch System`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
            <h2 style="color: #ea580c; margin-top: 0;">🛠️ Provider Pending Verification</h2>
            <p>Hello Admin,</p>
            <p>A new provider has registered on <strong>HandyHub</strong> and is waiting for your approval:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${provider.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${provider.email}">${provider.email || 'N/A'}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Phone:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${provider.phone || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Trade:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-transform: capitalize;">${provider.trade}</td>
              </tr>
            </table>
            <p>Please log in to the HandyHub web dashboard to review and approve this application.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">This is an automated notification from your local HandyHub Dev Environment.</p>
          </div>
        `;

        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT || '587';
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpSecure = process.env.SMTP_SECURE === 'true';

        const hasSmtpConfig = smtpHost && smtpUser && smtpPass;

        if (hasSmtpConfig) {
          console.log(`📨 SMTP Config detected in environment variables. Attempting to send real email to: ${adminEmail}...`);
          try {
            const nodemailerModule = await import('nodemailer');
            const createTransport = nodemailerModule.createTransport || nodemailerModule.default.createTransport;
            const transporter = createTransport({
              host: smtpHost,
              port: parseInt(smtpPort, 10),
              secure: smtpSecure,
              auth: {
                user: smtpUser,
                pass: smtpPass
              }
            });

            const info = await transporter.sendMail({
              from: `"HandyHub Dispatch" <${smtpUser}>`,
              to: adminEmail,
              subject: emailSubject,
              text: emailText,
              html: emailHtml
            });

            console.log(`✅ Email sent successfully to ${adminEmail}! Message ID: ${info.messageId}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, messageId: info.messageId }));
            return;
          } catch (nodemailerErr) {
            console.error('❌ Nodemailer failed to send email:', nodemailerErr.message);
          }
        }

        // Mock Terminal Print Fallback
        console.log('\n========================================================================');
        console.log('📢 ADMIN EMAIL NOTIFICATION (MOCK SEND - NO SMTP CONFIGURED OR FAILED)');
        console.log(`To:      ${adminEmail}`);
        console.log(`Subject: ${emailSubject}`);
        console.log('------------------------------------------------------------------------');
        console.log(emailText);
        console.log('========================================================================\n');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, mock: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 5. POST /api/send-otp - Send registration OTP verification email to user
  if (req.method === 'POST' && req.url === '/api/send-otp') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { email, otp } = payload;

        if (!email || !otp) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing email or otp' }));
          return;
        }

        const emailSubject = `🔑 HandyHub Verification Code: ${otp}`;
        const emailText = `Hello,\n\nYour HandyHub verification code is: ${otp}\n\nPlease enter this code in the application to complete your registration.\n\nRegards,\nHandyHub Team`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
            <h2 style="color: #ea580c; margin-top: 0;">🔑 Verify Your Email</h2>
            <p>Hello,</p>
            <p>Thank you for registering on <strong>HandyHub</strong>. Use the verification code below to complete your registration:</p>
            <div style="font-size: 24px; font-weight: bold; color: #ea580c; padding: 12px; background-color: #ffedd5; border-radius: 6px; text-align: center; margin: 20px 0; letter-spacing: 0.1em;">
              ${otp}
            </div>
            <p>This code will expire shortly. If you did not request this, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">This is an automated notification from HandyHub.</p>
          </div>
        `;

        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT || '587';
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpSecure = process.env.SMTP_SECURE === 'true';

        const hasSmtpConfig = smtpHost && smtpUser && smtpPass;

        if (hasSmtpConfig) {
          console.log(`📨 Attempting to send real OTP email to: ${email}...`);
          try {
            const nodemailerModule = await import('nodemailer');
            const createTransport = nodemailerModule.createTransport || nodemailerModule.default.createTransport;
            const transporter = createTransport({
              host: smtpHost,
              port: parseInt(smtpPort, 10),
              secure: smtpSecure,
              auth: {
                user: smtpUser,
                pass: smtpPass
              }
            });

            const info = await transporter.sendMail({
              from: `"HandyHub" <${smtpUser}>`,
              to: email,
              subject: emailSubject,
              text: emailText,
              html: emailHtml
            });

            console.log(`✅ OTP email sent successfully to ${email}! Message ID: ${info.messageId}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, messageId: info.messageId }));
            return;
          } catch (nodemailerErr) {
            console.error('❌ Nodemailer failed to send OTP email:', nodemailerErr.message);
          }
        }

        // Mock Fallback
        console.log('\n========================================================================');
        console.log('📢 USER OTP EMAIL NOTIFICATION (MOCK SEND - NO SMTP CONFIGURED OR FAILED)');
        console.log(`To:      ${email}`);
        console.log(`Subject: ${emailSubject}`);
        console.log('------------------------------------------------------------------------');
        console.log(emailText);
        console.log('========================================================================\n');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, mock: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HandyHub Cross-Emulator SSE & State Sync Server running on port ${PORT}`);
});
