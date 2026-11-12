import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const targetEmail = process.argv[2] || process.env.SMTP_USER;
console.log(`Attempting to send a real test email to: ${targetEmail}...`);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const info = await transporter.sendMail({
  from: `"HandyHub Dispatch" <${process.env.SMTP_USER}>`,
  to: targetEmail,
  subject: "🛠️ HandyHub Test Email",
  text: "Hello! If you are seeing this email, your HandyHub SMTP setup is working perfectly!",
  html: "<h3>🛠️ HandyHub Test Email</h3><p>Hello! If you are seeing this email, your HandyHub SMTP email dispatcher is working perfectly!</p>"
});

console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
