import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";
import { demoJobs } from "@/lib/demo-data";
import { filterJobs, isFresh } from "@/lib/filters";
import type { JobRecord } from "@/lib/types";

function serializeJob(job: JobRecord | typeof jobs.$inferSelect): JobRecord {
  return {
    ...job,
    postedAt: job.postedAt instanceof Date ? job.postedAt.toISOString() : job.postedAt,
    firstSeenAt: job.firstSeenAt instanceof Date ? job.firstSeenAt.toISOString() : job.firstSeenAt,
    lastSeenAt: job.lastSeenAt instanceof Date ? job.lastSeenAt.toISOString() : job.lastSeenAt,
    createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
    updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt,
  } as JobRecord;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize") ?? 10) || 10));
  const filters = {
    q: params.get("q") ?? undefined,
    location: params.get("location") ?? undefined,
    remote: params.get("remote") ?? undefined,
    company: params.get("company") ?? undefined,
    employmentType: params.get("employmentType") ?? undefined,
  };

  try {
    const db = getDb();
    let all: JobRecord[];
    if (db) {
      const rows = await Promise.race([
        db.select().from(jobs).where(eq(jobs.isActive, true)).orderBy(desc(jobs.postedAt)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Database query timed out")), 4000)),
      ]);
      all = rows.map(serializeJob).filter((job) => isFresh(job));
      if (all.length === 0) all = demoJobs.filter((job) => isFresh(job));
    } else {
      all = demoJobs.filter((job) => isFresh(job));
    }
    const filtered = filterJobs(all, filters);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return NextResponse.json({ jobs: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch {
    // Keep the local experience usable before a database migration or during a transient provider outage.
    const filtered = filterJobs(demoJobs.filter((job) => isFresh(job)), filters);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return NextResponse.json({ jobs: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), demoFallback: true });
  }
}
