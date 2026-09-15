import { NextResponse } from "next/server";
import { getDb } from "@/db";

export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ status: "ok", database: "not-configured", mode: "demo" });
  try {
    await db.execute("select 1");
    return NextResponse.json({ status: "ok", database: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "error" }, { status: 503 });
  }
}
