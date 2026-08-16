import { renderBaseTemplate } from './base.template.js';

export interface PasswordResetData {
  name: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function renderPasswordResetEmail(data: PasswordResetData) {
  const name = data.name || 'User';
  const expiresText = data.expiresInMinutes ? `${data.expiresInMinutes} minutes` : '1 hour';

  const subject = '🔐 Reset Your S3Forge Password';

  const bodyHtml = `
    <div class="title">Password Reset Request</div>
    <p class="text">Hi ${name},</p>
    <p class="text">We received a request to reset the password for your S3Forge account. Click the button below to set up a new password. This link is valid for ${expiresText}.</p>
    <div class="btn-container">
      <a href="${data.resetUrl}" class="btn" target="_blank">Reset Password</a>
    </div>
    <p class="text">Or copy and paste this URL into your web browser:</p>
    <div class="code-box">${data.resetUrl}</div>
    <p class="text" style="margin-top: 24px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  `;

  const html = renderBaseTemplate({ title: subject, bodyHtml });

  const text = `Hi ${name},\n\nWe received a request to reset your S3Forge password.\n\nPlease reset your password using the link below:\n${data.resetUrl}\n\nThis link expires in ${expiresText}.\n\nIf you did not request this, please ignore this email.`;

  return { subject, html, text };
}
