export interface BaseTemplateOptions {
  title: string;
  bodyHtml: string;
}

export function renderBaseTemplate(options: BaseTemplateOptions): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 560px; margin: 40px auto; background-color: #1e293b; border-radius: 12px; padding: 36px; border: 1px solid #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; margin-bottom: 24px; }
    .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 16px; }
    .text { font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff !important; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.4); }
    .code-box { background: #0f172a; border: 1px solid #334155; padding: 14px; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #38bdf8; word-break: break-all; margin-top: 12px; }
    .badge { background: #0f172a; border: 1px solid #334155; padding: 6px 12px; border-radius: 6px; font-size: 13px; color: #38bdf8; display: inline-block; }
    .footer { font-size: 12px; color: #64748b; margin-top: 36px; border-top: 1px solid #334155; padding-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">⚡ S3Forge</div>
    ${options.bodyHtml}
    <div class="footer">
      &copy; ${currentYear} S3Forge Storage Platform. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}
