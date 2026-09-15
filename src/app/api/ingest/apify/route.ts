import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ingestionRuns, jobs } from "@/db/schema";
import { normalizeJob, duplicateKeys } from "@/lib/normalize";

function authorized(request: NextRequest) {
  const expected = process.env.APIFY_WEBHOOK_SECRET;
  if (!expected) return false;
  const provided = request.headers.get("x-apify-webhook-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.nextUrl.searchParams.get("secret");
  return provided === expected;
}

async function datasetItems(datasetId: string) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is required when fetching a dataset");
  const response = await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(token)}&clean=true`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Apify dataset request failed (${response.status})`);
  return (await response.json()) as unknown[];
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized ingestion request" }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const datasetId = String(payload.datasetId ?? (payload.resource as Record<string, unknown> | undefined)?.defaultDatasetId ?? request.nextUrl.searchParams.get("datasetId") ?? "");
  const source = String(payload.source ?? "apify");
  try {
    const items = Array.isArray(payload.items) ? payload.items : datasetId ? await datasetItems(datasetId) : [];
    if (!items.length) return NextResponse.json({ error: "No dataset items supplied" }, { status: 400 });
    const existing = await db.select().from(jobs);
    let insertedCount = 0;
    let updatedCount = 0;
    let rejectedCount = 0;
    for (const raw of items) {
      try {
        const normalized = normalizeJob(raw, source);
        const keys = duplicateKeys(normalized);
        const match = existing.find((item) => keys.includes(item.canonicalUrl) || keys.includes(item.contentHash) || (item.sourceJobId && keys.includes(`${item.source}:${item.sourceJobId}`)));
        const now = new Date();
        if (match) {
          await db.update(jobs).set({ lastSeenAt: now, updatedAt: now, isActive: true, rawPayload: normalized.rawPayload }).where(eq(jobs.id, match.id));
          updatedCount++;
        } else {
          await db.insert(jobs).values({ ...normalized, firstSeenAt: now, lastSeenAt: now, updatedAt: now, createdAt: now });
          insertedCount++;
        }
      } catch {
        rejectedCount++;
      }
    }
    await db.insert(ingestionRuns).values({ source, datasetId: datasetId || null, itemCount: items.length, insertedCount, updatedCount, rejectedCount });
    return NextResponse.json({ ok: true, source, datasetId: datasetId || null, itemCount: items.length, insertedCount, updatedCount, rejectedCount });
  } catch (error) {
    await db.insert(ingestionRuns).values({ source, datasetId: datasetId || null, itemCount: 0, errorMessage: error instanceof Error ? error.message : "Unknown error" }).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ingestion failed" }, { status: 500 });
  }
}
