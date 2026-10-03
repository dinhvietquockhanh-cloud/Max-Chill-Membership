import { date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const membersTable = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    phoneNormalized: text("phone_normalized").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    birthday: date("birthday", { mode: "string" }),
    notes: text("notes"),
  },
  (table) => [uniqueIndex("members_phone_normalized_unique").on(table.phoneNormalized)],
);

export const visitsTable = pgTable(
  "member_visits",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }).notNull(),
    partySize: integer("party_size").notNull(),
    billAmount: integer("bill_amount").notNull(),
    note: text("note"),
  },
  (table) => [index("member_visits_member_arrived_idx").on(table.memberId, table.arrivedAt)],
);