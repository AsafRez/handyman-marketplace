// HandyHub Lightweight Sync Server
// Enables cross-device job synchronization between emulators
const http = require('http');
require('dotenv').config();


const PORT = process.env.PORT || 3001;
let jobs = [];
let sseClients = [];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Rate Limiting
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(ip)) {
    res.writeHead(429, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too many requests. Please slow down.' }));
    return;
  }

  // GET /HandyHub.apk or /apk — serve the built APK file
  if (req.method === 'GET' && (req.url === '/HandyHub.apk' || req.url === '/apk')) {
    const fs = require('fs');
    const path = require('path');
    const apkPath = path.join(__dirname, 'HandyHub.apk');
    if (fs.existsSync(apkPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="HandyHub.apk"',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(apkPath).pipe(res);
    } else {
      res.writeHead(404, { ...corsHeaders, 'Content-Type': 'text/plain' });
      res.end('APK not found on server');
    }
    return;
  }

  // GET /api/jobs — return all jobs
  if (req.method === 'GET' && req.url === '/api/jobs') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(jobs));
    return;
  }

  // POST /api/jobs — add or update a job
  if (req.method === 'POST' && req.url === '/api/jobs') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const jobData = JSON.parse(body);
        const existingIdx = jobs.findIndex(j => j.job_id === jobData.job_id);
        if (existingIdx >= 0) {
          jobs[existingIdx] = { ...jobs[existingIdx], ...jobData };
        } else {
          jobs.unshift(jobData);
        }
        // Notify all SSE clients
        broadcastSSE('JOB_UPDATE', jobData);
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // POST /api/broadcast — broadcast an event to all SSE clients
  if (req.method === 'POST' && req.url === '/api/broadcast') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        broadcastSSE(event.type, event.payload);

        // Also update local jobs store based on event type
        if (event.type === 'NEW_JOB_BROADCAST' && event.payload) {
          const jobData = event.payload;
          if (!jobs.some(j => j.job_id === jobData.job_id)) {
            jobs.unshift(jobData);
          }
        } else if (event.type === 'JOB_CLAIMED' && event.payload) {
          const { jobId, providerId, acceptedAt } = event.payload;
          jobs = jobs.map(j => j.job_id === jobId ? { ...j, status: 'claimed', provider_id: providerId, accepted_at: acceptedAt } : j);
        } else if (event.type === 'CUSTOMER_CANCELLED_JOB' && event.payload) {
          const { jobId } = event.payload;
          jobs = jobs.map(j => j.job_id === jobId ? { ...j, status: 'cancelled' } : j);
        } else if (event.type === 'JOB_COMPLETED' && event.payload) {
          const { jobId, completedAt } = event.payload;
          jobs = jobs.map(j => j.job_id === jobId ? { ...j, status: 'completed', completed_at: completedAt } : j);
        } else if (event.type === 'JOB_REVIEWED' && event.payload) {
          const { jobId, reviewData } = event.payload;
          jobs = jobs.map(j => j.job_id === jobId ? { ...j, status: 'reviewed', review: reviewData } : j);
        } else if (event.type === 'CUSTOMER_REMOVED_PROVIDER' && event.payload) {
          const { jobId } = event.payload;
          jobs = jobs.map(j => j.job_id === jobId ? { ...j, status: 'open', provider_id: null } : j);
        } else if (event.type === 'PROVIDER_CANCELLED_JOB' && event.payload) {
          const { jobId } = event.payload;
          jobs = jobs.map(j => j.job_id === jobId ? { ...j, status: 'open', provider_id: null } : j);
        } else if (event.type === 'RESET_DEMO') {
          jobs = [];
        }

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, clients: sseClients.length }));
      } catch (e) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // POST /api/notify-admin — send email notification when a new provider registers
  if (req.method === 'POST' && req.url === '/api/notify-admin') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { adminEmail, provider } = payload;

        if (!adminEmail || !provider) {
          res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
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
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
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
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
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

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, mock: true }));
      } catch (err) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // GET /api/events — SSE stream for real-time updates
  if (req.method === 'GET' && req.url === '/api/events') {
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('data: {"type":"CONNECTED"}\n\n');

    sseClients.push(res);
    console.log(`📡 SSE client connected (total: ${sseClients.length})`);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
      console.log(`📡 SSE client disconnected (total: ${sseClients.length})`);
    });
    return;
  }

  // DELETE /api/jobs — reset all jobs
  if (req.method === 'DELETE' && req.url === '/api/jobs') {
    jobs = [];
    broadcastSSE('RESET_DEMO', {});
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // POST /api/send-otp — Send registration OTP verification email to user
  if (req.method === 'POST' && req.url === '/api/send-otp') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { email, otp } = payload;

        if (!email || !otp) {
          res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
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
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
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
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
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

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, mock: true }));
      } catch (err) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, corsHeaders);
  res.end(JSON.stringify({ error: 'Not found' }));
});

function broadcastSSE(eventType, data) {
  const payload = JSON.stringify({ type: eventType, payload: data, timestamp: new Date().toISOString() });
  sseClients.forEach(client => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (e) { }
  });
}

server.listen(process.env.PORT || PORT, '0.0.0.0', () => {
  console.log(`\n🚀 HandyHub Sync Server running on port ${process.env.PORT || PORT}`);
  console.log(`   📱 Emulators connect via http://10.0.2.2:${process.env.PORT || PORT}`);
  console.log(`   🌐 Web connects via http://localhost:${process.env.PORT || PORT}`);
  console.log(`   📡 SSE stream: /api/events`);
  console.log(`   📋 Jobs API: /api/jobs`);
  console.log(`   📢 Broadcast: /api/broadcast\n`);
});
