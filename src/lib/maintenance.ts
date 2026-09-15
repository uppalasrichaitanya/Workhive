import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";

export async function expireStaleJobs(days = Number(process.env.FRESHNESS_DAYS ?? 7)) {
  const db = getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const result = await db.update(jobs).set({ isActive: false, updatedAt: new Date() }).where(and(eq(jobs.isActive, true), lt(jobs.lastSeenAt, cutoff)));
  return result.count ?? 0;
}
