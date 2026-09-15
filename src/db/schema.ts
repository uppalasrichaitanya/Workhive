import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: text("source").notNull(),
    sourceJobId: text("source_job_id"),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location").notNull().default("India"),
    description: text("description").notNull().default(""),
    employmentType: text("employment_type"),
    remote: boolean("remote").notNull().default(false),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    contentHash: text("content_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    rawPayload: jsonb("raw_payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceJobUnique: uniqueIndex("jobs_source_source_job_id_idx").on(table.source, table.sourceJobId),
    canonicalUrlIdx: uniqueIndex("jobs_canonical_url_idx").on(table.canonicalUrl),
    companyIdx: index("jobs_company_idx").on(table.company),
    locationIdx: index("jobs_location_idx").on(table.location),
    postedAtIdx: index("jobs_posted_at_idx").on(table.postedAt),
    lastSeenAtIdx: index("jobs_last_seen_at_idx").on(table.lastSeenAt),
    activeIdx: index("jobs_is_active_idx").on(table.isActive),
  }),
);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  datasetId: text("dataset_id"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  itemCount: integer("item_count").notNull().default(0),
  insertedCount: integer("inserted_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  errorMessage: text("error_message"),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
