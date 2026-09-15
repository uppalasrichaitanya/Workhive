import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";
import { demoJobs } from "@/lib/demo-data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getDb();
    const job = db ? (await db.select().from(jobs).where(eq(jobs.id, id)).limit(1))[0] : demoJobs.find((item) => item.id === id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job: { ...job, postedAt: job.postedAt instanceof Date ? job.postedAt.toISOString() : job.postedAt, firstSeenAt: job.firstSeenAt instanceof Date ? job.firstSeenAt.toISOString() : job.firstSeenAt, lastSeenAt: job.lastSeenAt instanceof Date ? job.lastSeenAt.toISOString() : job.lastSeenAt } });
  } catch {
    return NextResponse.json({ error: "Unable to load job" }, { status: 500 });
  }
}
