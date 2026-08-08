import { pgTable, text, integer, jsonb, timestamp, bigserial } from 'drizzle-orm/pg-core';

export const serviceHealth = pgTable('service_health', {
    
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  serviceName: text('service_name').notNull(),

  status: text('status').notNull(),

  responseTimeMs: integer('response_time_ms'),

  details: jsonb('details'),

  checkedAt: timestamp('checked_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});