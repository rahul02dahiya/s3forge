import { pgTable, bigint, text, timestamp, jsonb, bigserial } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { users } from './users.js';

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  organizationId: bigint('organization_id', { mode: 'number' })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  userId: bigint('user_id', { mode: 'number' }).references(() => users.id, {
    onDelete: 'set null',
  }),

  action: text('action').notNull(),

  resourceType: text('resource_type').notNull(),

  resourceId: text('resource_id'),

  ipAddress: text('ip_address'),

  userAgent: text('user_agent'),

  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
