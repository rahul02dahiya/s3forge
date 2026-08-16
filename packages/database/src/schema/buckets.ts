import { pgTable, bigint, text, timestamp, boolean, bigserial } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { users } from './users.js';

export const buckets = pgTable('buckets', {
    
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  organizationId: bigint('organization_id', { mode: 'number' })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  createdBy: bigint('created_by', { mode: 'number' })
    .references(() => users.id, { onDelete: 'set null' }),

  name: text('name').notNull(),

  minioBucketName: text('minio_bucket_name').notNull().unique(),

  region: text('region').default('us-east-1').notNull(),

  visibility: text('visibility').default('private').notNull(),

  quotaBytes: bigint('quota_bytes', { mode: 'number' }).default(0).notNull(),

  isDeleted: boolean('is_deleted').default(false).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),

});