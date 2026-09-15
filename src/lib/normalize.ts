import { createHash } from "node:crypto";
import { z } from "zod";

const stringish = z.union([z.string(), z.number()]).transform(String);
export const incomingJobSchema = z.object({
  id: stringish.optional(),
  sourceJobId: stringish.optional(),
  jobId: stringish.optional(),
  url: z.string().url().optional(),
  applyUrl: z.string().url().optional(),
  canonicalUrl: z.string().url().optional(),
  title: z.string().min(2),
  company: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  location: z.union([z.string(), z.array(z.string())]).optional(),
  description: z.string().optional(),
  jobDescription: z.string().optional(),
  employmentType: z.string().optional(),
  jobType: z.string().optional(),
  remote: z.union([z.boolean(), z.string()]).optional(),
  isRemote: z.union([z.boolean(), z.string()]).optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salary: z.string().optional(),
  salaryCurrency: z.string().optional(),
  postedAt: z.union([z.string(), z.date()]).optional(),
  datePosted: z.union([z.string(), z.date()]).optional(),
}).passthrough();

export type IncomingJob = z.infer<typeof incomingJobSchema>;

function truthy(value: unknown) {
  return value === true || ["true", "yes", "remote", "fully remote"].includes(String(value).toLowerCase());
}

function cleanUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  ["utm_source", "utm_medium", "utm_campaign", "ref"].forEach((key) => url.searchParams.delete(key));
  return url.toString().replace(/\/$/, "");
}

function parseSalary(value: string | undefined) {
  if (!value) return { min: undefined, max: undefined, currency: undefined };
  const numbers = [...value.replace(/,/g, "").matchAll(/[0-9]+(?:\.[0-9]+)?/g)].map((match) => Number(match[0]));
  return { min: numbers[0], max: numbers[1] ?? numbers[0], currency: /\$|usd/i.test(value) ? "USD" : "INR" };
}

export function normalizeJob(payload: unknown, source = "apify") {
  const item = incomingJobSchema.parse(payload);
  const canonicalUrl = item.canonicalUrl ?? item.applyUrl ?? item.url;
  if (!canonicalUrl) throw new Error("Job is missing a canonical URL");
  const location = Array.isArray(item.location) ? item.location.join(", ") : item.location ?? "India";
  const salary = parseSalary(item.salary);
  const title = item.title.trim();
  const company = (item.company ?? item.companyName ?? "Unknown company").trim();
  const description = (item.description ?? item.jobDescription ?? "").trim();
  const contentHash = createHash("sha256").update(`${title}|${company}|${location}|${description}`).digest("hex");
  const posted = item.postedAt ?? item.datePosted;
  return {
    source,
    sourceJobId: item.sourceJobId ?? item.jobId ?? item.id ?? null,
    canonicalUrl: cleanUrl(canonicalUrl),
    title,
    company,
    location,
    description,
    employmentType: item.employmentType ?? item.jobType ?? null,
    remote: truthy(item.remote ?? item.isRemote) || /remote/i.test(location),
    salaryMin: item.salaryMin ?? salary.min ?? null,
    salaryMax: item.salaryMax ?? salary.max ?? null,
    salaryCurrency: item.salaryCurrency ?? salary.currency ?? null,
    postedAt: posted ? new Date(posted) : null,
    contentHash,
    rawPayload: payload,
  };
}

export function duplicateKeys(job: { source: string; sourceJobId?: string | null; canonicalUrl: string; contentHash: string }) {
  return [job.sourceJobId ? `${job.source}:${job.sourceJobId}` : null, job.canonicalUrl, job.contentHash].filter(Boolean) as string[];
}
