import { pgTable, bigint, integer, timestamp, bigserial } from 'drizzle-orm/pg-core';
import { buckets } from './buckets.js';

export const usageSnapshots = pgTable('usage_snapshots', {
    
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  bucketId: bigint('bucket_id', { mode: 'number' })
    .notNull()
    .references(() => buckets.id, { onDelete: 'cascade' }),

  objectCount: integer('object_count').default(0).notNull(),

  totalBytes: bigint('total_bytes', { mode: 'number' })
    .default(0)
    .notNull(),

  calculatedAt: timestamp('calculated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),

});