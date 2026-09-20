import { describe, expect, it } from "vitest";
import { duplicateKeys, incomingJobSchema, isExplicitlyNonIndiaLocation, normalizeJob } from "./normalize";
import { filterJobs, isFresh } from "./filters";
import { demoJobs } from "./demo-data";

describe("job normalization", () => {
  it("maps common Apify aliases and removes tracking params", () => {
    const job = normalizeJob({ jobId: "42", url: "https://example.com/role?utm_source=x", title: "Engineer", companyName: "Acme", location: ["Bengaluru", "India"], isRemote: "yes", salary: "₹12,00,000 - ₹18,00,000" });
    expect(job.sourceJobId).toBe("42"); expect(job.canonicalUrl).toBe("https://example.com/role"); expect(job.company).toBe("Acme"); expect(job.remote).toBe(true); expect(job.salaryMin).toBe(1200000);
  });
  it("normalizes Lever aliases and structured locations", () => {
    const job = normalizeJob({
      id: "lever-1",
      url: "https://jobs.lever.co/acme/lever-1",
      title: "Platform Engineer",
      organization: "Acme",
      locations_raw: [{ address: { addressLocality: "Bengaluru", addressRegion: "Karnataka", addressCountry: "India" } }],
      description_text: "Build platform systems.",
      employment_type: ["Full Time Employee"],
      remote_derived: true,
      ai_salary_minvalue: 1800000,
      ai_salary_maxvalue: 2600000,
      date_posted: "2026-09-16T00:00:00Z",
    }, "lever");
    expect(job.location).toBe("Bengaluru, Karnataka, India");
    expect(job.employmentType).toBe("Full Time Employee");
    expect(job.remote).toBe(true);
    expect(job.salaryMin).toBe(1800000);
    expect(job.salaryMax).toBe(2600000);
  });
  it("normalizes the compact Ashby multi-ATS shape", () => {
    const job = normalizeJob({
      id: "ashby:acme:1",
      ats: "ashby",
      company: "Acme",
      title: "Backend Engineer",
      location: "India",
      remote: true,
      url: "https://jobs.ashbyhq.com/acme/1",
      description: "Ship APIs.",
      employmentType: "FullTime",
      postedAt: "2026-09-15T00:00:00Z",
    }, "ashby");
    expect(job.sourceJobId).toBe("ashby:acme:1");
    expect(job.remote).toBe(true);
    expect(job.employmentType).toBe("FullTime");
  });
  it("produces stable duplicate keys", () => {
    const job = normalizeJob({ id: "1", url: "https://example.com/a", title: "Engineer", company: "Acme" }, "Greenhouse");
    expect(duplicateKeys(job)).toContain("Greenhouse:1"); expect(duplicateKeys(job)).toContain(job.contentHash);
  });
  it("rejects records without a valid title", () => { expect(() => incomingJobSchema.parse({ url: "https://example.com/a" })).toThrow(); });
  it("flags explicit non-India locations", () => {
    expect(isExplicitlyNonIndiaLocation("Indianapolis, Indiana, United States")).toBe(true);
    expect(isExplicitlyNonIndiaLocation("Indianapolis, IN")).toBe(true);
    expect(isExplicitlyNonIndiaLocation("Chicago, Illinois; Indiana")).toBe(true);
    expect(isExplicitlyNonIndiaLocation("Bengaluru, Karnataka, India")).toBe(false);
    expect(isExplicitlyNonIndiaLocation("Remote")).toBe(false);
  });
});
describe("job filtering and freshness", () => {
  it("filters by search, location, and remote status", () => { expect(filterJobs(demoJobs, { q: "backend", location: "India", remote: "true" })).toHaveLength(1); expect(filterJobs(demoJobs, { company: "Kite Health" })).toHaveLength(1); });
  it("expires jobs past the freshness window", () => { expect(isFresh({ isActive: true, lastSeenAt: new Date().toISOString() }, 7)).toBe(true); expect(isFresh({ isActive: true, lastSeenAt: new Date(Date.now() - 8 * 86400000).toISOString() }, 7)).toBe(false); expect(isFresh({ isActive: false, lastSeenAt: new Date().toISOString() }, 7)).toBe(false); });
});
