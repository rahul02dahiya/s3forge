export * from './base.template.js';
export * from './password-reset.template.js';
export * from './welcome.template.js';

export interface EmailRenderResult {
  subject: string;
  html: string;
  text: string;
}

/**
 * Replace {{variableName}} placeholders in string templates with variables map.
 */
export function compileTemplate(templateString: string, variables: Record<string, string | number>): string {
  return templateString.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return key in variables ? String(variables[key]) : `{{${key}}}`;
  });
}
