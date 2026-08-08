import { pgTable, bigint, text, timestamp, boolean, bigserial } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';

export const s3Credentials = pgTable('s3_credentials', {

  id: bigserial('id', { mode: 'number' }).primaryKey(),

  organizationId: bigint('organization_id', { mode: 'number' })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  accessKey: text('access_key').notNull().unique(),

  secretKeyHash: text('secret_key_hash').notNull(),

  description: text('description'),

  isActive: boolean('is_active').default(true).notNull(),

  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
    
});