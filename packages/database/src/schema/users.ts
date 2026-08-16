import { pgTable, text, timestamp, boolean, bigserial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  
  id: bigserial("id", { mode: "number" }).primaryKey(),

  email: text("email").notNull().unique(),

  passwordHash: text("password_hash").notNull(),

  displayName: text("display_name").notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  resetTokenHash: text("reset_token_hash"),

  resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

});
