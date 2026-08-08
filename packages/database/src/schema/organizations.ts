import { pgTable, text, timestamp, bigserial } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
    
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  name: text('name').notNull(),

  slug: text('slug').notNull().unique(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),

});