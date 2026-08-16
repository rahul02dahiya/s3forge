import { renderBaseTemplate } from './base.template.js';

export interface WelcomeEmailData {
  name: string;
  dashboardUrl: string;
  email: string;
}

export function renderWelcomeEmail(data: WelcomeEmailData) {
  const name = data.name || 'User';
  const subject = '🚀 Welcome to S3Forge!';

  const bodyHtml = `
    <div class="title">Welcome aboard, ${name}!</div>
    <p class="text">Thank you for joining S3Forge. Your account (<strong>${data.email}</strong>) has been successfully created.</p>
    <p class="text">S3Forge provides high-performance, S3-compatible cloud object storage with complete administrative control.</p>
    <div class="btn-container">
      <a href="${data.dashboardUrl}" class="btn" target="_blank">Access Dashboard</a>
    </div>
    <p class="text">If you have any questions, reply to this email or contact your administrator.</p>
  `;

  const html = renderBaseTemplate({ title: subject, bodyHtml });

  const text = `Welcome aboard, ${name}!\n\nThank you for joining S3Forge. Your account (${data.email}) is ready.\n\nAccess your console: ${data.dashboardUrl}`;

  return { subject, html, text };
}
