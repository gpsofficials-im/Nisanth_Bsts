import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import dns from 'dns';
import { promisify } from 'util';

const lookupPromise = promisify(dns.lookup);

// Read config dynamically to ensure updates in Admin Panel are immediately applied
const getConfig = () => {
  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (error) {
    console.error('[Mailer] Error reading config for SMTP:', error);
  }
  return {};
};

// DNS resolution bypass helper using standard OS resolver (getaddrinfo)
const resolveSmtpHost = async (host) => {
  try {
    const { address } = await lookupPromise(host);
    console.log(`[Mailer DNS] Successfully resolved ${host} to IP address ${address} using OS resolver.`);
    return address;
  } catch (err) {
    console.warn(`[Mailer DNS] OS lookup failed for ${host}:`, err.message);
    return host; // Fallback to host string
  }
};

// Top-level nodemailer transporter disabled (SMTP removed by user request)
const transporter = null;

/**
 * Send a simulated email (SMTP integration has been removed)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML formatted message
 */
export async function sendEmail(to, subject, htmlContent) {
  try {
    console.log(`[Mailer - SMTP Removed] Simulated email sent to: ${to}`);
    console.log(`Subject: ${subject}`);
    return { simulated: true, success: true, messageId: 'simulated-msg-id-' + Date.now() };
  } catch (error) {
    console.error('[Mailer] Failed to log simulated email:', error);
    throw error;
  }
}


// --- HTML EMAIL TEMPLATES ---

export const getLoginAlertTemplate = (userName, time, ip, browserInfo) => `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; color: #f1f5f9;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #6366f1; margin: 0; font-size: 28px; letter-spacing: -0.5px; text-shadow: 0 0 10px rgba(99, 102, 241, 0.4);">Nisanth Wallet</h1>
    <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">Security Alert</p>
  </div>
  <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);">
    <h3 style="color: #f1f5f9; margin-top: 0; font-size: 18px;">New Login Detected</h3>
    <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">Your Nisanth Wallet account was just logged into from a new session.</p>
    
    <div style="background-color: #0f172a; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
        <tr>
          <td style="padding: 6px 0; font-weight: bold; width: 100px;">Time (IST):</td>
          <td style="padding: 6px 0;">${time}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold;">IP Address:</td>
          <td style="padding: 6px 0; color: #818cf8;">${ip}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold;">Client:</td>
          <td style="padding: 6px 0;">${browserInfo || 'Web Browser'}</td>
        </tr>
      </table>
    </div>

    <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
      If this was you, you can safely ignore this email. If this wasn't you, please reset your password inside the Admin Panel immediately.
    </p>
  </div>
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #64748b;">
    &copy; ${new Date().getFullYear()} Nisanth Wallet. Private secure vault.
  </div>
</div>
`;

export const getOTPTemplate = (userName, otpCode, expirationMin = 5) => `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #090d16; padding: 40px 20px; text-align: center; color: #f1f5f9;">
  <div style="background-color: #0f172a; padding: 40px; border-radius: 16px; max-width: 500px; margin: 0 auto; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.3); border: 1px solid #1e293b;">
    <div style="display: inline-block; background-color: #1e293b; padding: 12px; border-radius: 50%; margin-bottom: 20px;">
      <span style="font-size: 32px;">🔐</span>
    </div>
    <h1 style="color: #818cf8; margin: 0 0 10px 0; font-size: 24px; font-weight: 700; text-shadow: 0 0 8px rgba(129, 140, 248, 0.4);">Secure OTP Code</h1>
    <p style="color: #94a3b8; font-size: 15px; margin-bottom: 30px;">Hello <strong>${userName}</strong>, use the verification code below to authorize your Nisanth Wallet login request.</p>
    
    <div style="background-color: #1e293b; letter-spacing: 6px; font-size: 36px; font-weight: 800; color: #38bdf8; padding: 18px; border-radius: 12px; display: inline-block; margin-bottom: 30px; font-family: monospace; border: 1px dashed #38bdf8; text-shadow: 0 0 10px rgba(56, 189, 248, 0.5);">
      ${otpCode}
    </div>
    
    <p style="color: #64748b; font-size: 13px; margin: 0;">This code is private and expires in <strong>${expirationMin} minutes</strong>.</p>
    <p style="color: #64748b; font-size: 13px; margin-top: 5px;">Do not share this code with anyone.</p>
  </div>
</div>
`;

export const getUploadSuccessTemplate = (userName, fileList) => `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #022c22; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #064e3b; color: #f1f5f9;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #34d399; margin: 0; font-size: 28px; text-shadow: 0 0 10px rgba(52, 211, 153, 0.4);">Memories Added!</h1>
    <p style="color: #a7f3d0; font-size: 14px; margin-top: 5px;">Nisanth Wallet</p>
  </div>
  <div style="background-color: #064e3b; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);">
    <h3 style="color: #f1f5f9; margin-top: 0;">New Upload Success</h3>
    <p style="color: #e6f4ea; font-size: 15px;">Hey Bestie, <strong>${userName}</strong> just added new memories to our shared vault!</p>
    
    <p style="color: #34d399; font-weight: bold; margin-bottom: 10px; font-size: 14px;">Uploaded Items:</p>
    <ul style="background-color: #022c22; padding: 15px 15px 15px 30px; border-radius: 6px; color: #e6f4ea; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6; border: 1px solid #065f46;">
      ${fileList.map(file => `<li><strong>${file.name}</strong> (${file.category}) - ${file.type}</li>`).join('')}
    </ul>
    
    <p style="color: #a7f3d0; font-size: 13px; margin-bottom: 0;">
      These memories are securely stored and synced to both Local Storage and MEGA Cloud Storage. Head over to the Nisanth Wallet dashboard to view them!
    </p>
  </div>
</div>
`;

export const getReminderTemplate = (eventTitle, daysLeft, countdownStr) => `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #4c0519; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #881337; text-align: center; color: #f1f5f9;">
  <span style="font-size: 48px;">💖</span>
  <h1 style="color: #f43f5e; margin: 10px 0; font-size: 28px; text-shadow: 0 0 10px rgba(244, 63, 94, 0.4);">Special Event</h1>
  <p style="color: #fda4af; font-size: 15px; margin-top: 5px;">Nisanth Wallet Reminder</p>
  
  <div style="background-color: #881337; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4); text-align: left; margin-top: 20px;">
    <h3 style="color: #f1f5f9; margin-top: 0; text-align: center; font-size: 20px;">${eventTitle} is coming up!</h3>
    <div style="background-color: #f43f5e; color: #ffffff; font-size: 22px; font-weight: bold; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; box-shadow: 0 0 10px rgba(244, 63, 94, 0.5);">
      Only ${daysLeft} Days Remaining!
    </div>
    <p style="color: #fda4af; font-size: 15px; text-align: center; line-height: 1.6;">
      Exact Time Remaining: <br/>
      <strong style="color: #ffffff; font-size: 16px;">${countdownStr}</strong>
    </p>
    <p style="color: #fda4af; font-size: 13px; text-align: center; margin-top: 25px; margin-bottom: 0; border-top: 1px solid #9f1239; padding-top: 15px;">
      Let's make this day unforgettable! Write a new timeline story page, or view past memories together.
    </p>
  </div>
</div>
`;

export const getProfileUpdateTemplate = (userName, editorName) => `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #3b0764; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #581c87; color: #f1f5f9;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #c084fc; margin: 0; font-size: 28px; text-shadow: 0 0 10px rgba(192, 132, 252, 0.4);">Profile Updated</h1>
    <p style="color: #e9d5ff; font-size: 14px; margin-top: 5px;">Nisanth Wallet</p>
  </div>
  <div style="background-color: #581c87; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);">
    <h3 style="color: #f1f5f9; margin-top: 0;">User Profile Modified</h3>
    <p style="color: #e9d5ff; font-size: 15px; line-height: 1.6;">
      Hello, the profile details for <strong>${userName}</strong> have been edited and updated by <strong>${editorName}</strong>.
    </p>
    <p style="color: #e9d5ff; font-size: 15px; line-height: 1.6;">
      You can review the updated bio, avatar, and relationship stories directly on your profile sidebar cards on the dashboard.
    </p>
    <div style="text-align: center; margin-top: 25px;">
      <span style="font-size: 32px;">✨ 😉 ✨</span>
    </div>
  </div>
</div>
`;
