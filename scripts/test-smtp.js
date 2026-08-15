#!/usr/bin/env node

/**
 * S3Forge SMTP Test & Diagnostics Script
 * Usage: node scripts/test-smtp.js [recipient-email]
 */

import fs from 'fs';
import path from 'path';
import tls from 'tls';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load .env file
function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../apps/api/.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
      console.log(`[+] Loaded environment variables from: ${envPath}`);
      return;
    }
  }
  console.log('[!] Warning: No .env file found. Reading system environment variables.');
}

loadEnv();

let mailConstants = { DEFAULT_HOST: 'smtp.gmail.com', DEFAULT_PORT: 587, DEFAULT_SECURE: false };
try {
  const jsonPath = path.resolve(process.cwd(), 'constants.json');
  if (fs.existsSync(jsonPath)) {
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (parsed.MAIL) {
      mailConstants = { ...mailConstants, ...parsed.MAIL };
    }
  }
} catch {}

const host = process.env.SMTP_HOST || mailConstants.DEFAULT_HOST;
const port = parseInt(process.env.SMTP_PORT || String(mailConstants.DEFAULT_PORT), 10);
const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : (mailConstants.DEFAULT_SECURE || port === 465);
const rawUser = process.env.SMTP_USER || '';
const rawPass = process.env.SMTP_PASS || '';
const from = process.env.SMTP_FROM || rawUser || 'S3Forge Support <no-reply@s3forge.local>';

// Clean up username and password (remove whitespace in App Password if user pasted with spaces)
const user = rawUser.trim();
const pass = rawPass.replace(/\s+/g, '');

const recipientArg = process.argv[2];
const recipient = recipientArg || user;

console.log('\n=========================================================');
console.log('       ⚡ S3Forge SMTP Test & Diagnostics (Google)       ');
console.log('=========================================================\n');

console.log(`📡 SMTP Server  : ${host}`);
console.log(`🔌 Port         : ${port} (${secure ? 'SSL/TLS' : 'STARTTLS'})`);
console.log(`👤 Username     : ${user || '(NOT SET)'}`);
console.log(`🔑 App Password : ${pass ? '•••••••••••••••• (' + pass.length + ' chars)' : '(NOT SET)'}`);
console.log(`📩 Sender From  : ${from}`);
console.log(`🎯 Recipient    : ${recipient || '(NOT SET)'}\n`);

if (!user || user === 'your_gmail_address@gmail.com') {
  console.error('❌ ERROR: SMTP_USER is not configured in .env file!');
  console.error('👉 Please update SMTP_USER in your .env file with your Gmail address.\n');
  process.exit(1);
}

if (!pass || pass === 'your_google_app_password') {
  console.error('❌ ERROR: SMTP_PASS is not configured in .env file!');
  console.error('👉 Please update SMTP_PASS in your .env file with your 16-character Google App Password.');
  console.error('   Generate one at: https://myaccount.google.com/apppasswords\n');
  process.exit(1);
}

if (!recipient) {
  console.error('❌ ERROR: No recipient specified and SMTP_USER is empty!');
  console.error('👉 Usage: node scripts/test-smtp.js recipient@example.com\n');
  process.exit(1);
}

const templateType = (process.argv[3] || 'reset').toLowerCase();

console.log(`📋 Template Mode: ${templateType.toUpperCase()}\n`);

// Try using Nodemailer first if installed
async function runWithNodemailer() {
  try {
    let nodemailerModule;
    try {
      nodemailerModule = await import('nodemailer');
    } catch {
      const apiNodemailerPath = path.resolve(__dirname, '../apps/api/node_modules/nodemailer/lib/nodemailer.js');
      if (fs.existsSync(apiNodemailerPath)) {
        nodemailerModule = await import(apiNodemailerPath);
      } else {
        throw new Error('Nodemailer not found');
      }
    }

    const nodemailer = nodemailerModule.default || nodemailerModule;
    console.log('[+] Using Nodemailer package...');

    const createTransport = nodemailer.createTransport || nodemailer.default?.createTransport;
    if (typeof createTransport !== 'function') {
      throw new Error('Nodemailer createTransport is not a function');
    }

    const transporter = createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: true,
      },
    });

    console.log('⏳ 1. Verifying SMTP Connection & Credentials...');
    await transporter.verify();
    console.log('✅ SMTP Connection & Authentication Successful!\n');

    // Import templates from API source
    let templates;
    try {
      templates = await import('../apps/api/src/templates/email/index.js');
    } catch (err) {
      console.log('[!] Warning: Could not import TS templates directly, using fallback renderer.');
    }

    const resetToken = 'test-token-' + Math.random().toString(36).substring(2, 10);
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

    let emailOptionsList = [];

    if (templateType === 'reset' || templateType === 'all') {
      const resetEmail = templates?.renderPasswordResetEmail
        ? templates.renderPasswordResetEmail({ name: 'Test User', resetUrl, expiresInMinutes: 60 })
        : {
            subject: '🔐 [Test] Reset Your S3Forge Password',
            html: `<div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #fff;"><h2>Password Reset Test</h2><a href="${resetUrl}">Reset Password</a></div>`,
            text: `Reset Password Link: ${resetUrl}`,
          };

      emailOptionsList.push({ name: 'Password Reset', options: resetEmail });
    }

    if (templateType === 'welcome' || templateType === 'all') {
      const welcomeEmail = templates?.renderWelcomeEmail
        ? templates.renderWelcomeEmail({ name: 'Test User', email: recipient, dashboardUrl: 'http://localhost:5173' })
        : {
            subject: '🚀 [Test] Welcome to S3Forge!',
            html: `<div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #fff;"><h2>Welcome to S3Forge</h2></div>`,
            text: `Welcome to S3Forge!`,
          };

      emailOptionsList.push({ name: 'Welcome Email', options: welcomeEmail });
    }

    for (const item of emailOptionsList) {
      console.log(`⏳ Sending ${item.name} template to: ${recipient}...`);
      const info = await transporter.sendMail({
        from,
        to: recipient,
        subject: item.options.subject,
        html: item.options.html,
        text: item.options.text,
      });

      console.log(`🎉 ${item.name} SENT SUCCESSFULLY!`);
      console.log(`✉️ Message ID : ${info.messageId}`);
      console.log(`📫 Response   : ${info.response}\n`);
    }

    console.log('✨ All requested email templates verified end-to-end!\n');
    return true;
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message?.includes('Cannot find package')) {
      return false; // Fall back to native TLS
    }
    handleError(err);
    process.exit(1);
  }
}

// Fallback native TLS / Net SMTP implementation (Zero external dependencies)
function runWithNativeTLS() {
  console.log('[+] Nodemailer package not found yet. Running zero-dependency Native TLS SMTP test...');
  console.log(`⏳ Connecting directly to ${host}:${port}...`);

  const authUserB64 = Buffer.from(user).toString('base64');
  const authPassB64 = Buffer.from(pass).toString('base64');

  const socket = secure
    ? tls.connect(port, host, { rejectUnauthorized: true })
    : net.connect(port, host);

  let step = 0;

  socket.on('connect', () => {
    if (!secure) {
      console.log('Connected via TCP, waiting for banner...');
    } else {
      console.log('Connected via SSL/TLS!');
    }
  });

  socket.on('data', (data) => {
    const msg = data.toString();
    // console.log(`<<< ${msg.trim()}`);

    if (msg.startsWith('220') && step === 0) {
      step = 1;
      send(`EHLO ${host}`);
    } else if (msg.startsWith('250') && step === 1) {
      if (!secure && msg.includes('STARTTLS')) {
        step = 2;
        send('STARTTLS');
      } else {
        step = 3;
        send('AUTH LOGIN');
      }
    } else if (msg.startsWith('220') && step === 2) {
      // Upgrade socket to TLS
      const tlsSocket = tls.connect({
        socket,
        rejectUnauthorized: true,
        servername: host,
      });

      tlsSocket.on('data', (tData) => {
        const tMsg = tData.toString();
        // console.log(`<<< [TLS] ${tMsg.trim()}`);
        if (tMsg.startsWith('334')) {
          if (step === 3) {
            step = 4;
            sendTls(tlsSocket, authUserB64);
          } else if (step === 4) {
            step = 5;
            sendTls(tlsSocket, authPassB64);
          }
        } else if (tMsg.startsWith('235') && step === 5) {
          console.log('✅ Authentication Successful!');
          step = 6;
          sendTls(tlsSocket, `MAIL FROM:<${user}>`);
        } else if (tMsg.startsWith('250') && step === 6) {
          step = 7;
          sendTls(tlsSocket, `RCPT TO:<${recipient}>`);
        } else if (tMsg.startsWith('250') && step === 7) {
          step = 8;
          sendTls(tlsSocket, 'DATA');
        } else if (tMsg.startsWith('354') && step === 8) {
          step = 9;
          const emailBody = [
            `From: ${from}`,
            `To: ${recipient}`,
            `Subject: 🔐 [Test] S3Forge Forgot Password SMTP Verification`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            `<div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 25px; border-radius: 8px;">`,
            `  <h2 style="color: #38bdf8;">⚡ S3Forge SMTP Test</h2>`,
            `  <p style="color: #94a3b8;">Google SMTP Service verified successfully via Native TLS!</p>`,
            `</div>`,
            `.`
          ].join('\r\n');
          sendTls(tlsSocket, emailBody);
        } else if (tMsg.startsWith('250') && step === 9) {
          console.log('🎉 EMAIL SENT SUCCESSFULLY!');
          sendTls(tlsSocket, 'QUIT');
          process.exit(0);
        } else if (tMsg.startsWith('535')) {
          console.error('\n❌ AUTHENTICATION FAILED (535 Invalid Credentials)');
          printGoogleHelp();
          process.exit(1);
        }
      });

      step = 3;
      sendTls(tlsSocket, 'AUTH LOGIN');
    }
  });

  socket.on('error', (err) => {
    handleError(err);
  });

  function send(str) {
    socket.write(str + '\r\n');
  }

  function sendTls(tSocket, str) {
    tSocket.write(str + '\r\n');
  }
}

function handleError(err) {
  console.error('\n❌ SMTP TEST ERROR:', err.message || err);

  if (err.message?.includes('535') || err.responseCode === 535) {
    printGoogleHelp();
  } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
    console.error('👉 Connection timed out. Check firewall or try port 465 (SSL) / 587 (TLS).');
  }
}

function printGoogleHelp() {
  console.error('\n💡 GOOGLE SMTP TROUBLESHOOTING TIPS:');
  console.error('1. Make sure 2-Step Verification is ENABLED on your Google Account.');
  console.error('2. Generate an App Password (do not use your main Google account password).');
  console.error('   URL: https://myaccount.google.com/apppasswords');
  console.error('3. App Password should be 16 characters (spaces are automatically removed).');
  console.error('4. Make sure your Gmail username is the full email address (e.g. user@gmail.com).\n');
}

async function main() {
  const success = await runWithNodemailer();
  if (!success) {
    runWithNativeTLS();
  }
}

main();
