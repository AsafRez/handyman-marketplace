import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing SMTP credentials:');
console.log('Host:', process.env.SMTP_HOST);
console.log('Port:', process.env.SMTP_PORT);
console.log('User:', process.env.SMTP_USER);
console.log('Pass:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'MISSING');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Verification Error:', error.message);
  } else {
    console.log('✅ Server is ready to send emails:', success);
  }
  process.exit(0);
});
