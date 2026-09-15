import { describe, expect, it } from "vitest";
import { duplicateKeys, incomingJobSchema, normalizeJob } from "./normalize";
import { filterJobs, isFresh } from "./filters";
import { demoJobs } from "./demo-data";

describe("job normalization", () => {
  it("maps common Apify aliases and removes tracking params", () => {
    const job = normalizeJob({ jobId: "42", url: "https://example.com/role?utm_source=x", title: "Engineer", companyName: "Acme", location: ["Bengaluru", "India"], isRemote: "yes", salary: "₹12,00,000 - ₹18,00,000" });
    expect(job.sourceJobId).toBe("42"); expect(job.canonicalUrl).toBe("https://example.com/role"); expect(job.company).toBe("Acme"); expect(job.remote).toBe(true); expect(job.salaryMin).toBe(1200000);
  });
  it("produces stable duplicate keys", () => {
    const job = normalizeJob({ id: "1", url: "https://example.com/a", title: "Engineer", company: "Acme" }, "Greenhouse");
    expect(duplicateKeys(job)).toContain("Greenhouse:1"); expect(duplicateKeys(job)).toContain(job.contentHash);
  });
  it("rejects records without a valid title", () => { expect(() => incomingJobSchema.parse({ url: "https://example.com/a" })).toThrow(); });
});
describe("job filtering and freshness", () => {
  it("filters by search, location, and remote status", () => { expect(filterJobs(demoJobs, { q: "backend", location: "India", remote: "true" })).toHaveLength(1); expect(filterJobs(demoJobs, { company: "Kite Health" })).toHaveLength(1); });
  it("expires jobs past the freshness window", () => { expect(isFresh({ isActive: true, lastSeenAt: new Date().toISOString() }, 7)).toBe(true); expect(isFresh({ isActive: true, lastSeenAt: new Date(Date.now() - 8 * 86400000).toISOString() }, 7)).toBe(false); expect(isFresh({ isActive: false, lastSeenAt: new Date().toISOString() }, 7)).toBe(false); });
});
